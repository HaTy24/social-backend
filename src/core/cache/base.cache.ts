import { Cache } from 'cache-manager';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BasicCacheService {
  protected logger = new Logger(this.constructor.name);

  protected ttl = 3600000;

  constructor(@Inject(CACHE_MANAGER) protected cache: Cache) {}

  protected async getCache<T>(key: string): Promise<T> {
    return (await this.cache.get(`${this.constructor.name}:${key}`)) ?? null;
  }

  protected async setCache(key: string, value: any, ttl_ms?: number) {
    await this.cache.set(
      `${this.constructor.name}:${key}`,
      value,
      ttl_ms ?? this.ttl,
    );
  }

  protected async delCache(key: string) {
    await this.cache.del(`${this.constructor.name}:${key}`);
  }
}

export abstract class BaseCache<T> extends BasicCacheService {
  protected subKeyNames: string[] = [];

  constructor(protected cache: Cache) {
    super(cache);
  }

  abstract primaryKeyName: string;

  async addCache(data: T) {
    const promises = [
      this.setCache(this.extractKeyFromData(data), data),
      ...this.extractSubKeysFromData(data).map((key) =>
        this.setCache(key, data),
      ),
    ];
    return Promise.all(promises);
  }

  async removeCache(data: T) {
    const promises = [
      this.delCache(this.extractKeyFromData(data)),
      ...this.extractSubKeysFromData(data).map(this.delCache.bind(this)),
    ];
    return Promise.all(promises);
  }

  protected extractKeyFromData(data: T): string {
    return data[this.primaryKeyName];
  }

  protected extractSubKeysFromData(data: T): string[] {
    return this.subKeyNames
      .filter((k) => data[k])
      .map((p) => `${p}:${data[p]}`);
  }
}
