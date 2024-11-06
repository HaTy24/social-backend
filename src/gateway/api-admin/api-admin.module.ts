import { createId } from '@paralleldrive/cuid2';

import { HttpModule } from '@nestjs/axios';
import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { AccountTypeConfigModule } from '@business/account-type-config/account-type-config.module';
import { AdminModule } from '@business/admin/admin.module';
import { AnalyticModule } from '@business/analytic/analytic.module';
import { AuditModule } from '@business/audit/audit.module';
import { FeedbackModule } from '@business/feedback/feedback.module';
import { PostModule } from '@business/post/post.module';
import { PrePostModule } from '@business/pre-post/pre-post.module';
import { SystemAccountModule } from '@business/system-account/system-account.module';
import { UserModule } from '@business/user/user.module';

import { ENV_KEY } from '@shared/constants';

import { AdminAccountTypeConfigController } from './controllers/admin-account-type-config.controller';
import { AnalyticController } from './controllers/admin-analytic.controller';
import { AdminFeedbackController } from './controllers/admin-feedback.controller';
import { AdminPostController } from './controllers/admin-post.controller';
import { AdminPrePostController } from './controllers/admin-pre-post.controller';
import { AdminSystemAccountController } from './controllers/admin-system-account.controller';
import { AdminTransactionController } from './controllers/admin-transaction.controller';
import { AdminUserController } from './controllers/admin-user.controller';
import { AdminController } from './controllers/admin.controller';
import { AdminAuthController } from './controllers/auth.controller';

const logger = new Logger('ApiAdminModule');
@Module({
  imports: [
    HttpModule.register({ timeout: 30000 }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        let secret = configService.get(ENV_KEY.CLIENT_JWT_SECRET);
        if (!secret) {
          logger.warn(
            'CLIENT_JWT_SECRET config is not set. A random secret will be used, and all JWTs will be invalid after a restart.',
          );
          secret = createId();
        }
        return {
          secret,
          signOptions: {
            expiresIn: configService.get(ENV_KEY.CLIENT_JWT_EXPIRATION, '24h'),
          },
        };
      },
    }),
    AuditModule,
    AdminModule,
    UserModule,
    PostModule,
    FeedbackModule,
    SystemAccountModule,
    AccountTypeConfigModule,
    AnalyticModule,
    PrePostModule,
  ],
  controllers: [
    AdminAuthController,
    AdminController,
    AdminUserController,
    AdminPostController,
    AdminFeedbackController,
    AdminSystemAccountController,
    AdminTransactionController,
    AnalyticController,
    AdminAccountTypeConfigController,
    AdminPrePostController,
  ],
  providers: [],
})
export class ApiAdminModule {}
