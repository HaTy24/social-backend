import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { OrmCacheService } from '@core/database/orm.service';

import { SystemUser } from './admin.entity';

@Injectable()
export class AdminService extends OrmCacheService<SystemUser> {
  protected ttl = 8 * 3600000; // 8h
  primaryKeyName = 'id';
  constructor(
    @Inject(CACHE_MANAGER)
    protected cache: Cache,
    @InjectRepository(SystemUser)
    protected readonly respository: Repository<SystemUser>,
  ) {
    super(cache, respository);
  }
}
