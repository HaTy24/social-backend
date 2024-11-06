import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { UserGameAccountModule } from '@business/user-game-account/user-game-account.module';
import { UserModule } from '@business/user/user.module';
import { GameService } from '../game/game.service';

@Module({
  imports: [HttpModule, UserModule, UserGameAccountModule],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
