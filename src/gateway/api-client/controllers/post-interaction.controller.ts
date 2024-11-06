import { BlockchainWrapperService } from '@business/blockchain/services/blockchain-wrapper.service';
import { TagUserEvent } from '@business/event/event.model';
import { ImageService } from '@business/image/image.service';
import { InteractionService } from '@business/interaction/interaction.service';
import { MessageQueueService } from '@business/message-queue/message-queue.service';
import { NOTIFICATION_TYPE } from '@business/notifications/notification.model';
import { NotificationService } from '@business/notifications/notification.service';
import { CreatePostDTO, PaginatePostCommentsDTO, PostInteractDTO, } from '@business/post/post.dto';
import { POST_POLICY, POST_TYPE, PostDocument, Post as PostModel } from '@business/post/post.model';
import { PostService } from '@business/post/post.service';
import { PostView } from '@business/post/post.type';
import { User, extractPublicInfo } from '@business/user/user.entity';
import { UserService } from '@business/user/user.service';
import { RequestUser } from '@core/decorators/request-user';
import { ResponseCode } from '@core/dto/response';
import { LogId } from '@core/logging/logging';
import { Body, Controller, Get, HttpStatus, Inject, Logger, Param, Post, Query, UseGuards, } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { APP_EVENT, ERR_CODE, IMG_TASK_GOAL, IMG_TASK_TYPE, INJECTION_TOKEN, SOURCE_TYPE } from '@shared/constants';
import { extractTagUserFromText } from '@shared/helpers/tags-helper';
import { cleanHTML } from '@shared/helpers/text-cleaning-helper';
import { AuditService, HttpResponse } from 'mvc-common-toolkit';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('client/post/interaction')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('posts/:slug')
export class PostInteractionController {
  protected logger = new Logger(this.constructor.name);

  constructor(
    protected postService: PostService,
    protected userService: UserService,
    private imageService: ImageService,
    protected interactionService: InteractionService,
    protected blockchainService: BlockchainWrapperService,
    protected messageQueueService: MessageQueueService,
    protected eventEmitter: EventEmitter2,
    protected notificationService: NotificationService,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {}

  @ApiParam({
    name: 'slug',
    example: 'c6s8gngdbobeatqi3j1xooyd'
  })
  @Get('comments')
  public async viewPostCommentsBySlug(
    @LogId() logId: string,
    @Param('slug') slug: string,
    @Query() dto: PaginatePostCommentsDTO,
    @RequestUser() user: User,
  ): Promise<HttpResponse> {
    const viewerId = user.id;
    const canView = await this.canView(logId, slug, viewerId);
    if (!canView) {
      return { success: false, message: 'post not found', code: ResponseCode.NOT_FOUND };
    }

    // Find posts that is of type REPLY, and replies to the requested slug
    dto.addFilter({ type: POST_TYPE.REPLY, 'replyMetadata.postSlug': slug, });

    const paginateResult = await this.postService.paginate(dto, { sort: { createdAt: -1, }, });

    // Map user interactions to the comments
    const mappedComments: PostView[] = await Promise.all(
      paginateResult.rows.map(
        async (comment: PostDocument): Promise<PostView> => {
          const postOwner = await this.userService.getOneByKey(
            comment.ownerId,
          );

          const {
            likesCount,
            viewerInteractions,
            commentCount,
            retweetCount,
          } = await this.postService.getPostInteractions({
              slug: comment.slug,
              viewerId,
            });

          const balanceResponse =
            await this.blockchainService.viewUserBalance(
            logId,
            postOwner.walletAddress,
          );

          const sharePriceResult = await this.blockchainService.viewSharesPrice(
            logId,
            postOwner.walletAddress,
          );
          const { buyPrice = '0', sellPrice = '0' } = sharePriceResult.data || {};
          const share = { buyPrice, sellPrice };

          const { ownerId } = comment.replyMetadata;
          const replyOwner = await this.userService.getById(ownerId);

          const canView = await this.canView(logId, comment.slug, viewerId);

          if (!canView) {
            return {
              actions: viewerInteractions,
              createdAt: comment.createdAt,
              type: comment.type,
              likesCount,
              media: null,
              commentCount,
              retweetCount,
              slug: comment.slug,
              text: null,
              metadata: {
                ...comment.replyMetadata,
                username: replyOwner.twitterScreenName,
              },
              user: {
                ...extractPublicInfo(postOwner),
                balance: balanceResponse.data,
                imageUrl: postOwner.profile_image_url,
                username: postOwner.twitterScreenName,
                share,
              },
              canView,
            };
          }

          return {
            actions: viewerInteractions,
            createdAt: comment.createdAt,
            type: comment.type,
            likesCount,
            media: comment.media,
            commentCount,
            retweetCount,
            slug: comment.slug,
            text: comment.text,
            metadata: {
              ...comment.replyMetadata,
              username: replyOwner.twitterScreenName,
            },
            user: {
              ...extractPublicInfo(postOwner),
              balance: balanceResponse.data,
              imageUrl: postOwner.profile_image_url,
              username: postOwner.twitterScreenName,
              share,
            },
            canView
          };
        },
      ),
    );

    return {
      success: true,
      data: {
        total: paginateResult.total,
        rows: mappedComments,
      },
    };
  }

  @ApiParam({
    name: 'slug',
    example: 'c6s8gngdbobeatqi3j1xooyd'
  })
  @Post('comment')
  public async writeComment(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Param('slug') slug: string,
    @Body() dto: CreatePostDTO,
  ): Promise<HttpResponse> {
    const canView = await this.canView(logId, slug, user.id);
    if (!canView) {
      return {
        success: false,
        message: 'post not found',
        code: ResponseCode.NOT_FOUND,
        httpCode: HttpStatus.NOT_FOUND,
      };
    }

    if (dto?.media?.length) {
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

    dto.text = cleanHTML(dto.text);
    const postComment = await this.postService.writeComment(user.id, slug, dto);

    const tagUser = extractTagUserFromText(dto.text);
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
          postSlug: postComment.slug,
          postText: dto.text,
          taggedUserIds: userIds.filter((i) => i),
        }),
      );
    }

    const originalPost: PostModel = await this.postService.getOne({ slug });
    const originalTypeToNotificationType = {
      [POST_TYPE.TWEET]: NOTIFICATION_TYPE.POST_COMMENT,
      [POST_TYPE.RETWEET]: NOTIFICATION_TYPE.POST_COMMENT,
      [POST_TYPE.REPLY]: NOTIFICATION_TYPE.POST_REPLY,
    }
    const type = originalTypeToNotificationType[originalPost.type];
    await this.notificationService.postNotification(user, originalPost, postComment, type);

    if (dto?.media?.length) {
      await Promise.all(
        dto.media.map(async (imageUrl: string, index: number) => {
          await this.messageQueueService.publishMessage(JSON.stringify({
              sourceType: SOURCE_TYPE.POST,
              imageIndex: index,
              postSlug: postComment.slug,
              fileName: imageUrl.split('/')[3],
              fileURL: imageUrl,
              type: IMG_TASK_TYPE.USER_UPLOAD,
              goal: IMG_TASK_GOAL.RESIZE_AND_COMPRESS,
            }))
        }),
      );
    }

    return { success: true };
  }

  @ApiParam({
    name: 'slug',
    example: 'c6s8gngdbobeatqi3j1xooyd'
  })
  @Post('interaction')
  public async interactWithPost(
    @LogId() logId: string,
    @Param('slug') slug: string,
    @Body() dto: PostInteractDTO,
    @RequestUser() user: User,
  ): Promise<HttpResponse> {
    const canView = await this.canView(logId, slug, user.id);
    if (!canView) {
      return {
        success: false,
        message: 'post not found',
        code: ResponseCode.NOT_FOUND,
      };
    }

    const countInteraction = await this.interactionService.count({
      postSlug: slug,
      actionUserId: user.id,
      action: dto.action,
    });

    if (countInteraction >= 1) {
      return { success: false, message: 'duplicated action', code: ResponseCode.CONFLICT, };
    }

    await this.postService.interactWithPost(user.id, slug, dto.action);

    // notification
    const originalPost: PostModel = await this.postService.getOne({ slug });
    await this.notificationService.postNotification(user, originalPost, null, NOTIFICATION_TYPE.POST_REACT);

    return { success: true, };
  }

  @Post('interaction/undo')
  public async undoInteractWithPost(
    @LogId() logId: string,
    @Param('slug') slug: string,
    @Body() dto: PostInteractDTO,
    @RequestUser() user: User,
  ): Promise<HttpResponse> {
    const canView = await this.canView(logId, slug, user.id);
    if (!canView) {
      return {
        success: false,
        message: 'post not found',
        code: ResponseCode.NOT_FOUND,
      };
    }

    await this.postService.undoInteractWithPost(user.id, slug, dto.action);

    return { success: true, };
  }


  async canView(logId: string, slug: string, viewerId: string) {
    const post: PostModel = await this.postService.getOne({ slug });
    if (!post) return false;
    if (post.policy === POST_POLICY.PUBLIC) return true;
    const viewer = await this.userService.getById(viewerId);
    if (!viewer) return false;
    const owner = await this.userService.getById(post.ownerId);
    if (viewer.id === owner.id) return true;
    const viewerShare = await this.blockchainService.viewUserSharesCount(logId, viewer.walletAddress);

    return !!viewerShare?.data?.holdingAddresses?.find(holding => holding.address.toLowerCase() === owner.walletAddress.toLowerCase());
  }
}
