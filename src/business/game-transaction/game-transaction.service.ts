import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';

import { OrmCacheService } from '@core/database/orm.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GameTransaction } from './game-transaction.entity';

@Injectable()
export class GameTransactionService extends OrmCacheService<GameTransaction> {
  protected ttl = 8 * 3600000; // 8h
  primaryKeyName = 'id';

  constructor(
    @Inject(CACHE_MANAGER)
    protected cache: Cache,
    @InjectRepository(GameTransaction)
    protected readonly respository: Repository<GameTransaction>,
  ) {
    super(cache, respository);
  }
}
