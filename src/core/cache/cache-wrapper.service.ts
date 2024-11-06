import { Cache } from 'cache-manager';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export abstract class CacheWrapperService {
  protected logger = new Logger(this.constructor.name);
  protected ttl_ms = 900 * 1000; // 15 minute, from cache-manager v5 they use milliseconds instead of seconds

  constructor(@Inject(CACHE_MANAGER) protected cache: Cache) {}

  async get<T = any>(key: string): Promise<T> {
    return await this.cache.get(this.keyTransform(key));
  }

  async set(key: string, value: any, ttl?: number) {
    await this.cache.set(this.keyTransform(key), value, ttl || this.ttl_ms);
  }

  async del(key: string) {
    await this.cache.del(this.keyTransform(key));
  }

  async delStartWith(prefix: string) {
    const keys = await this.cache.store.keys();
    const matches = keys.filter((v) => v.startsWith(this.keyTransform(prefix)));
    if (matches.length === 0) return;
    await this.cache.store.mdel(...matches);
  }

  private keyTransform(key: string) {
    return `${this.constructor.name}:${key}`;
  }
}
