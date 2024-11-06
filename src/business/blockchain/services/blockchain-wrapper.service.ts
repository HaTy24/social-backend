import { Cache } from 'cache-manager';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { CacheWrapperService } from '@core/cache/cache-wrapper.service';
import { HttpResponse } from '@core/dto/response';

import { AnalyticFilterDTO } from '@business/admin/analytic/analytic.dto';
import {
  BlockchainService,
  Trade,
  UserTrade,
} from '@business/blockchain/services/blockchain.service';

import { ANALYTIC_CACHE_TTL, DEFAULT_CACHE_TTL } from '@shared/constants';
import {
  GenNewKeyResponse,
  InvestmentReport,
  UserEarnedFees,
  ViewSharesPriceResponse,
  ViewUserSharesCountResponse,
} from '@shared/types';

import {
  BuyShareData,
  FundsTransferData,
  SellShareData,
  TokenTransferData,
  ViewTradeHistoryData,
} from '../blockchain.type';

@Injectable()
export class BlockchainWrapperService extends CacheWrapperService {
  protected logger = new Logger(this.constructor.name);
  protected ttl_ms = 120000;

  constructor(
    @Inject(CACHE_MANAGER) protected cache: Cache,
    private blockchainService: BlockchainService,
  ) {
    super(cache);
  }

  public async getRecentTrades(
    logId: string,
    offset: number,
    limit: number,
  ): Promise<HttpResponse<{ total: number; rows: Trade[] }>> {
    const key = `getRecentTrades:${offset}:${limit}`;
    const cached = await this.get(key);
    if (cached) {
      this.logger.debug(`[${logId}]: Loaded ${key} from cache successful`);
      return cached;
    }
    const result = await this.blockchainService.getRecentTrades(
      logId,
      offset,
      limit,
    );
    if (result?.success) await this.set(key, result);
    return result;
  }

  public async viewUserTradeHistory(
    logId: string,
    filter: ViewTradeHistoryData,
    limit: number,
    offset: number,
  ): Promise<HttpResponse<{ totalCount: number; items: UserTrade[] }>> {
    const key = `viewUserTradeHistory:${filter.address || filter.ownerAddress}:${filter.type}:${offset}:${limit}`;
    const cached = await this.get(key);
    if (cached) {
      this.logger.debug(`[${logId}]: Loaded ${key} from cache successful`);
      return cached;
    }

    const result = await this.blockchainService.viewUserTradeHistory(
      logId,
      filter,
      limit,
      offset,
    );
    if (result?.success) await this.set(key, result);
    return result;
  }

  public async viewUserSharesCount(
    logId: string,
    address: string,
  ): Promise<HttpResponse<ViewUserSharesCountResponse>> {
    const key = `viewUserSharesCount:${address}`;
    const cached = await this.get(key);
    if (cached) {
      this.logger.debug(`[${logId}]: Loaded ${key} from cache successful`);
      return cached;
    }

    const result = await this.blockchainService.viewUserSharesCount(
      logId,
      address,
    );
    if (result?.success) await this.set(key, result);
    return result;
  }

  public async viewUserBalance(
    logId: string,
    address: string,
  ): Promise<HttpResponse> {
    const key = `viewUserBalance:${address}`;
    const cached = await this.get(key);

    if (cached) {
      this.logger.debug(`[${logId}]: Loaded ${key} from cache successful`);
      return cached;
    }

    const result = await this.blockchainService.viewUserBalance(logId, address);

    if (result?.success) await this.set(key, result, DEFAULT_CACHE_TTL);
    return result;
  }

  public async viewSharesPrice(
    logId: string,
    address: string,
  ): Promise<HttpResponse<ViewSharesPriceResponse>> {
    const key = `viewSharesPrice:${address}`;
    const cached = await this.get(key);
    if (cached) {
      this.logger.debug(`[${logId}]: Loaded ${key} from cache successful`);
      return cached;
    }

    const result = await this.blockchainService.viewSharesPrice(logId, address);
    if (result?.success) await this.set(key, result);

    return result;
  }

  public async viewUserEarnedFees(
    logId: string,
    address: string,
  ): Promise<HttpResponse<UserEarnedFees>> {
    const key = `viewUserEarnedFees:${address}`;
    const cached = await this.get(key);
    if (cached) {
      this.logger.debug(`[${logId}]: Loaded ${key} from cache successful`);
      return cached;
    }

    const result = await this.blockchainService.viewUserEarnedFees(
      logId,
      address,
    );
    if (result?.success) await this.set(key, result);
    return result;
  }

  public async viewUserTradingVolume(
    logId: string,
    address: string,
  ): Promise<HttpResponse<string>> {
    const key = `viewUserTradingVolume:${address}`;
    const cached = await this.get(key);
    if (cached) {
      this.logger.debug(`[${logId}]: Loaded ${key} from cache successful`);
      return cached;
    }

    const result = await this.blockchainService.viewUserTradingVolume(
      logId,
      address,
    );
    if (result?.success) await this.set(key, result);
    return result;
  }

  public async buyShares(
    logId: string,
    buyShareData: BuyShareData,
  ): Promise<HttpResponse> {
    const result = await this.blockchainService.buyShares(logId, buyShareData);

    return result;
  }

  public exportPrivateKey(
    logId: string,
    walletAddress: string,
    walletSecret: string,
  ) {
    return this.blockchainService.exportPrivateKey(
      logId,
      walletAddress,
      walletSecret,
    );
  }

  public async sellShares(
    logId: string,
    sellShareData: SellShareData,
  ): Promise<HttpResponse> {
    const result = await this.blockchainService.sellShares(
      logId,
      sellShareData,
    );

    return result;
  }

  public async fundsTransfer(
    logId: string,
    data: FundsTransferData,
  ): Promise<HttpResponse> {
    const result = await this.blockchainService.fundsTransfer(logId, data);

    return result;
  }

  public async transferToken(
    logId: string,
    data: TokenTransferData,
  ): Promise<HttpResponse> {
    const result = await this.blockchainService.transferToken(logId, data);

    return result;
  }

  public async genNewKey(
    logId: string,
  ): Promise<HttpResponse<GenNewKeyResponse>> {
    return this.blockchainService.genNewKey(logId);
  }

  public async setReferralData(
    logId: string,
    referrerAddress: string,
    refereeAddress: string,
  ): Promise<HttpResponse> {
    return this.blockchainService.setReferralData(
      logId,
      referrerAddress,
      refereeAddress,
    );
  }

  public async getListTokenBalance(
    logId: string,
    userAddress: string,
  ): Promise<HttpResponse> {
    const key = `viewUserListTokenBalance:${userAddress}`;
    const cached = await this.get(key);
    if (cached) {
      this.logger.debug(`[${logId}]: Loaded ${key} from cache successful`);

      return cached;
    }

    const result = await this.blockchainService.getListTokenBalance(
      logId,
      userAddress,
    );
    if (result?.success) await this.set(key, result, DEFAULT_CACHE_TTL);

    return result;
  }

  public async getTokenBalance(
    logId: string,
    userAddress: string,
    tokenAddress: string,
  ): Promise<HttpResponse> {
    const key = `viewUserTokenBalance:${userAddress}:${tokenAddress}`;
    const cached = await this.get(key);
    if (cached) {
      this.logger.debug(`[${logId}]: Loaded ${key} from cache successful`);

      return cached;
    }

    const result = await this.blockchainService.getTokenBalance(
      logId,
      userAddress,
      tokenAddress,
    );
    if (result?.success) await this.set(key, result, DEFAULT_CACHE_TTL);

    return result;
  }

  public async analytics(
    logId: string,
    query: AnalyticFilterDTO,
    userAddress?: string,
  ): Promise<HttpResponse<InvestmentReport>> {
    let key = `viewTradeInvestmentShare:${query.companyAddress}:${query.endDate}`;

    if (userAddress) {
      key = `viewTradeInvestmentShare:${query.companyAddress}:${userAddress}:${query.endDate}`;
    }

    const cached = await this.get(key);
    if (cached) {
      this.logger.debug(`[${logId}]: Loaded ${key} from cache successful`);

      return cached;
    }

    const result = await this.blockchainService.analytics(logId, query);
    if (result?.success) await this.set(key, result, ANALYTIC_CACHE_TTL);

    return result;
  }
}
