import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserGameAccount } from './user-game-account.entity';
import { UserGameAccountService } from './user-game-account.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserGameAccount])],
  providers: [UserGameAccountService],
  exports: [UserGameAccountService],
})
export class UserGameAccountModule {}
