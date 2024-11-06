import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { OrmCacheService } from '@core/database/orm.service';

import { SystemAccount } from './system-account.entiy';

@Injectable()
export class SystemAccountService extends OrmCacheService<SystemAccount> {
  protected ttl = 8 * 3600000;
  primaryKeyName = 'id';

  constructor(
    @Inject(CACHE_MANAGER)
    protected cache: Cache,

    @InjectRepository(SystemAccount)
    protected readonly respository: Repository<SystemAccount>,

  ) {
    super(cache, respository);
  }
}
