import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrmCacheService } from '@core/database/orm.service';
import { UserGameAccount } from './user-game-account.entity';

@Injectable()
export class UserGameAccountService extends OrmCacheService<UserGameAccount> {
  protected ttl = 8 * 3600000; // 8h
  primaryKeyName = 'id';

  constructor(
    @Inject(CACHE_MANAGER)
    protected cache: Cache,
    @InjectRepository(UserGameAccount)
    protected readonly respository: Repository<UserGameAccount>,
  ) {
    super(cache, respository);
  }
}
