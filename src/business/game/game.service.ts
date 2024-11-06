import { stringUtils } from 'mvc-common-toolkit';

import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { HttpResponse } from '@core/dto/response';
import { HttpWrapperService } from '@core/http/http-wrapper.service';

import { User } from '@business/user/user.entity';
import { UserService } from '@business/user/user.service';

import { ENV_KEY, ERR_CODE, REQUEST_HEADER } from '@shared/constants';

import { UserGameAccountService } from '../user-game-account/user-game-account.service';
import {
  CreateSessionResponse,
  DepositHistoryResponse,
  DepositResponse,
  DepositSettingResponse,
  GetBalanceResponse,
  LoginOrSignupResponse,
  WithdrawHistoryResponse,
  WithdrawResponse,
  WithdrawSettingResponse,
} from './game.response';
import { GameDepositData, GameWithdrawData, PaginationData } from './game.type';

@Injectable()
export class GameService extends HttpWrapperService {
  protected logger = new Logger(GameService.name);
  protected baseURL: string;

  constructor(
    protected httpService: HttpService,
    protected configService: ConfigService,
    protected userGameAccountService: UserGameAccountService,
    protected userService: UserService,
  ) {
    super(httpService);
    this.baseURL = this.configService.getOrThrow(ENV_KEY.GAME_ENDPOINT);
  }

  public async loginOrCreate(
    logId: string,
    user: User,
  ): Promise<HttpResponse<LoginOrSignupResponse>> {
    try {
      let userGameAccount = await this.userGameAccountService.findOne({
        userId: user.id,
      });

      if (!userGameAccount) {
        const passwordGenerated = stringUtils.generatePassword();

        userGameAccount = await this.userGameAccountService.save({
          userId: user.id,
          password: passwordGenerated,
        });
      }

      const response = await this.send<HttpResponse<LoginOrSignupResponse>>(
        logId,
        {
          baseURL: this.baseURL,
          url: '/user/login-or-signup',
          method: 'POST',
          data: {
            email: user.email,
            password: userGameAccount.password,
            walletaddress: user.walletAddress,
            fname: user.walletAddress.slice(-5),
            lname: user.fullname,
            uniqueid: user.id,
          },
          headers: {
            [REQUEST_HEADER.GAME_API_KEY]: this.configService.getOrThrow(
              ENV_KEY.GAME_API_KEY,
            ),
            [REQUEST_HEADER.GAME_API_SECRET]: this.configService.getOrThrow(
              ENV_KEY.GAME_API_SECRET,
            ),
          },
        },
      );

      const { data: body } = response;
      if (!body?.success) {
        return {
          success: false,
          message: body.message,
        };
      }

      if (!userGameAccount.userGameId) {
        await this.userGameAccountService.updateById(userGameAccount.id, {
          userGameId: body.data.user._id,
        });
      }

      return {
        success: true,
        data: body.data,
      };
    } catch (error) {
      this.logger.error(error, error.stack);

      return {
        success: false,
        message: error.message,
      };
    }
  }

  public async createSession(
    logId: string,
    userId: string,
    gameId: string,
  ): Promise<HttpResponse<CreateSessionResponse>> {
    try {
      const response = await this.send<HttpResponse<CreateSessionResponse>>(
        logId,
        {
          baseURL: this.baseURL,
          url: `/game/create-session?gameid=${gameId}`,
          method: 'POST',
          data: {
            uniqueid: userId,
          },
          headers: {
            [REQUEST_HEADER.GAME_API_KEY]: this.configService.getOrThrow(
              ENV_KEY.GAME_API_KEY,
            ),
            [REQUEST_HEADER.GAME_API_SECRET]: this.configService.getOrThrow(
              ENV_KEY.GAME_API_SECRET,
            ),
          },
        },
      );

      const { data: body } = response;

      return {
        success: true,
        data: body as any,
      };
    } catch (error) {
      this.logger.error(error, error.stack);

      return {
        success: false,
        message: error.message,
      };
    }
  }

  public async viewUserGameBalance(
    logId: string,
    gameId: string,
    token: string,
  ): Promise<HttpResponse<GetBalanceResponse>> {
    try {
      const response = await this.send<HttpResponse<GetBalanceResponse>>(
        logId,
        {
          baseURL: this.baseURL,
          url: '/game/get-balance',
          method: 'POST',
          headers: {
            gameid: gameId,
            token,
          },
        },
      );

      const { data: body } = response;
      if (!body?.success) {
        return {
          success: false,
          message: body.message,
        };
      }

      return {
        success: true,
        data: body.data,
      };
    } catch (error) {
      this.logger.error(error, error.stack);

      return {
        success: false,
        message: error.message,
      };
    }
  }

  public async getDepositSetting(
    logId: string,
    token: string,
  ): Promise<HttpResponse<DepositSettingResponse>> {
    try {
      const response = await this.send<HttpResponse<DepositSettingResponse>>(
        logId,
        {
          baseURL: this.baseURL,
          url: '/user/get-deposit-settings',
          method: 'POST',
          headers: {
            token,
          },
        },
      );

      const { data: body } = response;
      if (!body?.success) {
        return {
          success: false,
          message: body.message,
        };
      }

      return {
        success: true,
        data: body.data,
      };
    } catch (error) {
      this.logger.error(error, error.stack);

      return {
        success: false,
        message: error.message,
      };
    }
  }

  public async deposit(
    logId: string,
    token: string,
    data: GameDepositData,
  ): Promise<HttpResponse<DepositResponse>> {
    try {
      const response = await this.send<HttpResponse<DepositResponse>>(logId, {
        baseURL: this.baseURL,
        url: '/user/add-deposit',
        method: 'POST',
        headers: {
          token,
        },
        data,
      });

      const { data: body } = response;
      if (!body?.success) {
        return {
          success: false,
          message: body.message,
        };
      }

      return {
        success: true,
        data: body.data,
      };
    } catch (error) {
      this.logger.error(error, error.stack);

      return {
        success: false,
        message: error.message,
      };
    }
  }

  public async getDepositHistory(
    logId: string,
    token: string,
    data: PaginationData,
  ): Promise<HttpResponse<DepositHistoryResponse>> {
    try {
      const response = await this.send<HttpResponse<DepositHistoryResponse>>(
        logId,
        {
          baseURL: this.baseURL,
          url: '/user/get-all-deposits',
          method: 'POST',
          headers: {
            token,
          },
          data,
        },
      );

      const { data: body } = response;
      if (!body?.success) {
        return {
          success: false,
          message: body.message,
        };
      }

      return {
        success: true,
        data: body.data,
      };
    } catch (error) {
      this.logger.error(error, error.stack);

      return {
        success: false,
        message: error.message,
      };
    }
  }

  public async getWithdrawSetting(
    logId: string,
    token: string,
  ): Promise<HttpResponse<WithdrawSettingResponse>> {
    try {
      const response = await this.send<HttpResponse<WithdrawSettingResponse>>(
        logId,
        {
          baseURL: this.baseURL,
          url: '/user/get-withdraw-settings',
          method: 'POST',
          headers: {
            token,
          },
        },
      );

      const { data: body } = response;
      if (!body?.success) {
        return {
          success: false,
          message: body.message,
        };
      }

      return {
        success: true,
        data: body.data,
      };
    } catch (error) {
      this.logger.error(error, error.stack);

      return {
        success: false,
        message: error.message,
      };
    }
  }

  public async withdraw(
    logId: string,
    token: string,
    data: GameWithdrawData,
  ): Promise<HttpResponse<WithdrawResponse>> {
    try {
      const response = await this.send<HttpResponse<WithdrawResponse>>(logId, {
        baseURL: this.baseURL,
        url: '/user/add-withdraw',
        method: 'POST',
        headers: {
          token,
        },
        data,
      });

      const { data: body } = response;
      if (!body?.success) {
        return {
          success: false,
          message:
            body.message ===
            'There is already an existing Withdraw request pending.'
              ? ERR_CODE.WITHDRAW_REQUEST_PENDING
              : body.message,
        };
      }

      return {
        success: true,
        data: body.data,
      };
    } catch (error) {
      this.logger.error(error, error.stack);

      return {
        success: false,
        message: error.message,
      };
    }
  }

  public async getWithdrawHistory(
    logId: string,
    token: string,
    data: PaginationData,
  ): Promise<HttpResponse<WithdrawHistoryResponse>> {
    try {
      const response = await this.send<HttpResponse<WithdrawHistoryResponse>>(
        logId,
        {
          baseURL: this.baseURL,
          url: '/user/get-all-withdraws',
          method: 'POST',
          headers: {
            token,
          },
          data,
        },
      );

      const { data: body } = response;
      if (!body?.success) {
        return {
          success: false,
          message: body.message,
        };
      }

      return {
        success: true,
        data: body.data,
      };
    } catch (error) {
      this.logger.error(error, error.stack);

      return {
        success: false,
        message: error.message,
      };
    }
  }
}
