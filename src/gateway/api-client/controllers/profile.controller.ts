import { Cache } from 'cache-manager';
import { IsOptional, MaxLength, MinLength } from 'class-validator';
import {
  AuditService,
  HttpResponse,
  bcryptHelper,
  stringUtils,
} from 'mvc-common-toolkit';
import { In } from 'typeorm';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Logger,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';

import { RequestUser } from '@core/decorators/request-user';
import { UsePaginationQuery } from '@core/dto/pagination.dto';
import { ResponseCode } from '@core/dto/response';
import { LogId } from '@core/logging/logging';

import { BlockchainWrapperService } from '@business/blockchain/services/blockchain-wrapper.service';
import {
  EmailUpdatedEvent,
  UserUpdatedEvent,
} from '@business/event/event.model';
import { ImageService } from '@business/image/image.service';
import {
  ChangePasswordDto,
  ChangePinDTO,
  ExportPrivateKeyDTO,
  SetupPinDTO,
  TradeHistoryDTO,
} from '@business/user/user.dto';
import { User, extractPublicInfo } from '@business/user/user.entity';
import { UserService } from '@business/user/user.service';

import {
  APP_EVENT,
  ERR_CODE,
  INJECTION_TOKEN,
  SHARES_TRADE_TYPE,
} from '@shared/constants';

import { AuthGuard } from '../auth/auth.guard';

export class UpdateProfileDto {
  @ApiProperty({
    example: 'Taylor Swift',
  })
  fullname: string;

  @ApiProperty({
    example: 'this is bio content',
  })
  description: string;

  @ApiProperty({
    example: 'singapore',
  })
  location: string;

  @ApiProperty({
    example: 'website',
  })
  website: string;
}

export class UpdateEmailDto {
  @ApiProperty({
    example: 'hello@gmail.com',
    maxLength: 255,
    description: 'must be a valid email',
  })
  @MaxLength(255)
  @MinLength(3)
  email: string;

  @ApiProperty({
    example: '111111',
  })
  @IsOptional()
  @MaxLength(10)
  pinNumber: string;
}

export class ReferralDto {
  @ApiProperty({
    example: '0xaC0786AFF38d8Fbe8dEEA97E40cF7AA07CA07981',
  })
  referral: string;
}

export class ProfilePicture {
  @ApiProperty({
    example: 'https://domain.com/profile.png',
  })
  @MaxLength(200)
  profile_image_url: string;
}

export class CoverPicture {
  @ApiProperty({
    example: 'https://domain.com/profile.png',
  })
  @MaxLength(200)
  profile_banner_url: string;
}

@ApiTags('client/profile')
@Controller('profile')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ProfileController {
  protected logger = new Logger(ProfileController.name);

  constructor(
    private userService: UserService,
    private imageService: ImageService,
    private blockchainService: BlockchainWrapperService,
    protected eventEmitter: EventEmitter2,

    @Inject(CACHE_MANAGER) private cacheService: Cache,
    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {}

  @Get()
  async getProfile(@LogId() logId: string, @RequestUser() user: User) {
    const userId = user.id;
    const cachedProfile = await this.cacheService.get(`user_profile:${userId}`);

    if (cachedProfile) {
      return {
        success: true,
        data: cachedProfile,
      };
    }

    let share = null;
    const sharePriceResult = await this.blockchainService.viewSharesPrice(
      logId,
      user.walletAddress,
    );
    if (sharePriceResult?.success) {
      const { buyPrice, sellPrice } = sharePriceResult.data;
      share = { buyPrice, sellPrice };
    }
    const balance = (
      await this.blockchainService.viewUserBalance(logId, user.walletAddress)
    ).data;
    const tradingVolume = (
      await this.blockchainService.viewUserTradingVolume(
        logId,
        user.walletAddress,
      )
    ).data;
    const earned = (
      await this.blockchainService.viewUserEarnedFees(logId, user.walletAddress)
    ).data;

    const isPinSet = !!user.pinSecret;

    const userProfile = {
      ...extractPublicInfo(user),
      referral: user?.referral,
      share,
      balance,
      tradingVolume,
      earned,
      isPinSet,
    };

    await this.cacheService.set(`user_profile:${userId}`, userProfile, 15000);

    return { success: true, data: userProfile };
  }

  @Patch()
  async updateProfile(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Body() body: UpdateProfileDto,
  ) {
    const { fullname, description, location, website } = body;
    await this.userService.updateById(user.id, {
      fullname,
      description,
      location,
      website,
    });

    return { message: 'Update successful', success: true };
  }

  @Patch('/email')
  async updateEmail(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Body() body: UpdateEmailDto,
  ): Promise<HttpResponse> {
    if (user.pinSecret) {
      if (!body.pinNumber) {
        return {
          success: false,
          code: ResponseCode.BAD_REQUEST,
          message: 'pin is required',
        };
      }

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
    }

    const existedUser = await this.userService.findOne({
      email: body.email.toLowerCase(),
    });

    if (existedUser) {
      return {
        success: false,
        message: 'email already exists',
        code: ResponseCode.CONFLICT,
      };
    }

    await this.userService.updateById(user.id, {
      email: body.email,
    });

    this.eventEmitter.emit(
      APP_EVENT.EMAIL_UPDATED,
      EmailUpdatedEvent.from({
        logId,
        oldEmail: user.email,
        newEmail: body.email,
        userId: user.id,
        createdAt: new Date(),
      }),
    );

    return { message: 'Update email successful', success: true };
  }

  @Patch('profile-image-url')
  async setProfilePicture(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Body() body: ProfilePicture,
  ) {
    const checkNSFWResult = await this.imageService.checkImageNSFW(
      logId,
      body.profile_image_url,
    );

    const { success, data } = checkNSFWResult;

    if (!success || !data.isSafe) {
      return {
        success: false,
        message: 'image is nsfw',
        code: ERR_CODE.IMG_IS_NSFW,
      };
    }

    await this.userService.updateById(user.id, {
      profile_image_url: body.profile_image_url,
    });

    this.eventEmitter.emit(
      APP_EVENT.USER_UPDATED,
      UserUpdatedEvent.from({
        logId,
        userId: user.id,
        createdAt: new Date(),
      }),
    );

    return { success: true };
  }

  @Patch('profile-banner-url')
  async setCoverPicture(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Body() body: CoverPicture,
  ) {
    const checkNSFWResult = await this.imageService.checkImageNSFW(
      logId,
      body.profile_banner_url,
    );

    const { success, data } = checkNSFWResult;

    if (!success || !data.isSafe) {
      return {
        success: false,
        message: 'image is nsfw',
        code: ERR_CODE.IMG_IS_NSFW,
      };
    }

    await this.userService.updateById(user.id, {
      profile_banner_url: body.profile_banner_url,
    });

    this.eventEmitter.emit(
      APP_EVENT.USER_UPDATED,
      UserUpdatedEvent.from({
        logId,
        userId: user.id,
        createdAt: new Date(),
      }),
    );

    return { success: true };
  }

  @Patch('referral')
  async setReferral(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Body() body: ReferralDto,
  ): Promise<HttpResponse> {
    body.referral = body.referral?.toUpperCase();
    if (user.referral) return { success: false, code: ResponseCode.CONFLICT };
    if ([user.walletAddress, user.referral_code].includes(body.referral)) {
      return {
        success: false,
        code: ResponseCode.SELF_REFERRAL_IS_NOT_ALLOWED,
      };
    }

    let refUser = await this.userService.findOne({
      referral_code: body.referral,
    });
    if (!refUser) {
      refUser = await this.userService.getByWalletAddress(body.referral);
    }

    if (!refUser) return { success: false, code: ResponseCode.NOT_FOUND };

    const result = await this.blockchainService.setReferralData(
      logId,
      refUser.walletAddress,
      user.walletAddress,
    );

    if (result.success) {
      await this.userService.updateById(user.id, {
        referral: refUser.referral_code,
      });
    }

    return { success: result.success, message: result.message };
  }

  @UsePaginationQuery()
  @Get('trades')
  async getTransactions(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Query() query: TradeHistoryDTO,
  ) {
    const tradesResult = await this.blockchainService.viewUserTradeHistory(
      logId,
      {
        address: user.walletAddress,
        type: query.type || SHARES_TRADE_TYPE.NORMAL,
      },
      query.limit,
      query.offset,
    );
    if (!tradesResult)
      return { success: false, code: ResponseCode.INTERNAL_SERVER_ERROR };
    const { success, data, code } = tradesResult;

    if (Array.isArray(data?.items)) {
      const { items, totalCount } = data;
      const where = {
        walletAddress: In(items.map((item) => item.ownerAddress.toLowerCase())),
      };
      const allUser = (await this.userService.find({ where })).map(
        extractPublicInfo,
      );

      const rows = await Promise.all(
        items.map(async (trade) => {
          const { ownerAddress } = trade;
          const owner = allUser.find(
            (u) => u.walletAddress === ownerAddress.toLowerCase(),
          );

          return { ...trade, owner };
        }),
      );

      return { success, data: { total: totalCount, rows }, code };
    }

    return { success, data, code };
  }

  @Post('export-private-key')
  async exportPrivateKey(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Body() body: ExportPrivateKeyDTO,
  ) {
    const foundUser = await this.userService.getById(user.id);
    if (!foundUser.pinSecret) {
      return {
        success: false,
        message: 'pin not yet set',
        httpCode: HttpStatus.CONFLICT,
      };
    }

    const validatePinResult = await this.userService.validatePin(
      user.id,
      body.pin,
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

    const { walletSecret, walletAddress } = foundUser;

    const exportResult = await this.blockchainService.exportPrivateKey(
      logId,
      walletAddress,
      walletSecret,
    );

    if (!exportResult.success) {
      return exportResult;
    }

    return {
      success: true,
      data: exportResult.data,
    };
  }

  @Post('pin')
  async setupPin(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Body() body: SetupPinDTO,
  ) {
    const foundUser = await this.userService.getById(user.id);
    if (!foundUser) {
      return {
        success: false,
        message: 'user not found',
        httpCode: HttpStatus.NOT_FOUND,
      };
    }

    if (foundUser.pinSecret) {
      return {
        success: false,
        message: 'pin already set',
        httpCode: HttpStatus.CONFLICT,
      };
    }

    const hashedPin = await bcryptHelper.hash(body.pin);

    await this.userService.updateById(user.id, { pinSecret: hashedPin });

    return {
      success: true,
    };
  }

  @Patch('pin')
  async changePin(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Body() body: ChangePinDTO,
  ): Promise<any> {
    const foundUser = await this.userService.getById(user.id);
    if (!foundUser) {
      return {
        success: false,
        message: 'user not found',
        httpCode: HttpStatus.NOT_FOUND,
      };
    }

    if (!foundUser.pinSecret) {
      return {
        success: false,
        message: 'pin not yet set',
        httpCode: HttpStatus.CONFLICT,
      };
    }

    const validatePinResult = await this.userService.validatePin(
      user.id,
      body.oldPin,
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
            message: 'Old pin is invalid',
            data: { attemptsLeft },
            code: ERR_CODE.INVALID_PIN,
            httpCode: HttpStatus.FORBIDDEN,
          };
    }

    const hashedPin = await bcryptHelper.hash(body.newPin);

    await this.userService.updateById(user.id, { pinSecret: hashedPin });

    return {
      success: true,
    };
  }

  @Patch('change-password')
  async changePassword(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Body() body: ChangePasswordDto,
  ): Promise<HttpResponse> {
    const foundUser = await this.userService.getById(user.id);

    const isOldPasswordValid = await bcryptHelper.compare(
      body.oldPassword,
      foundUser.password,
    );
    if (!isOldPasswordValid) {
      return {
        success: false,
        message: 'old password not correct',
        code: ResponseCode.BAD_REQUEST,
      };
    }

    const errMsg = stringUtils.validatePasswordStrengthWithMessage(
      body.newPassword,
    );
    if (errMsg) {
      return {
        success: false,
        message: errMsg,
        code: ResponseCode.BAD_REQUEST,
      };
    }

    const hashedPassword = await bcryptHelper.hash(body.newPassword);

    await this.userService.updateById(user.id, {
      password: hashedPassword,
    });

    return {
      success: true,
    };
  }
}
