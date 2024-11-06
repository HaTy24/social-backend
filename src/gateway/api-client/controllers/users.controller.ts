import dayjs from 'dayjs';
import { AuditService } from 'mvc-common-toolkit';
import { ILike, In } from 'typeorm';

import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import {
  Controller,
  Get,
  Inject,
  Logger,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';

import { RequestUser } from '@core/decorators/request-user';
import { PaginationDTO, UsePaginationQuery } from '@core/dto/pagination.dto';
import { HttpResponse, ResponseCode } from '@core/dto/response';
import { LogId } from '@core/logging/logging';
import { UUIDValidatorPipe } from '@core/pipes/uuid-validator.pipe';

import { AccountTypeConfigService } from '@business/account-type-config/account-type-config.service';
import { PaginateUserHomePostsDTO } from '@business/post/post.dto';
import {
  POST_POLICY,
  POST_TYPE,
  PostDocument,
  ReplyMetadata,
} from '@business/post/post.model';
import { PostService } from '@business/post/post.service';
import { PostView } from '@business/post/post.type';
import { SearchUsersDTO, ShareReportDTO } from '@business/user/user.dto';
import {
  ACCOUNT_TYPE,
  User,
  extractPublicInfo,
} from '@business/user/user.entity';
import { UserService } from '@business/user/user.service';

import { INJECTION_TOKEN } from '@shared/constants';
import { removeDuplicateObjects } from '@shared/helpers/array-helper';
import { UserRelationship, UserRelationshipResult } from '@shared/types';

import { AuthGuard } from '../auth/auth.guard';

@ApiTags('client/users')
@Controller('users')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class UsersController {
  protected logger = new Logger(UsersController.name);

  constructor(
    private userService: UserService,
    protected postService: PostService,
    protected accountTypeConfigService: AccountTypeConfigService,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {}

  @ApiParam({
    name: 'id',
    example: '8aa4f713-afea-483b-b07b-56149d0f0ea6',
  })
  @Get(':id/info')
  @UseInterceptors(CacheInterceptor)
  @UsePipes(new UUIDValidatorPipe())
  @CacheTTL(15)
  async getUserInfo(@LogId() logId: string, @Param('id') id: string) {
    const user = await this.userService.getByIdOrTwitterScreenName(id);
    if (!user) return { success: false, code: ResponseCode.NOT_FOUND };

    const data = await this.mapUserInfo(logId, user);

    return { success: true, data };
  }

  @Get(':userName/detail')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(15)
  async getUserInfoByUserName(
    @LogId() logId: string,
    @Param('userName') userName: string,
  ): Promise<HttpResponse> {
    const user = await this.userService.getByTwitterScreenName(userName);
    if (!user) {
      return {
        success: false,
        message: 'user not found',
        code: ResponseCode.NOT_FOUND,
      };
    }

    return { success: true, data: extractPublicInfo(user) };
  }

  @Get('investment')
  @UseInterceptors(CacheInterceptor)
  @UsePipes(new UUIDValidatorPipe())
  @CacheTTL(15)
  async getInvestment(@LogId() logId: string, @Query() dto: PaginationDTO) {
    dto.addFilter({ accountType: ACCOUNT_TYPE.INVESTMENT });

    const paginateResult = await this.userService.paginate(dto);

    if (paginateResult.totalCount === 0) {
      return {
        success: true,
        data: {
          rows: [],
          totalCount: 0,
        },
      };
    }

    const userInfos = await Promise.all(
      paginateResult.items.map((data) => this.mapUserInfo(logId, data)),
    );

    return {
      success: true,
      data: {
        rows: userInfos,
        totalCount: paginateResult.totalCount,
      },
    };
  }

  async mapUserInfo(logId: string, user: User) {
    const publicInfo = extractPublicInfo(user);

    return { ...publicInfo };
  }

  @UsePaginationQuery()
  @ApiParam({
    name: 'id',
    example: '8aa4f713-afea-483b-b07b-56149d0f0ea6',
  })
  @Get(':id/posts')
  @UseInterceptors(CacheInterceptor)
  @UsePipes(new UUIDValidatorPipe())
  @CacheTTL(10)
  public async getUserPosts(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Param('id') id,
    @Query() dto: PaginateUserHomePostsDTO,
  ): Promise<HttpResponse> {
    const viewerId = user.id;
    const allowedPostTypes = [
      POST_TYPE.TWEET,
      POST_TYPE.REPLY,
      POST_TYPE.RETWEET,
    ];

    dto.addFilter({
      ownerId: id,
      type: allowedPostTypes,
    });

    const paginateResult = await this.postService.paginate(dto, {
      sort: {
        createdAt: -1,
      },
    });

    const postOwner = await this.userService.getById(id);

    const mappedUserPosts: PostView[] = await Promise.all(
      paginateResult.rows.map(async (post: PostDocument): Promise<PostView> => {
        const { likesCount, viewerInteractions, commentCount, retweetCount } =
          await this.postService.getPostInteractions({
            slug: post.slug,
            viewerId,
          });
        const metadata: Record<string, any> = {};
        const canViewPost = post.policy === POST_POLICY.PUBLIC;

        const mtdt: ReplyMetadata =
          post.type === POST_TYPE.REPLY
            ? post.replyMetadata
            : post.repostMetadata;
        if (mtdt?.postSlug) {
          const originalPost = await this.postService.getOne({
            slug: mtdt.postSlug,
          });
          if (originalPost) {
            const canViewOriginalPost =
              originalPost.policy === POST_POLICY.PUBLIC;
            const originalPostOwner = await this.userService.getById(
              mtdt.ownerId,
            );
            if (originalPostOwner) {
              metadata.originalPost = {
                type: originalPost.type,
                policy: originalPost.policy,
                slug: canViewOriginalPost ? originalPost.slug : null,
                text: canViewOriginalPost ? originalPost.text : null,
                media: canViewOriginalPost ? originalPost.media : null,
                createdAt: originalPost.createdAt,
              };
              metadata.originalUser = {
                ...extractPublicInfo(originalPostOwner),
                imageUrl: originalPostOwner.profile_image_url,
                username: originalPostOwner.twitterScreenName,
              };
            }
          }
        }
        return {
          actions: viewerInteractions,
          likesCount,
          commentCount,
          type: post.type,
          retweetCount,
          createdAt: post.createdAt,
          policy: post.policy,
          slug: post.slug,
          media: canViewPost ? post.media : null,
          text: canViewPost ? post.text : null,
          metadata,
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
        totalCount: paginateResult.total,
        rows: mappedUserPosts.filter((i) => i), // filter null
      },
    };
  }

  @UsePaginationQuery()
  @Get('suggestions')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)
  async getSuggestions(@LogId() logId: string, @Query() query: PaginationDTO) {
    const randomUsers = await this.userService.getRandomUsers();
    const paginatedUsers = randomUsers.slice(
      query.offset,
      query.limit + query.offset,
    );

    const items = await Promise.all(
      paginatedUsers.map((user) => this.getUserInfo(logId, user.id)),
    );

    return {
      success: true,
      data: {
        total: randomUsers.length,
        items: items.filter((i) => i.success),
      },
    };
  }

  @Get('search')
  async searchUsers(@LogId() logId: string, @Query() dto: SearchUsersDTO) {
    const searchUserIds = await this.userService.find({
      where: [
        { fullname: ILike(`%${dto.keyword}%`) },
        { twitterScreenName: ILike(`%${dto.keyword}%`) },
      ],
    });

    const userInfos = await Promise.all(
      searchUserIds.map((data) => this.mapUserInfo(logId, data)),
    );

    return {
      success: true,
      data: userInfos,
    };
  }
}
