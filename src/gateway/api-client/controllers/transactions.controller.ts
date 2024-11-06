import { AccountTypeConfigService } from '@business/account-type-config/account-type-config.service';
import { BlockchainWrapperService } from '@business/blockchain/services/blockchain-wrapper.service';
import { FundsTransferredEvent, SharesBoughtEvent, SharesSoldEvent, TokenTransferredEvent, } from '@business/event/event.model';
import { ACCOUNT_TYPE, User, extractPublicInfo, } from '@business/user/user.entity';
import { UserService } from '@business/user/user.service';
import { RequestUser } from '@core/decorators/request-user';
import { PaginationDTO, UsePaginationQuery } from '@core/dto/pagination.dto';
import { ResponseCode } from '@core/dto/response';
import { LogId } from '@core/logging/logging';
import { Body, Controller, Get, HttpStatus, Inject, Logger, Post, Query, UseGuards, } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { APP_EVENT, ERR_CODE, INJECTION_TOKEN } from '@shared/constants';
import { IsNumber, IsOptional, MaxLength, MinLength } from 'class-validator';
import { AuditService, HttpResponse } from 'mvc-common-toolkit';
import { In } from 'typeorm';
import { AuthGuard } from '../auth/auth.guard';

class TargetUser {
  @ApiProperty({
    example: '638633f2-9961-43bf-b1ec-d735173c9e95',
  })
  @MaxLength(100)
  @MinLength(1)
  targetUserId: string;

  @ApiProperty({ example: 2 })
  @IsOptional()
  @IsNumber()
  quantity: number;

  @ApiProperty({
    example: '111111',
  })
  @MaxLength(10)
  pinNumber: string;
}

class TransactionCreateDto {
  @ApiProperty({
    example: '0.00003',
  })
  amount: string;

  @ApiProperty({
    example: '0xb3AAB545b43AC7e162de699f9d2B44668d9EbDbf',
  })
  toAddress: string;

  @ApiProperty({
    example: '111111',
  })
  @MaxLength(10)
  pinNumber: string;
}

class TransferTokenDto {
  @ApiProperty({
    example: '10',
  })
  @MinLength(1)
  @MaxLength(100)
  amount: string;

  @ApiProperty({
    example: '0xb3AAB545b43AC7e162de699f9d2B44668d9EbDbf',
  })
  @MaxLength(100)
  toAddress: string;

  @ApiProperty({
    example: 'USC',
  })
  @MaxLength(10)
  token: string;

  @ApiProperty({
    example: '0xd34BccbB0AE0866d16EAc857a6e5dF9dBD9f97ce',
  })
  @MaxLength(100)
  tokenAddress: string;

  @ApiProperty({
    example: '111111',
  })
  @MaxLength(10)
  pinNumber: string;
}

@ApiTags('client/transactions')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('transactions')
export class TransactionController {
  protected logger = new Logger(this.constructor.name);

  constructor(
    protected blockchainWrapperService: BlockchainWrapperService,
    protected userService: UserService,
    protected eventEmitter: EventEmitter2,
    protected accountTypeConfigService: AccountTypeConfigService,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {}

  @Post('buy')
  async buyUserShare(
    @LogId() logId: string,
    @RequestUser() buyer: User,
    @Body() body: TargetUser,
  ): Promise<HttpResponse> {
    const owner = await this.userService.getById(body.targetUserId);

    const validatePinResult = await this.userService.validatePin(
      buyer.id,
      body.pinNumber,
    );

    if (!validatePinResult.success) {
      return validatePinResult;
    }

    const { isValid, isLocked, attemptsLeft } = validatePinResult.data;

    if (!isValid) {
      return isLocked
        ? {
            success: false,
            message: 'you have been locked!',
            code: ERR_CODE.USER_LOCKED,
            httpCode: HttpStatus.FORBIDDEN,
          }
        : {
            success: false,
            message: 'Invalid PIN',
            data: { attemptsLeft },
            code: ERR_CODE.INVALID_PIN,
            httpCode: HttpStatus.FORBIDDEN,
          };
    }

    let buyResponse = null;

    switch (owner.accountType) {
      case ACCOUNT_TYPE.NORMAL:
        buyResponse = await this.blockchainWrapperService.buyShares(logId, {
          quantity: 1,
          txFee: "0",
          userAddress: buyer.walletAddress,
          serverSecret: buyer.walletSecret,
          destinationAddress: owner.walletAddress,
        });

        break;

      case ACCOUNT_TYPE.INVESTMENT:
        // eslint-disable-next-line no-case-declarations
        const accountTypeConfig = await this.accountTypeConfigService.findOne(
          {
            userId: owner.id,
          },
        );

        buyResponse = await this.blockchainWrapperService.buyShares(logId, {
          quantity: body.quantity,
          type: owner.accountType,
          price: accountTypeConfig.metadata.sharePrice,
          txFee: accountTypeConfig.metadata.txFee || "0",
          userAddress: buyer.walletAddress,
          serverSecret: buyer.walletSecret,
          destinationAddress: owner.walletAddress,
        });

        break;

      default:
        return {
          success: false,
          message: 'share type not supported',
        };
    }

    if (!buyResponse.success) return buyResponse;

    await this.userService.updateById(owner.id, {
      shared: owner.shared + (Number(body.quantity) || 1),
    });

    this.eventEmitter.emit(
      APP_EVENT.SHARE_BOUGHT,
      SharesBoughtEvent.from({
        logId,
        buyerId: buyer.id,
        buyerAddress: buyer.walletAddress,
        buyerProfileImage: buyer.profile_image_url,
        buyerTwitterScreenName: buyer.twitterScreenName,
        ownerId: owner.id,
        ownerAddress: owner.walletAddress,
        ownerProfileImage: owner.profile_image_url,
        ownerTwitterScreenName: owner.twitterScreenName,
        createdAt: new Date(),
        txHash: buyResponse.data?.txHash,
        quantity: body.quantity || 1,
        buyPrice: buyResponse.data?.buyPrice,
      }),
    );

    const { success, data, code } = buyResponse;

    return { success, data, code };
  }

  @Post('sell')
  async sellUserShare(
    @LogId() logId: string,
    @RequestUser() seller: User,
    @Body() body: TargetUser,
  ) {
    const owner = await this.userService.getById(body.targetUserId);

    const validatePinResult = await this.userService.validatePin(
      seller.id,
      body.pinNumber,
    );

    if (!validatePinResult.success) {
      return validatePinResult;
    }

    const { isValid, isLocked, attemptsLeft } = validatePinResult.data;

    if (!isValid) {
      return isLocked
        ? {
            success: false,
            code: ERR_CODE.USER_LOCKED,
            message: 'you have been locked!',
            httpCode: HttpStatus.FORBIDDEN,
          }
        : {
            success: false,
            message: 'Invalid PIN',
            data: { attemptsLeft },
            code: ERR_CODE.INVALID_PIN,
            httpCode: HttpStatus.FORBIDDEN,
          };
    }

    let sellResponse = null;

    switch (owner.accountType) {
      case ACCOUNT_TYPE.NORMAL:
        sellResponse = await this.blockchainWrapperService.sellShares(logId, {
          quantity: 1,
          txFee: "0",
          userAddress: seller.walletAddress,
          serverSecret: seller.walletSecret,
          destinationAddress: owner.walletAddress,
        });

        break;

      case ACCOUNT_TYPE.INVESTMENT:
        // eslint-disable-next-line no-case-declarations
        const accountTypeConfig = await this.accountTypeConfigService.findOne(
          {
            userId: owner.id,
          },
        );

        sellResponse = await this.blockchainWrapperService.sellShares(logId, {
          quantity: body.quantity,
          type: owner.accountType,
          price: accountTypeConfig.metadata.sharePrice,
          txFee: "0",
          userAddress: seller.walletAddress,
          serverSecret: owner.walletSecret,
          destinationAddress: owner.walletAddress,
        });

        break;

      default:
        return {
          success: false,
          message: 'share type not supported',
        };
    }

    if (!sellResponse.success) return sellResponse;

    await this.userService.updateById(owner.id, {
      shared: owner.shared - (Number(body.quantity) || 1),
    });

    this.eventEmitter.emit(
      APP_EVENT.SHARE_SOLD,
      SharesSoldEvent.from({
        logId,
        sellerId: seller.id,
        sellerAddress: seller.walletAddress,
        sellerProfileImage: seller.profile_image_url,
        sellerTwitterScreenName: seller.twitterScreenName,
        ownerId: owner.id,
        ownerAddress: owner.walletAddress,
        ownerProfileImage: owner.profile_image_url,
        ownerTwitterScreenName: owner.twitterScreenName,
        createdAt: new Date(),
        txHash: sellResponse.data?.txHash,
        quantity: body.quantity || 1,
        sellPrice: sellResponse.data?.sellPrice,
      }),
    );

    const { success, data, code } = sellResponse;

    return { success, data, code };
  }

  @Post('transfer')
  async transfer(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Body() body: TransactionCreateDto,
  ) {
    const validatePinResult = await this.userService.validatePin(
      user.id,
      body.pinNumber,
    );

    if (!validatePinResult.success) {
      return validatePinResult;
    }

    const { isValid, isLocked, attemptsLeft } = validatePinResult.data;

    if (!isValid) {
      return isLocked
        ? {
            success: false,
            code: ERR_CODE.USER_LOCKED,
            message: 'you have been locked!',
            httpCode: HttpStatus.FORBIDDEN,
          }
        : {
            success: false,
            message: 'Invalid PIN',
            data: { attemptsLeft },
            code: ERR_CODE.INVALID_PIN,
            httpCode: HttpStatus.FORBIDDEN,
          };
    }

    const result = await this.blockchainWrapperService.fundsTransfer(logId, {
      fromAddress: user.walletAddress,
      toAddress: body.toAddress,
      amount: body.amount,
      serverSecret: user.walletSecret,
    });

    if (!result)
      return { success: false, code: ResponseCode.INTERNAL_SERVER_ERROR };

    const toUserInfo = await this.userService.getByWalletAddress(
      body.toAddress,
    );

    this.eventEmitter.emit(
      APP_EVENT.FUNDS_TRANSFERRED,
      FundsTransferredEvent.from({
        logId,
        fromUserId: user.id,
        fromAddress: user.walletAddress,
        fromUserProfileImage: user.profile_image_url,
        fromUserTwitterScreenName: user.twitterScreenName,
        toUserId: toUserInfo.id,
        toAddress: body.toAddress,
        toUserProfileImage: toUserInfo.profile_image_url,
        toUserTwitterScreenName: toUserInfo.twitterScreenName,
        amount: body.amount,
        createdAt: new Date(),
        txHash: result.data?.txHash,
      }),
    );

    const { success, data, code } = result;

    return { success, data, code };
  }

  @Post('token-transfer')
  async transferToken(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Body() body: TransferTokenDto,
  ) {
    const validatePinResult = await this.userService.validatePin(
      user.id,
      body.pinNumber,
    );

    if (!validatePinResult.success) {
      return validatePinResult;
    }

    const { isValid, isLocked, attemptsLeft } = validatePinResult.data;

    if (!isValid) {
      return isLocked
        ? {
            success: false,
            code: ERR_CODE.USER_LOCKED,
            message: 'you have been locked!',
            httpCode: HttpStatus.FORBIDDEN,
          }
        : {
            success: false,
            message: 'Invalid PIN',
            data: { attemptsLeft },
            code: ERR_CODE.INVALID_PIN,
            httpCode: HttpStatus.FORBIDDEN,
          };
    }

    const result = await this.blockchainWrapperService.transferToken(logId, {
      tokenAddress: body.tokenAddress,
      fromAddress: user.walletAddress,
      toAddress: body.toAddress,
      amount: body.amount,
      serverSecret: user.walletSecret,
    });
    if (!result)
      return { success: false, code: ResponseCode.INTERNAL_SERVER_ERROR };

    const toUserInfo = await this.userService.getByWalletAddress(
      body.toAddress,
    );

    this.eventEmitter.emit(
      APP_EVENT.TOKEN_TRANSFERRED,
      TokenTransferredEvent.from({
        logId,
        fromUserId: user.id,
        fromUserProfileImage: user.profile_image_url,
        fromUserTwitterScreenName: user.twitterScreenName,
        fromAddress: user.walletAddress,
        toUserId: toUserInfo.id,
        toAddress: body.toAddress,
        toUserProfileImage: toUserInfo.profile_image_url,
        toUserTwitterScreenName: toUserInfo.twitterScreenName,
        token: body.token,
        tokenAddress: body.tokenAddress,
        amount: body.amount,
        createdAt: new Date(),
        txHash: result.data?.txHash,
      }),
    );

    const { success, data, code } = result;

    return { success, data, code };
  }

  @UsePaginationQuery()
  @Get('recent')
  public async getRecents(
    @LogId() logId: string,
    @Query() query: PaginationDTO,
  ) {
    const result = await this.blockchainWrapperService.getRecentTrades(
      logId,
      query.offset,
      query.limit,
    );
    if (!result)
      return { success: false, code: ResponseCode.INTERNAL_SERVER_ERROR };

    const { success, code, data } = result;
    if (!success || !Array.isArray(data?.rows)) return { success, code };

    const traces = data.rows;
    const total = data.total;
    const allAddress = traces
      .map((item) => item.ownerAddress.toLowerCase())
      .concat(traces.map((item) => item.userAddress.toLowerCase()));
    const where = { walletAddress: In(allAddress) };
    const allUser = (await this.userService.find({ where })).map(
      extractPublicInfo,
    );

    const rows = traces.map((trade) => {
      const {
        userAddress,
        ownerAddress,
        createdAt,
        quantity,
        action,
        amount,
      } = trade;
      const user = allUser.find(
        (u) => u.walletAddress === userAddress.toLowerCase(),
      );
      const owner = allUser.find(
        (u) => u.walletAddress === ownerAddress.toLowerCase(),
      );
      return { user, owner, createdAt, quantity, action, amount };
    });

    return { success, data: { total, rows }, code };
  }
}
