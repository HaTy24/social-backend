import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { HttpResponse } from '@core/dto/response';
import { HttpWrapperService } from '@core/http/http-wrapper.service';

import { AccountTypeConfigService } from '@business/account-type-config/account-type-config.service';
import { AnalyticFilterDTO } from '@business/admin/analytic/analytic.dto';

import { ENV_KEY, ERR_CODE } from '@shared/constants';
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
import { BlockchainProfileService } from './bockchain-profile.service';

export interface Trade {
  userAddress: string;
  ownerAddress: string;
  createdAt: string;
  quantity: number;
  action: string;
  amount: string;
}

export interface UserTrade {
  createdAt: string;
  updatedAt: string;
  id: number;
  currency: string;
  userAddress: string;
  quantity: number;
  action: string;
  ownerAddress: string;
  amount: string;
  txHash: string;
  txData: UserTradeTxData;
}

export interface UserTradeTxData {
  isBuy: boolean;
  supply: string;
  ethAmount: string;
  shareAmount: number;
  ownerAddress: string;
  traderAddress: string;
  blockTimestamp: number;
  companyEthAmount: string;
  subjectEthAmount: string;
  communityFeeAmount: string;
}

@Injectable()
export class BlockchainService extends HttpWrapperService {
  protected logger = new Logger(this.constructor.name);
  protected baseURL: string;

  constructor(
    protected httpService: HttpService,
    protected configService: ConfigService,
    protected blockchainProfileService: BlockchainProfileService,
    protected accountTypeConfigService: AccountTypeConfigService,
  ) {
    super(httpService);
    this.baseURL = this.configService.get(ENV_KEY.BLOCKCHAIN_ENDPOINT);
  }

  public async exportPrivateKey(
    logId: string,
    walletAddress: string,
    walletSecret: string,
  ): Promise<HttpResponse<string>> {
    const response = await this.send<HttpResponse<string>>(logId, {
      baseURL: this.baseURL,
      url: '/signatures/export-private-key',
      method: 'POST',
      data: {
        userAddress: walletAddress,
        serverSecret: walletSecret,
      },
    });

    const { data: body } = response;
    if (!body?.success) {
      return {
        success: false,
        message: body.message,
        code: body.code || ERR_CODE.INTERNAL_SERVER_ERROR
      };
    }

    return {
      success: true,
      data: body.data,
    };
  }

  public async viewUserBalance(
    logId: string,
    address: string,
  ): Promise<HttpResponse> {
    const response = await this.send<HttpResponse<string>>(logId, {
      baseURL: this.baseURL,
      url: '/signatures/eth-balance',
      method: 'GET',
      params: {
        address: address,
      },
    });

    const { data: body } = response;
    if (!body?.success || body?.data === undefined || body?.data === null) {
      return {
        success: false,
        message: body.message,
        code: body.code || ERR_CODE.INTERNAL_SERVER_ERROR
      };
    }

    await this.blockchainProfileService.updateByWalletAddress(address, {
      balance: Number(body.data),
    });

    return {
      success: true,
      data: body.data,
    };
  }

  public async genNewKey(
    logId: string,
  ): Promise<HttpResponse<GenNewKeyResponse>> {
    const response = await this.send<HttpResponse<GenNewKeyResponse>>(logId, {
      baseURL: this.baseURL,
      url: '/signatures/new-private-key',
      method: 'POST',
    });

    const { data: body } = response;
    if (!body?.success) {
      return {
        success: false,
        message: body.message,
        code: body.code || ERR_CODE.INTERNAL_SERVER_ERROR
      };
    }

    if (body?.data?.publicKey)
      body.data.publicKey = body.data.publicKey.toLowerCase();

    return {
      success: true,
      data: body.data,
    };
  }

  public async setReferralData(
    logId: string,
    referrerAddress: string,
    refereeAddress: string,
  ): Promise<HttpResponse> {
    const response = await this.send<HttpResponse>(logId, {
      baseURL: this.baseURL,
      url: '/signatures/set-referral',
      method: 'POST',
      data: {
        referrerAddress,
        refereeAddress,
      },
    });

    const { data: body } = response;
    if (!body?.success) {
      return {
        success: false,
        message: body.message,
        code: body.code || ERR_CODE.INTERNAL_SERVER_ERROR
      };
    }

    return {
      success: true,
    };
  }

  public async viewSharesPrice(
    logId: string,
    address: string,
  ): Promise<HttpResponse<ViewSharesPriceResponse>> {
    const response = await this.send<HttpResponse<ViewSharesPriceResponse>>(
      logId,
      {
        baseURL: this.baseURL,
        url: '/signatures/shares-pricing',
        method: 'GET',
        params: { address },
      },
    );

    const { data: body } = response;
    if (!body?.success) {
      return {
        success: false,
        message: body.message,
        code: body.code || ERR_CODE.INTERNAL_SERVER_ERROR
      };
    }

    return {
      success: true,
      data: body.data,
    };
  }

  public async viewUserSharesCount(
    logId: string,
    address: string,
  ): Promise<HttpResponse> {
    const response = await this.send<HttpResponse<ViewUserSharesCountResponse>>(
      logId,
      {
        baseURL: this.baseURL,
        url: `/shares/relationship/${address}`,
        method: 'GET',
      },
    );

    const { data: body } = response;
    if (!body?.success) {
      return {
        success: false,
        message: body.message,
        code: body.code || ERR_CODE.INTERNAL_SERVER_ERROR
      };
    }

    const holder = body.data.holderAddresses.length;
    const sold = body.data.holderAddresses.reduce(
      (sum, item) => sum + item.count,
      0,
    );
    const holding = body.data.holdingAddresses.length;
    const bought = body.data.holdingAddresses.reduce(
      (sum, item) => sum + item.count,
      0,
    );

    await this.blockchainProfileService.updateByWalletAddress(address, {
      holder,
      sold,
      holding,
      bought,
    });

    return {
      success: true,
      data: body.data,
    };
  }

  public async getRecentTrades(
    logId: string,
    offset: number,
    limit: number,
  ): Promise<HttpResponse<{ total: number; rows: Trade[] }>> {
    const response = await this.send<
      HttpResponse<{ total: number; rows: Trade[] }>
    >(logId, {
      baseURL: this.baseURL,
      url: '/transactions/recent-trades',
      method: 'GET',
      params: {
        limit: limit || 10,
        offset: offset || 0,
      },
    });

    const { data: body } = response;
    if (!body?.success) {
      return {
        success: false,
        message: body.message,
        code: body.code || ERR_CODE.INTERNAL_SERVER_ERROR
      };
    }

    return {
      success: true,
      data: body.data,
    };
  }

  public async viewUserTradeHistory(
    logId: string,
    filter: ViewTradeHistoryData,
    limit: number,
    offset: number,
  ): Promise<HttpResponse<{ totalCount: number; items: UserTrade[] }>> {
    const response = await this.send<
      HttpResponse<{ totalCount: number; items: UserTrade[] }>
    >(logId, {
      baseURL: this.baseURL,
      url: '/transactions/trade-history',
      method: 'GET',
      params: {
        limit: limit || 10,
        offset: offset || 0,
        sort: '-createdAt',
        ...filter,
      },
    });

    const { data: body } = response;
    if (!body?.success) {
      return {
        success: false,
        message: body.message,
        code: body.code || ERR_CODE.INTERNAL_SERVER_ERROR
      };
    }

    return {
      success: true,
      data: body.data,
    };
  }

  public async viewUserEarnedFees(
    logId: string,
    address: string,
  ): Promise<HttpResponse<UserEarnedFees>> {
    const response = await this.send<HttpResponse<UserEarnedFees>>(logId, {
      baseURL: this.baseURL,
      url: '/analytics/earned-fees',
      method: 'GET',
      params: {
        userAddress: address,
      },
    });

    const { data: body } = response;
    if (!body?.success) {
      return {
        success: false,
        message: body.message,
        code: body.code || ERR_CODE.INTERNAL_SERVER_ERROR
      };
    }

    if (body?.success && body?.data) {
      const { referralFee, subjectFee } = body.data;
      await this.blockchainProfileService.updateByWalletAddress(address, {
        referralFee: Number(referralFee),
        subjectFee: Number(subjectFee),
      });
    }

    return {
      success: true,
      data: body.data,
    };
  }

  public async viewUserTradingVolume(
    logId: string,
    address: string,
  ): Promise<HttpResponse<string>> {
    const response = await this.send<HttpResponse<string>>(logId, {
      baseURL: this.baseURL,
      url: `/transactions/trading-volume?address=${address}`,
      method: 'GET',
    });

    const { data: body } = response;
    if (!body?.success) {
      return {
        success: false,
        message: body.message,
        code: body.code || ERR_CODE.INTERNAL_SERVER_ERROR
      };
    }

    if (body?.data) {
      await this.blockchainProfileService.updateByWalletAddress(address, {
        tradingVolume: Number(body.data),
      });
    }

    return {
      success: true,
      data: body.data,
    };
  }

  public async buyShares(
    logId: string,
    buyShareData: BuyShareData,
  ): Promise<HttpResponse> {
    const response = await this.send<HttpResponse<string>>(logId, {
      baseURL: this.baseURL,
      url: '/transactions/buy-shares',
      method: 'POST',
      data: buyShareData,
    });

    const { data: body } = response;
    if (!body?.success) {
      return {
        success: false,
        message: body.message,
        code: body.code || ERR_CODE.INTERNAL_SERVER_ERROR
      };
    }

    if (body?.success && body?.data) {
      await this.blockchainProfileService.updateByWalletAddress(
        buyShareData.userAddress,
        {
          lastActivity: new Date(),
        },
      );
    }

    return {
      success: true,
      data: body.data,
    };
  }

  public async sellShares(
    logId: string,
    sellShareData: SellShareData,
  ): Promise<HttpResponse> {
    const response = await this.send<HttpResponse<string>>(logId, {
      baseURL: this.baseURL,
      url: '/transactions/sell-shares',
      method: 'POST',
      data: sellShareData,
    });

    const { data: body } = response;
    if (!body?.success) {
      return {
        success: false,
        message: body.message,
        code: body.code || ERR_CODE.INTERNAL_SERVER_ERROR
      };
    }

    return {
      success: true,
      data: body.data,
    };
  }

  public async fundsTransfer(
    logId: string,
    data: FundsTransferData,
  ): Promise<HttpResponse> {
    const response = await this.send<HttpResponse<string>>(logId, {
      baseURL: this.baseURL,
      url: '/transactions/funds-transfer',
      method: 'POST',
      data,
    });

    const { data: body } = response;
    if (!body?.success) {
      return {
        success: false,
        message: body.message,
        code: body.code || ERR_CODE.INTERNAL_SERVER_ERROR
      };
    }

    return {
      success: true,
      data: body.data,
    };
  }

  public async transferToken(
    logId: string,
    data: TokenTransferData,
  ): Promise<HttpResponse> {
    const response = await this.send<HttpResponse<string>>(logId, {
      baseURL: this.baseURL,
      url: '/transactions/token-transfer',
      method: 'POST',
      data,
    });

    const { data: body } = response;
    if (!body?.success) {
      return {
        success: false,
        message: body.message,
        code: body.code || ERR_CODE.INTERNAL_SERVER_ERROR
      };
    }

    return {
      success: true,
      data: body.data,
    };
  }

  public async getListTokenBalance(
    logId: string,
    userAddress: string,
  ): Promise<HttpResponse> {
    const response = await this.send<HttpResponse<string>>(logId, {
      baseURL: this.baseURL,
      url: `/signatures/token-balances/common?userAddress=${userAddress}`,
      method: 'GET',
    });

    const { data: body } = response;
    if (!body?.success) {
      return {
        success: false,
        message: body.message,
        code: body.code || ERR_CODE.INTERNAL_SERVER_ERROR
      };
    }

    return {
      success: true,
      data: body.data,
    };
  }

  public async getTokenBalance(
    logId: string,
    userAddress: string,
    tokenAddress: string,
  ): Promise<HttpResponse> {
    const response = await this.send<HttpResponse<string>>(logId, {
      baseURL: this.baseURL,
      url: `/signatures/token-balances/${tokenAddress}?userAddress=${userAddress}`,
      method: 'GET',
    });

    const { data: body } = response;
    if (!body?.success) {
      return {
        success: false,
        message: body.message,
        code: body.code || ERR_CODE.INTERNAL_SERVER_ERROR
      };
    }

    return {
      success: true,
      data: body.data,
    };
  }

  public async analytics(
    logId: string,
    query: AnalyticFilterDTO,
  ): Promise<HttpResponse<InvestmentReport>> {
    const response = await this.send<HttpResponse<string>>(logId, {
      baseURL: this.baseURL,
      url: `/analytics/reports?${new URLSearchParams(query as any).toString()}`,
      method: 'GET',
    });

    const { data: body } = response;
    if (!body?.success) {
      return {
        success: false,
        message: body.message,
        code: body.code || ERR_CODE.INTERNAL_SERVER_ERROR
      };
    }

    return {
      success: true,
      data: body.data,
    };
  }
}
