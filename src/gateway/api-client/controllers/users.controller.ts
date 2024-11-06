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
import { BlockchainWrapperService } from '@business/blockchain/services/blockchain-wrapper.service';
import { BlockchainProfileService } from '@business/blockchain/services/bockchain-profile.service';
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
    protected blockchainService: BlockchainWrapperService,
    protected blockchainProfileService: BlockchainProfileService,
    protected accountTypeConfigService: AccountTypeConfigService,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {}

  @ApiParam({
    name: 'id',
    example: '8aa4f713-afea-483b-b07b-56149d0f0ea6',
  })
  @Get(':id/earned-fees')
  @UseInterceptors(CacheInterceptor)
  @UsePipes(new UUIDValidatorPipe())
  @CacheTTL(15)
  async viewUserEarnedFees(@LogId() logId: string, @Param('id') id: string) {
    const user = await this.userService.getByIdOrTwitterScreenName(id);

    if (!user) return { success: false, code: ResponseCode.NOT_FOUND };

    const { walletAddress } = user;
    const earnedFeesResult = await this.blockchainService.viewUserEarnedFees(
      logId,
      walletAddress,
    );

    if (earnedFeesResult?.success) {
      const { referralFee, subjectFee } = earnedFeesResult.data;

      return {
        success: true,
        data: {
          referralFee,
          subjectFee,
        },
      };
    }

    return {
      success: false,
      message: ResponseCode.INTERNAL_SERVER_ERROR,
    };
  }

  @ApiParam({
    name: 'id',
    example: '8aa4f713-afea-483b-b07b-56149d0f0ea6',
  })
  @Get(':id/relationship')
  @UseInterceptors(CacheInterceptor)
  @UsePipes(new UUIDValidatorPipe())
  @CacheTTL(15)
  async viewUserRelationship(@LogId() logId: string, @Param('id') id: string) {
    const user = await this.userService.getByIdOrTwitterScreenName(id);
    if (!user) return { success: false, code: ResponseCode.NOT_FOUND };

    const { walletAddress } = user;
    const result = await this.blockchainService.viewUserSharesCount(
      logId,
      walletAddress,
    );

    if (result?.success) {
      const data: UserRelationshipResult = result.data;
      const { holderAddresses, holdingAddresses } = data;
      const holderData = await Promise.all(
        holderAddresses.map(async (holder) => {
          const user = await this.userService.getByWalletAddress(
            holder.address,
          );
          if (!user) return;

          const share = await this.getSharePrice(logId, user);

          const populateUser = await this.populateUserRelationship(
            logId,
            holder,
          );
          return { ...populateUser, share };
        }),
      );

      const holdingData = await Promise.all(
        holdingAddresses.map(async (holding) => {
          const user = await this.userService.getByWalletAddress(
            holding.address,
          );
          if (!user) return;

          const share = await this.getSharePrice(logId, user);

          const populateUser = await this.populateUserRelationship(
            logId,
            holding,
          );

          return { ...populateUser, share };
        }),
      );

      return {
        success: true,
        data: {
          holderAddreses: holderData.filter((i) => i),
          holdingAddresses: holdingData.filter((i) => i),
        },
      };
    }

    return {
      success: false,
      message: ResponseCode.INTERNAL_SERVER_ERROR,
    };
  }

  protected async populateUserRelationship(
    logId: string,
    relationship: UserRelationship,
  ): Promise<any> {
    const user = await this.userService.getByWalletAddress(
      relationship.address,
    );

    if (!user) {
      this.logger.warn(`user with address ${relationship.address} not found`);
      return;
    }

    const { id, fullname, profile_image_url, twitterScreenName, accountType } =
      user;
    const balanceResult = await this.blockchainService.viewUserBalance(
      logId,
      relationship.address,
    );

    if (!balanceResult.success) {
      this.logger.error('failed to get user balance');

      return;
    }

    return {
      fullname,
      balance: balanceResult.data,
      id,
      imageUrl: profile_image_url,
      username: twitterScreenName,
      sharesCount: relationship.count,
      accountType,
    };
  }

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

  @Get('token-balance/common')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60)
  async getListTokenBalance(@LogId() logId: string, @RequestUser() user: User) {
    const tokenBalanceResult = await this.blockchainService.getListTokenBalance(
      logId,
      user.walletAddress,
    );
    if (!tokenBalanceResult.success) {
      return {
        success: false,
        message: ResponseCode.INTERNAL_SERVER_ERROR,
      };
    }

    return { success: true, data: tokenBalanceResult.data };
  }

  @Get('token-balance/:tokenAddress')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60)
  async getTokenBalance(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Param('tokenAddress') tokenAddress: string,
  ) {
    const tokenBalanceResult = await this.blockchainService.getTokenBalance(
      logId,
      user.walletAddress,
      tokenAddress,
    );
    if (!tokenBalanceResult.success) {
      return {
        success: false,
        message: ResponseCode.INTERNAL_SERVER_ERROR,
      };
    }

    return { success: true, data: tokenBalanceResult.data };
  }

  async mapUserInfo(logId: string, user: User) {
    const { walletAddress } = user;
    const share = await this.getSharePrice(logId, user);
    const balance = (
      await this.blockchainService.viewUserBalance(logId, walletAddress)
    ).data;
    const publicInfo = extractPublicInfo(user);

    return { ...publicInfo, balance, share };
  }

  protected async getSharePrice(logId: string, user: User) {
    const { walletAddress } = user;
    let share = null;
    switch (user.accountType) {
      case ACCOUNT_TYPE.NORMAL:
        // eslint-disable-next-line no-case-declarations
        const sharePriceResult = await this.blockchainService.viewSharesPrice(
          logId,
          walletAddress,
        );
        if (sharePriceResult?.success) {
          const { buyPrice, sellPrice } = sharePriceResult.data;
          share = { buyPrice, sellPrice };
        }

        break;

      case ACCOUNT_TYPE.INVESTMENT:
        // eslint-disable-next-line no-case-declarations
        const sharePriceConfig = await this.accountTypeConfigService.findOne({
          userId: user.id,
        });

        share = {
          buyPrice: sharePriceConfig.metadata.sharePrice,
          txFee: sharePriceConfig.metadata.txFee,
          sellPrice: '0',
        };

        break;

      default:
        break;
    }

    return share;
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

    const isHolder = await this.isHolder(logId, viewerId, id);

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
    const postOwnerBalance = await this.blockchainService.viewUserBalance(
      logId,
      postOwner.walletAddress,
    );
    const sharePriceResult = await this.blockchainService.viewSharesPrice(
      logId,
      postOwner.walletAddress,
    );
    const { buyPrice = '0', sellPrice = '0' } = sharePriceResult.data || {};
    const share = { buyPrice, sellPrice };
    const mappedUserPosts: PostView[] = await Promise.all(
      paginateResult.rows.map(async (post: PostDocument): Promise<PostView> => {
        const { likesCount, viewerInteractions, commentCount, retweetCount } =
          await this.postService.getPostInteractions({
            slug: post.slug,
            viewerId,
          });
        const metadata: Record<string, any> = {};
        const canViewPost = post.policy === POST_POLICY.PUBLIC || isHolder;

        const mtdt: ReplyMetadata =
          post.type === POST_TYPE.REPLY
            ? post.replyMetadata
            : post.repostMetadata;
        if (mtdt?.postSlug) {
          const originalPost = await this.postService.getOne({
            slug: mtdt.postSlug,
          });
          if (originalPost) {
            const isHolderOfOriginalUser = await this.isHolder(
              logId,
              viewerId,
              mtdt.ownerId,
            );
            const canViewOriginalPost =
              originalPost.policy === POST_POLICY.PUBLIC ||
              isHolderOfOriginalUser;
            const originalPostOwner = await this.userService.getById(
              mtdt.ownerId,
            );
            if (originalPostOwner) {
              const originalPostOwnerBalanceResponse =
                await this.blockchainService.viewUserBalance(
                  logId,
                  originalPostOwner.walletAddress,
                );
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
                balance: originalPostOwnerBalanceResponse?.data,
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
            balance: postOwnerBalance.data,
            imageUrl: postOwner.profile_image_url,
            username: postOwner.twitterScreenName,
            share,
          },
        };
      }),
    );

    return {
      success: true,
      data: {
        isHolder,
        totalCount: paginateResult.total,
        rows: mappedUserPosts.filter((i) => i), // filter null
      },
    };
  }

  @UsePaginationQuery()
  @Get('who-to-buy')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60)
  async getWhoToBuy(@LogId() logId: string, @Query() query: PaginationDTO) {
    const total = await this.userService.count({});
    const users = await this.blockchainProfileService.find(
      {},
      {
        skip: query.offset,
        limit: query.limit,
        sort: '-lastActivity',
      },
    );
    const items = await Promise.all(
      users.map((user) => this.getUserInfo(logId, user.userId)),
    );

    return {
      success: true,
      data: { total, items: items.filter((i) => i.success) },
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

  @Get('share-report')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60)
  async getUserCompany(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Query() dto: ShareReportDTO,
  ) {
    const viewUserShareCountResponse =
      await this.blockchainService.viewUserSharesCount(
        logId,
        user.walletAddress,
      );
    if (!viewUserShareCountResponse?.success) return viewUserShareCountResponse;

    const holdingAddreses =
      viewUserShareCountResponse.data.holdingAddresses.map(
        (holding) => holding.address,
      );

    const endOfMonthDate = dayjs(dto.endDate)
      .endOf('month')
      .add(1, 'day')
      .format('YYYY-MM-DD');

    const mappedUserCompany = await Promise.all(
      holdingAddreses.map(async (address) => {
        const userCompany = await this.userService.getByWalletAddress(address);
        if (userCompany?.accountType === ACCOUNT_TYPE.NORMAL) {
          return;
        }

        const analyticResponse = await this.blockchainService.analytics(
          logId,
          {
            endDate: endOfMonthDate as any,
            companyAddress: address,
          },
          user.walletAddress,
        );

        if (
          !analyticResponse.success ||
          !analyticResponse.data.details[user.walletAddress] ||
          analyticResponse.data.details[user.walletAddress].count === 0
        ) {
          return;
        }

        const { data } = analyticResponse;

        return {
          fullName: userCompany.fullname,
          twitterScreenName: userCompany.twitterScreenName,
          email: userCompany.email,
          id: userCompany.id,
          profile_image_url: userCompany.profile_image_url,
          analytic: { ...data, details: data.details[user.walletAddress] },
        };
      }),
    );

    return {
      success: true,
      data: mappedUserCompany.filter((userCompany) => userCompany),
    };
  }

  @UsePaginationQuery()
  @Get('top')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)
  async topProfile(@LogId() logId: string, @Query() query: PaginationDTO) {
    const total = await this.userService.count({ is_voting: false });
    const users = await this.blockchainProfileService.find(
      {},
      {
        skip: query.offset,
        limit: query.limit,
        sort: '-balance',
      },
    );
    const items = await Promise.all(
      users.map((user) => this.getUserInfo(logId, user.userId)),
    );

    return {
      success: true,
      data: { total, items: items.filter((i) => i.success) },
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

  @Get('tag-users-available')
  async searchTagUsersAvailable(
    @LogId() logId: string,
    @RequestUser() user: User,
  ) {
    const result = await this.blockchainService.viewUserSharesCount(
      logId,
      user.walletAddress,
    );
    if (!result?.success) {
      return result;
    }

    const data: UserRelationshipResult = result.data;
    const { holderAddresses, holdingAddresses } = data;
    const holderData = await Promise.all(
      holderAddresses.map(async (holder) => {
        const user = await this.userService.getByWalletAddress(holder.address);
        if (!user) return;

        return extractPublicInfo(user);
      }),
    );

    const holdingData = await Promise.all(
      holdingAddresses.map(async (holding) => {
        const user = await this.userService.getByWalletAddress(holding.address);
        if (!user) return;

        return extractPublicInfo(user);
      }),
    );

    const uniqueObjects = removeDuplicateObjects(
      [...holderData.filter((i) => i), ...holdingData.filter((i) => i)],
      'id',
    );

    return {
      success: true,
      data: uniqueObjects,
    };
  }

  @ApiParam({
    name: 'id',
    example: '8aa4f713-afea-483b-b07b-56149d0f0ea6',
  })
  @Get(':id/holders')
  @UsePipes(new UUIDValidatorPipe())
  async getHolders(@LogId() logId: string, @Param('id') id: string) {
    const user = await this.userService.getByIdOrTwitterScreenName(id);
    if (!user) return { success: false, code: ResponseCode.NOT_FOUND };

    const { walletAddress } = user;
    const result = await this.blockchainService.viewUserSharesCount(
      logId,
      walletAddress,
    );
    if (!result?.success || !Array.isArray(result?.data?.holderAddresses))
      return { success: false };

    const holders = result.data.holderAddresses;
    const shareCount = holders.reduce(
      (previousValue, holder) => previousValue + holder.count,
      0,
    );
    const allUser = await Promise.all(
      holders.map((holder) =>
        this.userService.getByWalletAddress(holder.address),
      ),
    );

    const data = {
      holders: holders.map(({ address, count }) => {
        const user = allUser.find((item) => (item.walletAddress = address));
        return { user, count };
      }),
      shareCount,
    };

    if (user.shared != shareCount) {
      await this.userService.updateById(id, { shared: shareCount });
    }
    return { success: true, data };
  }

  @ApiParam({
    name: 'id',
    example: '8aa4f713-afea-483b-b07b-56149d0f0ea6',
  })
  @Get(':id/holding')
  @UsePipes(new UUIDValidatorPipe())
  async getHolding(@LogId() logId: string, @Param('id') id: string) {
    const user = await this.userService.getByIdOrTwitterScreenName(id);
    if (!user) return { success: false, code: ResponseCode.NOT_FOUND };

    const { walletAddress } = user;
    const result = await this.blockchainService.viewUserSharesCount(
      logId,
      walletAddress,
    );
    if (!result?.success || !Array.isArray(result?.data?.holderAddresses))
      return { success: false };

    const holding = result.data.holdingAddresses;
    const shareCount = holding.reduce(
      (previousValue, holder) => previousValue + holder.count,
      0,
    );
    const allAddress = holding.map((holder) => holder.address);
    const allUser = (
      await this.userService.find({
        where: { walletAddress: In(allAddress) },
      })
    ).map(extractPublicInfo);

    const data = {
      holding: holding.map(({ address, count }) => {
        const user = allUser.find((item) => (item.walletAddress = address));
        return { user, count };
      }),
      shareCount,
    };

    return { success: true, data };
  }

  async isHolder(logId: string, holderId: string, targetId: string) {
    if (holderId === targetId) return true;
    const viewer = await this.userService.getById(holderId);
    const owner = await this.userService.getById(targetId);
    const viewerShare = await this.blockchainService.viewUserSharesCount(
      logId,
      viewer.walletAddress,
    );

    return !!viewerShare?.data?.holdingAddresses?.find(
      (holding) =>
        holding.address.toLowerCase() === owner?.walletAddress?.toLowerCase(),
    );
  }
}
