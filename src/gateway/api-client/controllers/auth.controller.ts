import * as ejs from 'ejs';
import { readFileSync } from 'fs';
import {
  AuditService,
  HttpResponse,
  MailService,
  bcryptHelper,
  stringUtils,
} from 'mvc-common-toolkit';
import { UserService } from 'src/business/user/user.service';
import { ILike } from 'typeorm';

import { Body, Controller, Get, Inject, Logger, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ApiTags } from '@nestjs/swagger';

import { ResponseCode } from '@core/dto/response';
import { LogId } from '@core/logging/logging';

import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResendEmailDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from '@business/auth/auth.dto';
import { AuthService } from '@business/auth/auth.service';
import { UserUpdatedEvent } from '@business/event/event.model';
import {
  DEFAULT_PROFILE_BANNER_URL,
  extractPublicInfo,
  genReferralCode,
} from '@business/user/user.entity';

import {
  APP_EVENT,
  EMAIL_TYPE,
  ENV_KEY,
  ERR_CODE,
  INJECTION_TOKEN,
  MAX_SEND_EMAIL_RECORDS,
  SOCIAL_TYPE,
} from '@shared/constants';
import { tryParseJSON } from '@shared/helpers/object-helper';
import { randomUserName } from '@shared/helpers/string-helper';
import { cleanAlphaNumeric } from '@shared/helpers/text-cleaning-helper';
import { ApplyRateLimiting } from '@shared/interceptors/rate-limiting.interceptor';

import { GoogleLoginDto, GoogleService } from '../services/google.service';
import { TwitterLoginDto, TwitterService } from '../services/twitter.service';

@ApiTags('client/auth')
@Controller('auth')
export class AuthController {
  protected logger = new Logger(AuthController.name);

  constructor(
    private jwtService: JwtService,
    private userService: UserService,
    private twitterService: TwitterService,
    protected authService: AuthService,
    protected configService: ConfigService,
    private googleService: GoogleService,

    protected eventEmitter: EventEmitter2,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
    @Inject(INJECTION_TOKEN.MAILER_SERVICE)
    protected mailService: MailService,
  ) {}

  @Get('twitter/get-login-url')
  async tw(@LogId() logId: string): Promise<HttpResponse> {
    const result = await this.twitterService.getOAuthToken(logId);
    if (!result.success) return { success: false };

    const { oauth_token } = result.data;
    const url = `https://api.twitter.com/oauth/authenticate?oauth_token=${oauth_token}`;

    return { success: true, data: { url } };
  }

  @Post('twitter/login')
  async loginTwitter(
    @LogId() logId: string,
    @Body() body: TwitterLoginDto,
  ): Promise<HttpResponse> {
    const verifyResult = await this.twitterService.verifyOAuthResponse(
      logId,
      body,
    );
    if (!verifyResult?.success)
      return {
        success: false,
        code: ResponseCode.TWITTER_INVALID_CREDENTIAL,
      };

    const { user_id, screen_name } = verifyResult.data;
    let user = await this.userService.getByTwitterScreenName(screen_name);

    if (!user) {
      // create & link user if not exists
      const twitterUserResult = await this.twitterService.getProfile(
        logId,
        screen_name,
      );
      if (!twitterUserResult?.success)
        return { success: false, code: ResponseCode.TWITTER_USER_NOT_FOUND };

      const { name, location, description } = twitterUserResult.data;

      user = await this.userService.save({
        referral_code: genReferralCode(),
        twitterId: user_id,
        twitterScreenName: screen_name,
        fullname: name || screen_name,
        location,
        description,
        profile_banner_url: DEFAULT_PROFILE_BANNER_URL,
      });
    }

    if (user.is_voting === true) {
      user.is_voting = false;
      await this.userService.updateById(user.id, { is_voting: false });
    }

    const isPinSet = !!user.pinSecret;

    return {
      success: true,
      data: {
        access_token: await this.jwtService.signAsync({ id: user.id }),
        user: { ...extractPublicInfo(user), isPinSet },
      },
    };
  }

  @Post('email/register')
  async register(
    @LogId() logId: string,
    @Body() body: RegisterDto,
  ): Promise<HttpResponse> {
    const cleanedUserName = cleanAlphaNumeric(body.userName);
    if (!cleanedUserName) {
      return {
        success: false,
        message: 'invalid user name',
        code: ResponseCode.BAD_REQUEST,
      };
    }

    body.userName = randomUserName(cleanedUserName);

    const checkResult = await this.authService.checkUniqueEmailAndUserName({
      email: body.email,
      userName: body.userName,
    });
    if (!checkResult.success) return checkResult;

    const errMsg = stringUtils.validatePasswordStrengthWithMessage(
      body.password,
    );
    if (errMsg) {
      return {
        success: false,
        message: errMsg,
        code: ResponseCode.BAD_REQUEST,
      };
    }

    const agcMetadata = tryParseJSON(body.metadata);
    const referenceId = agcMetadata?.referenceid?.toUpperCase();
    const isFromAugmentlabs = agcMetadata && referenceId;

    if (isFromAugmentlabs) {
      const foundUserWithRefcode = await this.userService.findUserByReferenceId(
        referenceId,
      );
      if (foundUserWithRefcode) {
        return {
          success: false,
          message: 'referenceid already used',
          code: ERR_CODE.REFERENCE_ID_ALREADY_USED,
        };
      }

      const referenceIdVerificationResult =
        await this.authService.verifyAgcReferenceId(referenceId);
      if (!referenceIdVerificationResult.success) {
        return referenceIdVerificationResult;
      }

      if (!referenceIdVerificationResult.data.isValid) {
        return {
          success: false,
          message: 'referenceid is not valid',
          code: ERR_CODE.INVALID_REFERENCE_ID,
        };
      }
    }

    const registerResult = await this.authService.register(logId, body);
    if (!registerResult.success) {
      return registerResult;
    }

    if (isFromAugmentlabs) {
      await this.userService.updateById(registerResult.data.id, {
        isVerifiedEmail: true,
      });
    } else {
      const token = this.authService.generateOtpToken();

      await this.userService.updateById(registerResult.data.id, { token });

      const template = readFileSync('templates/verify-email.ejs', 'utf-8');
      const compiledTemplate = ejs.render(template, {
        verifyUrl: `${this.configService.getOrThrow(
          ENV_KEY.APP_PUBLIC_URL,
        )}/verify-email?token=${token}`,
      });

      await this.mailService.send({
        to: body.email,
        subject: '[Weknot.io] Please verify your email',
        html: compiledTemplate,
      });
    }

    return {
      success: true,
    };
  }

  @Post('email/login')
  async login(
    @LogId() logId: string,
    @Body() body: LoginDto,
  ): Promise<HttpResponse> {
    const loginResult = await this.authService.login(logId, body);
    if (!loginResult.success) {
      return loginResult;
    }

    const { data } = loginResult;

    const isPinSet = !!data.pinSecret;

    return {
      success: true,
      data: {
        access_token: await this.jwtService.signAsync({ id: data.id }),
        user: { ...extractPublicInfo(data), isPinSet },
      },
    };
  }

  @Post('verify-email')
  async verifyEmail(
    @LogId() logId: string,
    @Body() body: VerifyEmailDto,
  ): Promise<HttpResponse> {
    const user = await this.userService.findOne({ token: body.token });
    if (!user) {
      return {
        success: false,
        message: 'Invalid token or expired',
        code: ResponseCode.BAD_REQUEST,
      };
    }

    await this.userService.updateById(user.id, {
      isVerifiedEmail: true,
      token: null,
    });

    const isPinSet = !!user.pinSecret;

    const userMetadata = user.metadata as any;

    this.eventEmitter.emit(
      APP_EVENT.USER_UPDATED,
      UserUpdatedEvent.from({
        logId,
        userId: user.id,
        referenceId: userMetadata?.referenceid.toUpperCase(),
      }),
    );

    return {
      success: true,
      data: {
        access_token: await this.jwtService.signAsync({ id: user.id }),
        user: { ...extractPublicInfo(user), isPinSet },
      },
    };
  }

  @ApplyRateLimiting(MAX_SEND_EMAIL_RECORDS)
  @Post('/forgot-password')
  async forgotpassword(@Body() body: ForgotPasswordDto): Promise<HttpResponse> {
    const user = await this.userService.findOne({ email: ILike(body.email) });
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
        message: 'invalid social type',
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

    const token = this.authService.generateOtpToken();

    await this.userService.updateById(user.id, { token });

    const template = readFileSync('templates/reset-password.ejs', 'utf-8');
    const compiledTemplate = ejs.render(template, {
      verifyUrl: `${this.configService.getOrThrow(
        ENV_KEY.APP_PUBLIC_URL,
      )}/reset-password?token=${token}`,
    });

    await this.mailService.send({
      to: body.email,
      subject: 'Reset Password',
      html: compiledTemplate,
    });

    return {
      success: true,
    };
  }

  @Post('set-password')
  async active(@Body() body: ResetPasswordDto): Promise<HttpResponse> {
    const { token } = body;
    const user = await this.userService.findOne({ token });
    if (!user) {
      return {
        success: false,
        message: 'Invalid token or expired',
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

    const errMsg = stringUtils.validatePasswordStrengthWithMessage(
      body.password,
    );
    if (errMsg) {
      return {
        success: false,
        message: errMsg,
        code: ResponseCode.BAD_REQUEST,
      };
    }

    const hashedPassword = await bcryptHelper.hash(body.password);

    await this.userService.updateById(user.id, {
      password: hashedPassword,
      token: null,
    });

    return { success: true };
  }

  @ApplyRateLimiting(MAX_SEND_EMAIL_RECORDS)
  @Post('email/resend')
  async resendEmail(
    @LogId() logId: string,
    @Body() body: ResendEmailDto,
  ): Promise<HttpResponse> {
    const user = await this.userService.findOne({ email: ILike(body.email) });
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
        message: 'invalid social type',
        code: ResponseCode.BAD_REQUEST,
      };
    }

    const token = this.authService.generateOtpToken();

    await this.userService.updateById(user.id, { token });

    let template = null;
    let compiledTemplate = null;
    let subject = '';

    switch (body.type) {
      case EMAIL_TYPE.VERIFY_EMAIL:
        // eslint-disable-next-line no-case-declarations
        if (user.isVerifiedEmail) {
          return {
            success: false,
            message: 'user verified email',
            code: ResponseCode.BAD_REQUEST,
          };
        }

        template = readFileSync('templates/verify-email.ejs', 'utf-8');
        compiledTemplate = ejs.render(template, {
          verifyUrl: `${this.configService.getOrThrow(
            ENV_KEY.APP_PUBLIC_URL,
          )}/verify-email?token=${token}`,
        });
        subject = '[Weknot.io] Please verify your email';

        break;

      case EMAIL_TYPE.RESET_PASSWORD:
        template = readFileSync('templates/reset-password.ejs', 'utf-8');
        compiledTemplate = ejs.render(template, {
          verifyUrl: `${this.configService.getOrThrow(
            ENV_KEY.APP_PUBLIC_URL,
          )}/reset-password?token=${token}`,
        });
        subject = 'Reset Password';

        break;

      default:
        return {
          success: false,
          message: 'email type not supported',
          code: ResponseCode.BAD_REQUEST,
        };
    }

    await this.mailService.send({
      to: body.email,
      subject,
      html: compiledTemplate,
    });

    return {
      success: true,
    };
  }

  @Post('google/login')
  async loginGoogle(@LogId() logId: string, @Body() body: GoogleLoginDto) {
    const verifyResult = await this.googleService.verify(
      logId,
      body.credential,
    );
    if (!verifyResult?.success)
      return { success: false, code: ResponseCode.GOOGLE_INVALID_CREDENTIAL };

    const { sub } = verifyResult.data;
    let user = await this.userService.findOne({ googleId: sub });
    if (!user) {
      // create if not exists
      const { email, name } = verifyResult.data;

      const foundUserByEmail = await this.userService.findOne({ email: email });
      if (foundUserByEmail) {
        return {
          success: false,
          message: 'email already registered',
          code: ResponseCode.CONFLICT,
        };
      }

      const rd = Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, '0');
      const twitterScreenName =
        email
          .split('@')[0]
          .toLowerCase()
          .replace(/[^a-zA-Z0-9 ]/g, '_') + `_gg_${rd}`;
      user = await this.userService.save({
        socialType: SOCIAL_TYPE.GOOGLE,
        twitterScreenName,
        googleId: sub,
        email,
        fullname: name,
        profile_banner_url: DEFAULT_PROFILE_BANNER_URL,
      });
    }

    return {
      status: '200',
      data: {
        access_token: await this.jwtService.signAsync({ id: user.id }),
        user,
      },
    };
  }
}
