import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GameTransaction } from './game-transaction.entity';
import { GameTransactionService } from './game-transaction.service';

@Module({
  imports: [TypeOrmModule.forFeature([GameTransaction])],
  exports: [GameTransactionService],
  providers: [GameTransactionService],
})
export class GameTransactionModule {}
