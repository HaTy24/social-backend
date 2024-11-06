import { AdminFilterPostDTO } from '@business/admin/post-manager/post.dto';
import { AdminCreatePostDTO } from '@business/post/post.dto';
import { POST_TYPE, PostDocument } from '@business/post/post.model';
import { PostService } from '@business/post/post.service';
import { extractPublicInfo } from '@business/user/user.entity';
import { UserService } from '@business/user/user.service';
import { HttpResponse } from '@core/dto/response';
import { LogId } from '@core/logging/logging';
import { Body, Controller, Delete, Get, Inject, Logger, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createId } from '@paralleldrive/cuid2';
import { INJECTION_TOKEN } from '@shared/constants';
import * as queryHelper from '@shared/helpers/query-helper';
import { extractTagsFromText } from '@shared/helpers/tags-helper';
import { cleanHTML } from '@shared/helpers/text-cleaning-helper';
import { AuditService } from 'mvc-common-toolkit';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

@ApiTags('admin/post')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
@Controller('admin/posts')
export class AdminPostController {
  protected logger = new Logger(AdminPostController.name);

  constructor(
    protected userService: UserService,
    protected postService: PostService,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {}

  @Get()
  public async getPosts(
    @LogId() logId: string,
    @Query() dto: AdminFilterPostDTO,
  ): Promise<HttpResponse> {
    const parseSort = queryHelper.parseSortMongo(dto.sort);

    const postResult = await this.postService.paginate(dto, {
      sort: parseSort,
    });

    const mappedPosts = await Promise.all(
      postResult.rows.map(async (post: PostDocument) => {
        const { likesCount, viewerInteractions, commentCount, retweetCount } =
          await this.postService.getPostInteractions({
            slug: post.slug,
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
            id: postOwner.id,
            fullname: postOwner.fullname,
            imageUrl: postOwner.profile_image_url,
            username: postOwner.twitterScreenName,
          },
        };
      }),
    );
    return {
      success: true,
      data: {
        total: postResult.total,
        rows: mappedPosts,
      },
    };
  }

  @Get(':slug')
  public async getPostDetail(
    @LogId() logId: string,
    @Param('slug') slug: string,
  ): Promise<HttpResponse> {
    const post = await this.postService.getOne({ slug });

    const { likesCount, viewerInteractions, commentCount, retweetCount } =
      await this.postService.getPostInteractions({
        slug,
      });

    const postOwner = await this.userService.getOneByKey(post.ownerId);

    return {
      success: true,
      data: {
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
          imageUrl: postOwner.profile_image_url,
          username: postOwner.twitterScreenName,
        },
      },
    };
  }

  @Delete(':slug')
  public async deletePost(
    @LogId() logId: string,
    @Param('slug') slug: string,
  ): Promise<HttpResponse> {
    await this.postService.forceDeleteBySlug(slug);

    return {
      success: true,
    };
  }

  @Post('/system-account')
  public async createNewSystemAccountPost(
    @LogId() logId: string,
    @Body() dto: AdminCreatePostDTO,
  ): Promise<HttpResponse> {
    const cleanedText = cleanHTML(dto.text);
    const tags = extractTagsFromText(cleanedText);
    const createdPost = await this.postService.create({
      type: POST_TYPE.TWEET,
      ownerId: dto.userId,
      media: dto.media,
      text: cleanedText,
      slug: createId(),
      tags,
    });

    return { success: true, data: createdPost };
  }
}
