import { EmailUpdatedEvent, FundsTransferredEvent, SharesBoughtEvent, SharesSoldEvent, TokenTransferredEvent, UserUpdatedEvent } from "@business/event/event.model";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cache } from 'cache-manager';
import { OnEvent } from "@nestjs/event-emitter";
import { CACHE_MANAGER } from "@nestjs/cache-manager";

import { APP_EVENT } from "@shared/constants";
import { BlockchainWrapperService } from "@business/blockchain/services/blockchain-wrapper.service";

@Injectable()
export class UserEventHandlerService {
  protected logger = new Logger(UserEventHandlerService.name);

  constructor(
    protected blockchainWrapperService: BlockchainWrapperService,

    @Inject(CACHE_MANAGER)
    protected cacheService: Cache,
  ) {}

  @OnEvent(APP_EVENT.SHARE_BOUGHT)
  public async handleSharesBoughtEvent(event: SharesBoughtEvent): Promise<void> {
    this.logger.debug(`[${event.logId}]: Handle shares bought event`);

    await Promise.all([
      this.blockchainWrapperService.delStartWith(`getRecentTrades`),
      this.blockchainWrapperService.delStartWith(`viewUserTradeHistory:${event.buyerAddress}`),
      this.blockchainWrapperService.delStartWith(`viewUserTradeHistory:${event.ownerAddress}`),

      this.blockchainWrapperService.delStartWith(`viewTradeInvestmentShare:${event.buyerAddress}`),
      this.blockchainWrapperService.delStartWith(`viewTradeInvestmentShare:${event.ownerAddress}`),

      this.blockchainWrapperService.del(`viewUserBalance:${event.buyerAddress}`),
      this.blockchainWrapperService.del(`viewUserBalance:${event.ownerAddress}`),

      this.blockchainWrapperService.del(`viewSharesPrice:${event.ownerAddress}`),

      this.blockchainWrapperService.del(`viewUserSharesCount:${event.buyerAddress}`),
      this.blockchainWrapperService.del(`viewUserSharesCount:${event.ownerAddress}`),

      this.blockchainWrapperService.del(`viewUserEarnedFees:${event.buyerAddress}`),
      this.blockchainWrapperService.del(`viewUserEarnedFees:${event.ownerAddress}`),

      this.blockchainWrapperService.del(`viewUserTradingVolume:${event.buyerAddress}`),
      this.blockchainWrapperService.del(`viewUserTradingVolume:${event.ownerAddress}`),
    ]);
  }

  @OnEvent(APP_EVENT.SHARE_SOLD)
  public async handleSharesSoldEvent(event: SharesSoldEvent): Promise<void> {
    this.logger.debug(`[${event.logId}]: Handle shares sold event`);

    await Promise.all([
      this.blockchainWrapperService.delStartWith(`getRecentTrades`),
      this.blockchainWrapperService.delStartWith(`viewUserTradeHistory:${event.sellerAddress}`),
      this.blockchainWrapperService.delStartWith(`viewUserTradeHistory:${event.ownerAddress}`),

      this.blockchainWrapperService.delStartWith(`viewTradeInvestmentShare:${event.sellerAddress}`),
      this.blockchainWrapperService.delStartWith(`viewTradeInvestmentShare:${event.ownerAddress}`),

      this.blockchainWrapperService.del(`viewUserBalance:${event.sellerAddress}`),
      this.blockchainWrapperService.del(`viewUserBalance:${event.ownerAddress}`),

      this.blockchainWrapperService.del(`viewSharesPrice:${event.ownerAddress}`),

      this.blockchainWrapperService.del(`viewUserSharesCount:${event.sellerAddress}`),
      this.blockchainWrapperService.del(`viewUserSharesCount:${event.ownerAddress}`),

      this.blockchainWrapperService.del(`viewUserEarnedFees:${event.sellerAddress}`),
      this.blockchainWrapperService.del(`viewUserEarnedFees:${event.ownerAddress}`),

      this.blockchainWrapperService.del(`viewUserTradingVolume:${event.sellerAddress}`),
      this.blockchainWrapperService.del(`viewUserTradingVolume:${event.ownerAddress}`),
    ]);
  }

  @OnEvent(APP_EVENT.FUNDS_TRANSFERRED)
  public async handleFundsTransferredEvent(event: FundsTransferredEvent): Promise<void> {
    this.logger.debug(`[${event.logId}]: Handle funds transferred event`);

    await Promise.all([
      this.blockchainWrapperService.del(`viewUserBalance:${event.fromAddress}`),
      this.blockchainWrapperService.del(`viewUserBalance:${event.toAddress}`),
    ]);
  }

  @OnEvent(APP_EVENT.TOKEN_TRANSFERRED)
  public async handleTokenTransferredEvent(event: TokenTransferredEvent): Promise<void> {
    this.logger.debug(`[${event.logId}]: Handle token transferred event`);

    await Promise.all([
      this.blockchainWrapperService.del(`viewUserBalance:${event.fromAddress}`),

      this.blockchainWrapperService.del(`viewUserListTokenBalance:${event.fromAddress}`),
      this.blockchainWrapperService.del(`viewUserListTokenBalance:${event.toAddress}`),

      this.blockchainWrapperService.del(`viewUserTokenBalance:${event.fromAddress}:${event.tokenAddress}`),
      this.blockchainWrapperService.del(`viewUserTokenBalance:${event.toAddress}:${event.tokenAddress}`),
    ]);
  }

  @OnEvent(APP_EVENT.EMAIL_UPDATED)
  public async handleEmailUpdatedEvent(event: EmailUpdatedEvent): Promise<void> {
    this.logger.debug(`[${event.logId}]: Handle email updated event`);

    await this.cacheService.del(`user_profile:${event.userId}`);
  }

  @OnEvent(APP_EVENT.USER_UPDATED)
  public async handleUserUpdatedEvent(event: UserUpdatedEvent): Promise<void> {
    this.logger.debug(`[${event.logId}]: Handle user updated event`);

    await this.cacheService.del(`user_profile:${event.userId}`);

    if (event.referenceId) {
      await this.cacheService.del(`viewIntegrateUser:${event.referenceId.toUpperCase()}`)
    }
  }
}