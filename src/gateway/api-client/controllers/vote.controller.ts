import { BlockchainWrapperService } from '@business/blockchain/services/blockchain-wrapper.service';
import { BlockchainProfileService } from '@business/blockchain/services/bockchain-profile.service';
import { DEFAULT_PROFILE_BANNER_URL, DEFAULT_PROFILE_IMAGE_URL, extractPublicInfo, genReferralCode, } from '@business/user/user.entity';
import { UserService } from '@business/user/user.service';
import { PaginationDTO, UsePaginationQuery } from '@core/dto/pagination.dto';
import { ResponseCode } from '@core/dto/response';
import { LogId } from '@core/logging/logging';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Body, Controller, Get, Inject, Logger, Post, Query, UseGuards, UseInterceptors, } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { INJECTION_TOKEN } from '@shared/constants';
import { chain, number } from 'mathjs';
import { AuditService } from 'mvc-common-toolkit';
import { AuthGuard } from '../auth/auth.guard';
import { TwitterService } from '../services/twitter.service';

export class CreateVoteDto {
  @ApiProperty({
    example: 'newscientist',
  })
  screen_name: string;
}

@ApiTags('client/votes')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('votes')
export class VoteController {
  protected logger = new Logger(this.constructor.name);

  constructor(
    protected blockchainProfileService: BlockchainProfileService,
    protected blockchainWrapperService: BlockchainWrapperService,
    protected userService: UserService,
    private twitterService: TwitterService,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {}

  @Post('create')
  async createVote(@LogId() logId: string, @Body() body: CreateVoteDto) {
    const { screen_name } = body;
    let vote = await this.userService.getByTwitterScreenName(screen_name);
    if (!vote) {
      const twitterUserResult = await this.twitterService.getProfile(
        logId,
        screen_name,
      );
      if (!twitterUserResult?.success)
        return { success: false, code: ResponseCode.TWITTER_USER_NOT_FOUND };

      const getPrivateKeyResponse =
        await this.blockchainWrapperService.genNewKey(logId);
      if (!getPrivateKeyResponse.success) {
        this.logger.error(
          `[${logId}]: get private key for new user: ` +
            getPrivateKeyResponse.message,
        );
        return { success: false, code: ResponseCode.INTERNAL_SERVER_ERROR };
      }

      const { publicKey, serverSecret } = getPrivateKeyResponse.data;
      const { name, location, description, profile_image_url, id } =
        twitterUserResult.data;
      vote = await this.userService.save({
        referral_code: genReferralCode(),
        twitterId: id,
        twitterScreenName: screen_name,
        walletAddress: publicKey,
        walletSecret: serverSecret,
        fullname: name || screen_name,
        location,
        description,
        profile_image_url:
          profile_image_url?.replace('_normal', '_400x400') ||
          DEFAULT_PROFILE_IMAGE_URL,
        profile_banner_url: DEFAULT_PROFILE_BANNER_URL,
        is_voting: true,
      });
      await this.blockchainProfileService.save({
        userId: vote.id,
        walletAddress: vote.walletAddress.toLowerCase(),
        isVote: vote.is_voting,
        balance: 0,
        tradingVolume: 0,
        earned: 0,
        referralFee: 0,
        subjectFee: 0,
        sold: 0,
        bought: 0,
        holder: 0,
        holding: 0,
        lastActivity: vote.updatedAt,
      });
    }

    if (!vote.is_voting)
      return {
        success: false,
        code: ResponseCode.TWITTER_ALREADY_LINKED_TO_OTHER_ACCOUNT,
      };

    const data = extractPublicInfo(vote);

    let share = null;
    const sharePriceResult =
      await this.blockchainWrapperService.viewSharesPrice(
        logId,
        vote.walletAddress,
      );
    if (sharePriceResult?.success) {
      const { buyPrice, sellPrice } = sharePriceResult.data;
      share = { buyPrice, sellPrice };
    }

    return { success: true, data: { ...data, share } };
  }

  @Get('info')
  async getInfo(
    @LogId() logId: string,
    @Query('screen_name') screen_name: string,
  ) {
    const vote = await this.userService.getByTwitterScreenName(screen_name);
    if (!vote) return { success: false, code: ResponseCode.NOT_FOUND };

    const data = extractPublicInfo(vote);

    let share = null;
    const sharePriceResult =
      await this.blockchainWrapperService.viewSharesPrice(
        logId,
        vote.walletAddress,
      );
    if (sharePriceResult?.success) {
      const { buyPrice, sellPrice } = sharePriceResult.data;
      share = { buyPrice, sellPrice };
    }

    return { success: true, data: { ...data, share } };
  }

  @Get('total-unclaimed')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60)
  async totalUnclaimed(@LogId() logId: string) {
    const voteUsers = await this.userService.find({
      where: { is_voting: true },
    });

    const allFees = await Promise.all(
      voteUsers.map(async (voteUser) => {
        const earnedFees =
          await this.blockchainWrapperService.viewUserEarnedFees(
            logId,
            voteUser.walletAddress,
          );
        if (!earnedFees.success) {
          this.logger.error(
            `failed to view earned fees for address ${voteUser.walletAddress}`,
          );
          return '0';
        }
        const { subjectFee } = earnedFees.data;
        return subjectFee;
      }),
    );

    let totalFee = chain(0);

    allFees.forEach((fee) => (totalFee = totalFee.add(number(fee))));

    const result = totalFee.done().toString();

    return result;
  }

  @UsePaginationQuery()
  @Get('top')
  async topVote(@LogId() logId: string, @Query() query: PaginationDTO) {
    const total = await this.blockchainProfileService.count({ isVote: true });
    const blockchainProfiles = await this.blockchainProfileService.find(
      { isVote: true },
      {
        skip: query.offset,
        limit: query.limit,
        sort: '-sold',
      },
    );
    const rows = await Promise.all(
      blockchainProfiles.map(async (p) => {
        const { holder, sold } = p;
        const vote = await this.userService.getById(p.userId);
        const data = extractPublicInfo(vote);
        let share = null;
        const sharePriceResult =
          await this.blockchainWrapperService.viewSharesPrice(
            logId,
            vote.walletAddress,
          );
        if (sharePriceResult?.success) {
          const { buyPrice, sellPrice } = sharePriceResult.data;
          share = { buyPrice, sellPrice };
        }
        return { ...data, share, holder, sold };
      }),
    );

    return { success: true, data: { rows, total } };
  }
}
