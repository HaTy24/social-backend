import { BlockchainWrapperService } from '@business/blockchain/services/blockchain-wrapper.service';
import { GameTransactionService } from '@business/game-transaction/game-transaction.service';
import { GameDepositHistoryDTO, GameTransactionDTO, GameWithdrawHistoryDTO, } from '@business/game/game.dto';
import { GameService } from '@business/game/game.service';
import { User } from '@business/user/user.entity';
import { RequestUser } from '@core/decorators/request-user';
import { HttpResponse } from '@core/dto/response';
import { LogId } from '@core/logging/logging';
import { Body, Controller, Get, Inject, Logger, Param, Post, Query, UseGuards, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { APP_ACTION, ENV_KEY, GAME_DEPOSIT_STATUS, GAME_DEPOSIT_STATUS_NUMBER, GAME_TRANSACTION_TYPE, GAME_WITHDRAW_STATUS, GAME_WITHDRAW_STATUS_NUMBER, INJECTION_TOKEN, } from '@shared/constants';
import { AuditService, ErrorLog } from 'mvc-common-toolkit';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('client/game')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('games')
export class GameController {
  protected logger = new Logger(GameController.name);

  constructor(
    protected gameService: GameService,
    protected blockchainWrapperService: BlockchainWrapperService,
    protected configService: ConfigService,
    protected gameTransactionsService: GameTransactionService,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {}

  @Post('login-or-create')
  public async loginOrCreate(
    @LogId() logId: string,
    @RequestUser() user: User,
  ): Promise<HttpResponse> {
    const loginResult = await this.gameService.loginOrCreate(logId, user);

    if (!loginResult.success) {
      return loginResult;
    }

    return {
      success: true,
      data: loginResult.data,
    };
  }

  @Post('create-session/:gameId')
  public async createSession(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Param('gameId') gameId: string,
  ): Promise<HttpResponse> {
    const createSessionResult = await this.gameService.createSession(
      logId,
      user.id,
      gameId,
    );

    if (!createSessionResult.success) {
      return createSessionResult;
    }

    return {
      success: true,
      data: createSessionResult.data,
    };
  }

  @Get(':gameId/balance')
  public async viewUserGameBalance(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Param('gameId') gameId: string,
  ): Promise<HttpResponse> {
    const loginResult = await this.gameService.loginOrCreate(logId, user);

    if (!loginResult.success) {
      return loginResult;
    }
    const gameProfileResult = await this.gameService.viewUserGameBalance(
      logId,
      gameId,
      loginResult.data.tokens.access.token,
    );

    if (!gameProfileResult.success) {
      return gameProfileResult;
    }

    return {
      success: true,
      data: gameProfileResult.data,
    };
  }

  @Post('deposit')
  public async deposit(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Body() dto: GameTransactionDTO,
  ): Promise<HttpResponse> {
    const loginResult = await this.gameService.loginOrCreate(logId, user);

    if (!loginResult.success) {
      return loginResult;
    }

    const gameTransaction = await this.gameTransactionsService.save({
      userId: user.id,
      transactionType: GAME_TRANSACTION_TYPE.DEPOSIT,
      status: GAME_DEPOSIT_STATUS.PENDING,
      amount: dto.amount,
    });

    const transferTokenResult =
      await this.blockchainWrapperService.transferToken(logId, {
        tokenAddress: this.configService.getOrThrow(ENV_KEY.USDT_TOKEN_ADDESS),
        fromAddress: user.walletAddress,
        toAddress: this.configService.getOrThrow(ENV_KEY.MULTISIG_ADDRESS),
        amount: dto.amount.toString(),
        serverSecret: user.walletSecret,
      });

    if (!transferTokenResult.success) {
      await this.gameTransactionsService.updateById(gameTransaction.id, {
        status: GAME_DEPOSIT_STATUS.FAILED,
        description: {
          errorSide: "blockchain_service",
          error: transferTokenResult.message
        },
      });

      this.auditService.emitLog(
        new ErrorLog({
          logId,
          message: transferTokenResult.message,
          action: APP_ACTION.DEPOSIT_TO_GAME,
          payload: dto,
        }),
      );

      return transferTokenResult;
    }

    await this.gameTransactionsService.updateById(gameTransaction.id, {
      txId: transferTokenResult.data.txHash,
    });

    const depositResult = await this.gameService.deposit(
      logId,
      loginResult.data.tokens.access.token,
      {
        refcode: logId,
        txnid: transferTokenResult.data.txHash,
        userusdtwallet: user.walletAddress,
        amttoinvest: dto.amount,
      },
    );

    if (!depositResult.success) {
      await this.gameTransactionsService.updateById(gameTransaction.id, {
        status: GAME_DEPOSIT_STATUS.FAILED,
        description: {
          errorSide: "game_service",
          error: depositResult.message
        },
      });

      this.auditService.emitLog(
        new ErrorLog({
          logId,
          message: depositResult.message,
          action: APP_ACTION.DEPOSIT_TO_GAME,
          payload: dto,
        }),
      );

      return depositResult;
    }

    const refCode = depositResult.data.deposit.refcode || `${depositResult.data.deposit.addon}_${depositResult.data.deposit.userid}`;

    await this.gameTransactionsService.updateById(gameTransaction.id, {
      refCode,
      status: GAME_DEPOSIT_STATUS.SUBMITTED,
    });

    return {
      success: true,
      data: depositResult.data,
    };
  }

  @Post('withdraw')
  public async withdraw(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Body() dto: GameTransactionDTO,
  ): Promise<HttpResponse> {
    const loginResult = await this.gameService.loginOrCreate(logId, user);

    if (!loginResult.success) {
      return loginResult;
    }

    const gameTransaction = await this.gameTransactionsService.save({
      userId: user.id,
      transactionType: GAME_TRANSACTION_TYPE.WITHDRAW,
      status: GAME_WITHDRAW_STATUS.PENDING,
      amount: dto.amount,
    });

    const withdrawResult = await this.gameService.withdraw(
      logId,
      loginResult.data.tokens.access.token,
      {
        refcode: logId,
        wdamt: dto.amount,
        userusdtwallet: user.walletAddress,
      },
    );

    if (!withdrawResult.success) {
      await this.gameTransactionsService.updateById(gameTransaction.id, {
        status: GAME_WITHDRAW_STATUS.FAILED,
        description: {
          errorSide: "game_service",
          error: withdrawResult.message
        },
      });

      this.auditService.emitLog(
        new ErrorLog({
          logId,
          message: withdrawResult.message,
          action: APP_ACTION.WITHDRAW_FROM_GAME,
          payload: dto,
        }),
      );

      return withdrawResult;
    }

    const refCode = withdrawResult.data.withdraw.refcode || `${withdrawResult.data.withdraw.addon}_${withdrawResult.data.withdraw.userid}`;

    await this.gameTransactionsService.updateById(gameTransaction.id, {
      refCode,
      status: GAME_WITHDRAW_STATUS.SUBMITTED,
    });

    return {
      success: true,
      data: withdrawResult.data,
    };
  }

  @Get('deposit-history')
  public async depositHistory(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Query() dto: GameDepositHistoryDTO,
  ): Promise<HttpResponse> {
    const loginResult = await this.gameService.loginOrCreate(logId, user);

    if (!loginResult.success) {
      return loginResult;
    }

    const depositHistoryResult = await this.gameService.getDepositHistory(
      logId,
      loginResult.data.tokens.access.token,
      {
        page: dto.offset / dto.limit + 1,
        limit: dto.limit,
        sort: dto.sort,
      },
    );

    if (!depositHistoryResult.success) {
      return depositHistoryResult;
    }

    const { docs, page, totalPages, totalDocs } = depositHistoryResult.data;

    const depositHistoryMapped = await Promise.all(
      docs.map(async (history) => {
        const refCode = history.refcode || `${history.addon}_${history.userid}`;
        const depositHistory = await this.gameTransactionsService.findOne({
          refCode,
        });

        // Convert status number to status string
        const status = Object.keys(GAME_DEPOSIT_STATUS_NUMBER).find(
          (key) => GAME_DEPOSIT_STATUS_NUMBER[key] === history.statusid,
        );

        if (
          depositHistory &&
          GAME_DEPOSIT_STATUS_NUMBER[depositHistory.status] !== history.statusid
        ) {
          await this.gameTransactionsService.updateById(depositHistory.id, {
            status,
          });
        }

        return {
          ...history,
          status,
        };
      }),
    );

    return {
      success: true,
      data: {
        items: depositHistoryMapped,
        page,
        totalPages,
        totalDocs,
      },
    };
  }

  @Get('withdraw-history')
  public async withdrawHistory(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Query() dto: GameWithdrawHistoryDTO,
  ): Promise<HttpResponse> {
    const loginResult = await this.gameService.loginOrCreate(logId, user);

    if (!loginResult.success) {
      return loginResult;
    }

    const withdrawHistoryResult = await this.gameService.getWithdrawHistory(
      logId,
      loginResult.data.tokens.access.token,
      {
        page: dto.offset / dto.limit + 1,
        limit: dto.limit,
        sort: dto.sort,
      },
    );

    if (!withdrawHistoryResult.success) {
      return withdrawHistoryResult;
    }

    const { docs, page, totalPages, totalDocs } = withdrawHistoryResult.data;

    const withdrawHistoryMapped = await Promise.all(
      docs.map(async (history) => {
        const refCode = history.refcode || `${history.addon}_${history.userid}`;
        const withdrawHistory = await this.gameTransactionsService.findOne({
          refCode,
        });

        if (history.statusid === GAME_WITHDRAW_STATUS_NUMBER.completed) {
          if (history.txnid) {
            await this.gameTransactionsService.updateById(
              withdrawHistory.id,
              {
                txId: history.txnid,
              },
            );
          } else {
            this.auditService.emitLog(
              new ErrorLog({
                logId,
                message: 'withdraw does not return transaction hash',
                action: APP_ACTION.VIEW_WITHDRAW_HISTORY,
                payload: dto,
              }),
            );
          }
        }

        // Convert status number to status string
        const status = Object.keys(GAME_WITHDRAW_STATUS_NUMBER).find(
          (key) => GAME_WITHDRAW_STATUS_NUMBER[key] === history.statusid,
        );

        if (
          withdrawHistory &&
          GAME_WITHDRAW_STATUS_NUMBER[withdrawHistory.status] !== history.statusid
        ) {
          await this.gameTransactionsService.updateById(withdrawHistory.id, {
            status,
          });
        }

        return {
          ...history,
          status,
        };
      }),
    );

    return {
      success: true,
      data: {
        items: withdrawHistoryMapped,
        page,
        totalPages,
        totalDocs,
      },
    };
  }
}
