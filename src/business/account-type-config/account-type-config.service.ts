import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { OrmCacheService } from '@core/database/orm.service';

import { AccountTypeConfig } from './account-type-config.entity';

@Injectable()
export class AccountTypeConfigService extends OrmCacheService<AccountTypeConfig> {
  protected ttl = 8 * 3600000; // 8h
  primaryKeyName = 'id';

  constructor(
    @Inject(CACHE_MANAGER)
    protected cache: Cache,
    @InjectRepository(AccountTypeConfig)
    protected readonly respository: Repository<AccountTypeConfig>,
  ) {
    super(cache, respository);
  }
}
