import {
  AuditService,
  ErrorLog,
  OperationResult,
  bcryptHelper,
  stringUtils,
} from 'mvc-common-toolkit';
import { firstValueFrom } from 'rxjs';
import { ILike } from 'typeorm';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { HttpResponse, ResponseCode } from '@core/dto/response';

import {
  DEFAULT_PROFILE_BANNER_URL,
  DEFAULT_PROFILE_IMAGE_URL,
} from '@business/user/user.entity';
import { UserService } from '@business/user/user.service';

import {
  APP_ACTION,
  ENV_KEY,
  INJECTION_TOKEN,
  SOCIAL_TYPE,
} from '@shared/constants';
import { tryParseJSON } from '@shared/helpers/object-helper';
import {
  cleanAlphaNumericWithSpace,
  cleanHTML,
} from '@shared/helpers/text-cleaning-helper';
import { ValidateAGCReferenceIdResult } from '@shared/types';

import * as tripleDesHelper from '../../shared/helpers/triple-des-helper';
import { LoginDto, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  protected logger = new Logger(this.constructor.name);

  constructor(
    protected configService: ConfigService,
    protected userService: UserService,
    protected httpClient: HttpService,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {}

  public async checkUniqueEmailAndUserName({
    email,
    userName,
  }): Promise<HttpResponse> {
    const foundUserByEmail = await this.userService.findOne({
      email: ILike(email),
    });
    if (foundUserByEmail) {
      return {
        success: false,
        message: 'email already registered',
        code: ResponseCode.CONFLICT,
      };
    }

    const foundUserByUserName = await this.userService.findOne({
      twitterScreenName: ILike(userName),
    });
    if (foundUserByUserName) {
      return {
        success: false,
        message: 'username already registered',
        code: ResponseCode.CONFLICT,
      };
    }

    return { success: true };
  }

  public async verifyAgcReferenceId(
    referenceId: string,
  ): Promise<OperationResult<{ isValid: boolean }>> {
    const membersiteURL = this.configService.getOrThrow(
      ENV_KEY.AUGMENTLABS_MEMBER_API_URL,
    );
    const apiSecret = this.configService.getOrThrow(
      ENV_KEY.AUGMENTLABS_MEMBER_API_SECRET,
    );
    const endpoint = `${membersiteURL}/Login/ValidateReferenceId?referenceid=${referenceId}`;

    const response = await firstValueFrom(
      this.httpClient.post(
        endpoint,
        {},
        {
          headers: {
            Authorization: `Bearer ${apiSecret}`,
          },
        },
      ),
    );

    if (response.status >= 400) {
      throw new Error(response.data?.message || response.data);
    }

    const result = response.data as ValidateAGCReferenceIdResult;

    if (!result.success) {
      return {
        success: false,
        message: 'error from augmentlabs',
      };
    }

    if (!result.data) {
      return {
        success: false,
        message: 'missing data from augmentlabs',
      };
    }

    return {
      success: true,
      data: {
        isValid: !!result.data.isvalid,
      },
    };
  }

  public validateAgcSignature(signature: string): any {
    const decrypted = tripleDesHelper.decrypt(
      signature,
      this.configService.get(ENV_KEY.AUGMENTLABS_SECRET_TOKEN),
    );

    return tryParseJSON(decrypted);
    // return cryptoHelpers.sha512Verify(signature, JSON.stringify({email: originalEmail, referenceid}), this.configService.get(ENV_KEY.AUGMENTLABS_SECRET_TOKEN))
  }

  public async register(
    logId: string,
    data: RegisterDto,
    { publicKey, serverSecret }: { publicKey: string; serverSecret: string },
  ): Promise<HttpResponse> {
    try {
      const passwordHashed = await bcryptHelper.hash(data.password);

      const cleanedFullName = cleanAlphaNumericWithSpace(data.fullName);
      if (!cleanedFullName) {
        return {
          success: false,
          message: 'invalid full name',
          code: ResponseCode.BAD_REQUEST,
        };
      }

      const parsedMetadata = tryParseJSON(data.metadata);

      const newUser = await this.userService.save({
        email: data.email.toLowerCase(),
        walletAddress: publicKey,
        walletSecret: serverSecret,
        fullname: cleanedFullName,
        profile_image_url: DEFAULT_PROFILE_IMAGE_URL,
        profile_banner_url: DEFAULT_PROFILE_BANNER_URL,
        twitterScreenName: data.userName.toLowerCase(),
        socialType: SOCIAL_TYPE.EMAIL,
        password: passwordHashed,
        isVerifiedEmail: false,
        website: cleanHTML(data.website) || null,
        description: cleanHTML(data.description) || null,
        metadata: parsedMetadata || {
          type: 'common',
          referenceid: '',
        },
      });

      return {
        success: true,
        data: newUser,
      };
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          logId: logId,
          message: error.message,
          payload: data,
          action: APP_ACTION.REGISTER_WITH_EMAIL_PASSWORD,
        }),
      );

      return { success: false };
    }
  }

  public async login(logId: string, data: LoginDto): Promise<HttpResponse> {
    try {
      const user = await this.userService.findOne({ email: ILike(data.email) });
      if (!user) {
        return {
          success: false,
          message: 'user not found',
          code: ResponseCode.NOT_FOUND,
        };
      }

      const isSocialTypeEmail = user.isSocialTypeEmail();
      if (!isSocialTypeEmail) {
        return {
          success: false,
          message: 'invalid login method',
          code: ResponseCode.BAD_REQUEST,
        };
      }

      if (!user.isVerifiedEmail) {
        return {
          success: false,
          message: 'user not verified email',
          code: ResponseCode.BAD_REQUEST,
        };
      }

      const isPasswordValid = await bcryptHelper.compare(
        data.password,
        user.password,
      );
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'password incorrect',
          code: ResponseCode.UNAUTHORIZED,
        };
      }

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          logId: logId,
          message: error.message,
          payload: data,
          action: APP_ACTION.LOGIN_WITH_EMAIL_PASSWORD,
        }),
      );

      return { success: false };
    }
  }

  public generateOtpToken(): string {
    return stringUtils.generatePassword(32).replace(/[^a-zA-Z ]/g, '');
  }
}
