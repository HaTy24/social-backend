import { createId } from '@paralleldrive/cuid2';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { HttpResponse } from 'mvc-common-toolkit';

import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';

import { RequestUser } from '@core/decorators/request-user';
import { UsePaginationQuery } from '@core/dto/pagination.dto';
import { ResponseCode } from '@core/dto/response';
import { LogId } from '@core/logging/logging';

import { TagUserEvent } from '@business/event/event.model';
import { ImageService } from '@business/image/image.service';
import { MessageQueueService } from '@business/message-queue/message-queue.service';
import { NOTIFICATION_TYPE } from '@business/notifications/notification.model';
import { NotificationService } from '@business/notifications/notification.service';
import { CreatePostDTO, GetRecentPostsDTO } from '@business/post/post.dto';
import {
  POST_POLICY,
  POST_TYPE,
  PostDocument,
  Post as PostModel,
} from '@business/post/post.model';
import { PostService } from '@business/post/post.service';
import { PostView } from '@business/post/post.type';
import { User, extractPublicInfo } from '@business/user/user.entity';
import { UserService } from '@business/user/user.service';

import {
  APP_EVENT,
  ERR_CODE,
  IMG_TASK_GOAL,
  IMG_TASK_TYPE,
  SOURCE_TYPE,
} from '@shared/constants';
import {
  extractTagUserFromText,
  extractTagsFromText,
} from '@shared/helpers/tags-helper';
import { cleanHTML } from '@shared/helpers/text-cleaning-helper';

import { AuthGuard } from '../auth/auth.guard';

class PolicyDto {
  @ApiProperty({
    example: POST_POLICY.PUBLIC,
    enum: POST_POLICY,
  })
  @IsEnum(POST_POLICY)
  @IsNotEmpty()
  policy: POST_POLICY;
}

@ApiTags('client/post')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('posts')
export class PostController {
  private logger = new Logger(PostController.name);

  constructor(
    private postService: PostService,
    private imageService: ImageService,
    private userService: UserService,
    protected messageQueueService: MessageQueueService,
    protected eventEmitter: EventEmitter2,
    protected notificationService: NotificationService,
  ) {}

  @UsePaginationQuery()
  @Get('recent')
  public async getRecentPosts(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Query() dto: GetRecentPostsDTO,
  ): Promise<HttpResponse> {
    const viewerId = user.id;
    dto.addFilter({ type: POST_TYPE.TWEET });
    dto.addFilter({ policy: POST_POLICY.PUBLIC }); // only get public post in this api

    const paginateResult = await this.postService.paginate(dto, {
      sort: { createdAt: -1 },
    });

    const mappedPosts: PostView[] = await Promise.all(
      paginateResult.rows.map(async (post: PostDocument): Promise<PostView> => {
        const { likesCount, viewerInteractions, commentCount, retweetCount } =
          await this.postService.getPostInteractions({
            slug: post.slug,
            viewerId,
          });

        const postOwner = await this.userService.getOneByKey(post.ownerId);

        return {
          actions: viewerInteractions,
          createdAt: post.createdAt,
          type: post.type,
          commentCount,
          retweetCount,
          likesCount,
          media: post.media,
          slug: post.slug,
          text: post.text,
          user: {
            ...extractPublicInfo(postOwner),
            balance: '0',
            imageUrl: postOwner.profile_image_url,
            username: postOwner.twitterScreenName,
            share: {
              buyPrice: '0',
              sellPrice: '0',
            },
          },
        };
      }),
    );

    return {
      success: true,
      data: {
        total: paginateResult.total,
        rows: mappedPosts,
      },
    };
  }

  @Get(':slug')
  public async viewPostBySlug(
    @LogId() logId: string,
    @Param('slug') slug: string,
    @RequestUser() user: User,
  ): Promise<HttpResponse> {
    const viewerId = user.id;
    const data = await this.postService.viewPost(logId, { slug, viewerId });
    if (!data) {
      return {
        success: false,
        message: 'post not found',
        code: ResponseCode.NOT_FOUND,
      };
    }
    return { success: true, data };
  }

  @Post(':slug/retweet')
  public async retweet(
    @LogId() logId: string,
    @Param('slug') slug: string,
    @RequestUser() user: User,
  ): Promise<HttpResponse> {
    const originalPost: PostModel = await this.postService.getOne({ slug });
    if (originalPost.policy != POST_POLICY.PUBLIC) {
      return {
        success: false,
        message: 'Post not found or not public',
        code: ResponseCode.BAD_REQUEST,
      };
    }
    const retweet = await this.postService.createRetweet(user.id, slug);

    await this.notificationService.postNotification(
      user,
      originalPost,
      retweet,
      NOTIFICATION_TYPE.POST_SHARE,
    );
    return { success: true };
  }

  @Post()
  public async createNewPost(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Body() dto: CreatePostDTO,
  ): Promise<HttpResponse> {
    dto.policy ||= POST_POLICY.PUBLIC;
    const cleanedText = cleanHTML(dto.text);
    const tags = extractTagsFromText(cleanedText);

    if (dto.media && dto.media.length) {
      const checkNSFWResult = await Promise.all(
        dto.media.map(async (imageUrl: string) => {
          const result = await this.imageService.checkImageNSFW(
            logId,
            imageUrl,
          );

          const { success, data } = result;

          if (!success || !data.isSafe) {
            return false;
          }

          return true;
        }),
      );

      if (checkNSFWResult.includes(false)) {
        return {
          success: false,
          message: 'image is nsfw',
          code: ERR_CODE.IMG_IS_NSFW,
        };
      }
    }

    const createdPost = await this.postService.create({
      type: POST_TYPE.TWEET,
      ownerId: user.id,
      media:
        dto.media && dto.media.length
          ? dto.media.map((media) => ({ original: media }))
          : [],
      policy: dto.policy,
      text: cleanedText,
      slug: createId(),
      tags,
    });

    const tagUser = extractTagUserFromText(cleanedText);
    if (tagUser.length) {
      const userIds = await Promise.all(
        tagUser.map(async (userName: string) => {
          const foundUserByUserName =
            await this.userService.getByTwitterScreenName(userName);
          if (!foundUserByUserName) {
            return null;
          }

          return foundUserByUserName.id;
        }),
      );

      this.eventEmitter.emit(
        APP_EVENT.TAG_USER,
        TagUserEvent.from({
          logId,
          postOwnerId: user.id,
          postOwnerScreenName: user.twitterScreenName,
          postOwnerProfileImage: user.profile_image_url,
          postSlug: createdPost.slug,
          postText: cleanedText,
          taggedUserIds: userIds.filter((i) => i),
        }),
      );
    }

    if (dto.media && dto.media.length) {
      await Promise.all(
        dto.media.map(async (imageUrl: string, index: number) => {
          await this.messageQueueService.publishMessage(
            JSON.stringify({
              sourceType: SOURCE_TYPE.POST,
              imageIndex: index,
              postSlug: createdPost.slug,
              fileName: imageUrl.split('/')[3],
              fileURL: imageUrl,
              type: IMG_TASK_TYPE.USER_UPLOAD,
              goal: IMG_TASK_GOAL.RESIZE_AND_COMPRESS,
            }),
          );
        }),
      );
    }

    return { success: true, data: createdPost };
  }

  @Patch(':slug/policy')
  async updatePolicy(
    @LogId() logId: string,
    @Param('slug') slug: string,
    @RequestUser() user: User,
    @Body() dto: PolicyDto,
  ) {
    const post = await this.postService.getOne({ slug });
    if (!post) {
      return {
        success: false,
        message: 'post not found',
        code: ResponseCode.NOT_FOUND,
      };
    }
    if (post.deletedAt) return { success: true };
    if (post.ownerId !== user.id) {
      return {
        success: false,
        message: 'Unauthorized',
        code: ResponseCode.UNAUTHORIZED,
      };
    }

    await this.postService.updateById(post._id.toString(), {
      policy: dto.policy,
    });
    return { success: true };
  }

  @Delete(':slug')
  public async deletePost(
    @LogId() logId: string,
    @Param('slug') slug: string,
    @RequestUser() user: User,
  ): Promise<HttpResponse> {
    const foundPost = await this.postService.getOne({ slug });
    if (!foundPost) {
      return {
        success: false,
        message: 'post not found',
        code: ResponseCode.NOT_FOUND,
      };
    }
    if (foundPost.deletedAt) return { success: true };
    if (foundPost.ownerId !== user.id) {
      return {
        success: false,
        message: 'Unauthorized',
        code: ResponseCode.UNAUTHORIZED,
      };
    }

    await this.postService.forceDeleteBySlug(foundPost.slug);
    return { success: true };
  }
}
