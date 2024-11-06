import { createId } from '@paralleldrive/cuid2';

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { AuditModule } from '@business/audit/audit.module';
import { BlockchainModule } from '@business/blockchain/blockchain.module';
import { InteractionModule } from '@business/interaction/interaction.module';
import { PostModule } from '@business/post/post.module';
import { UserModule } from '@business/user/user.module';

import { TwitterService } from '../api-client/services/twitter.service';

@Module({
  imports: [
    HttpModule,
    UserModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        let secret = configService.get('CLIENT_JWT_SECRET');
        if (!secret) {
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
    AuditModule,
    BlockchainModule,
    UserModule,
    PostModule,
    InteractionModule,
  ],
  providers: [TwitterService],
  controllers: [],
})
export class ApiPublicModule {}
