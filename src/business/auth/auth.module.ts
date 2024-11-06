import { Module } from '@nestjs/common';

import { UserModule } from '@business/user/user.module';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [ConfigModule, UserModule, HttpModule.register({ timeout: 30000 })],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
