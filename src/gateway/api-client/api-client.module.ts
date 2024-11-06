import { createId } from '@paralleldrive/cuid2';

import { HttpModule } from '@nestjs/axios';
import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { AccountTypeConfigModule } from '@business/account-type-config/account-type-config.module';
import { AuditModule } from '@business/audit/audit.module';
import { AuthModule } from '@business/auth/auth.module';
import { BlockchainModule } from '@business/blockchain/blockchain.module';
import { ChatModule } from '@business/chat/chat.module';
import { FeedbackModule } from '@business/feedback/feedback.module';
import { GameTransactionModule } from '@business/game-transaction/game-transaction.module';
import { GameModule } from '@business/game/game.module';
import { ImageModule } from '@business/image/image.module';
import { InteractionModule } from '@business/interaction/interaction.module';
import { MailModule } from '@business/mail/mail.module';
import { MessageQueueModule } from '@business/message-queue/message-queue.module';
import { NotificationModule } from '@business/notifications/notification.module';
import { PostModule } from '@business/post/post.module';
import { UserGameAccountModule } from '@business/user-game-account/user-game-account.module';
import { UserModule } from '@business/user/user.module';
import { WebsocketModule } from '@business/websocket/websocket.module';

import { AuthController } from './controllers/auth.controller';
import { ChatController } from './controllers/chat.controller';
import { FeedbackController } from './controllers/feedback.controller';
import { GameController } from './controllers/game.controller';
import { IntegrationController } from './controllers/integration.controller';
import { NotificationController } from './controllers/notification.controller';
import { OtherController } from './controllers/other.controller';
import { PostInteractionController } from './controllers/post-interaction.controller';
import { PostController } from './controllers/post.controller';
import { ProfileController } from './controllers/profile.controller';
import { TransactionController } from './controllers/transactions.controller';
import { UsersController } from './controllers/users.controller';
import { VoteController } from './controllers/vote.controller';
import { GoogleService } from './services/google.service';
import { TwitterService } from './services/twitter.service';

const logger = new Logger('ApiClientModule');

@Module({
  imports: [
    HttpModule.register({ timeout: 30000 }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        let secret = configService.get('CLIENT_JWT_SECRET');
        if (!secret) {
          logger.warn(
            'CLIENT_JWT_SECRET config is not set. A random secret will be used, and all JWTs will be invalid after a restart.',
          );
          secret = createId();
        }
        return {
          secret,
          signOptions: {
            expiresIn: configService.get('CLIENT_JWT_EXPIRATION', '24h'),
          },
        };
      },
    }),
    HttpModule,
    AuditModule,
    BlockchainModule,
    UserModule,
    PostModule,
    UserGameAccountModule,
    GameTransactionModule,
    GameModule,
    FeedbackModule,
    InteractionModule,
    NotificationModule,
    ChatModule,
    AccountTypeConfigModule,
    WebsocketModule,
    ImageModule,
    MessageQueueModule,
    MailModule,
    AuthModule,
  ],
  controllers: [
    AuthController,
    ProfileController,
    PostController,
    PostInteractionController,
    TransactionController,
    NotificationController,
    VoteController,
    UsersController,
    FeedbackController,
    GameController,
    OtherController,
    ChatController,
    IntegrationController,
  ],
  providers: [TwitterService, GoogleService],
})
export class ApiClientModule {}
