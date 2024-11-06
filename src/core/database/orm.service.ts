import { Cache } from 'cache-manager';
import {
  DeepPartial,
  FindManyOptions,
  FindOptionsWhere,
  IsNull,
  Repository,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { BaseCache } from '@core/cache/base.cache';

import * as queryHelper from '@shared/helpers/query-helper';

type PK = string | number;
type where<T> = FindOptionsWhere<T> | FindOptionsWhere<T>[];

export abstract class OrmCacheService<T> extends BaseCache<T> {
  constructor(
    protected cache: Cache,
    protected readonly respository: Repository<T>,
  ) {
    super(cache);
  }

  public async paginate(pagingDTO) {
    const { limit = 10, offset = 0, filter } = pagingDTO || {};

    const totalCount = await this.respository.count({
      where: filter,
    });

    if (totalCount === 0) {
      return {
        totalCount: 0,
        items: [],
      };
    }
    const parsedSort = queryHelper.parseSort(pagingDTO.sort);

    const data = await this.respository.find({
      take: limit,
      skip: offset,
      order: parsedSort as any,
      where: {
        deletedAt: IsNull(),
        ...filter,
      },
    });

    return {
      items: data,
      totalCount,
    };
  }

  public async save(data: DeepPartial<T>) {
    return this.respository.save(data);
  }

  public async clearCacheForId(id: PK) {
    const obj = await this.getOneByKey(`${id}`, true);
    if (obj) {
      await this.removeCache(obj);
    }
  }

  public async updateById(id: PK, data: QueryDeepPartialEntity<T>) {
    await this.respository.update(id, data);
    await this.clearCacheForId(id);
  }

  public async bulkUpdate(
    updateData: QueryDeepPartialEntity<T>,
    conditions?: Partial<T>,
  ) {
    await this.respository
      .createQueryBuilder()
      .update()
      .set(updateData)
      .where({...conditions})
      .execute();
  }

  public async deleteById(id: PK) {
    return this.respository.delete(id);
  }

  public async softDeleteById(id: PK) {
    return this.respository.softDelete(id);
  }

  public async findOne(condition: Record<string, any>, withDeleted = false): Promise<T> {
    return this.respository.findOne({
      where: condition,
      withDeleted,
    });
  }

  public async find(options?: FindManyOptions<T>): Promise<T[]> {
    return this.respository.find(options);
  }

  public count(where: where<T>) {
    return this.respository.countBy(where);
  }

  // cache method
  async getOneByKey(key: string, withDeleted = false): Promise<T> {
    let data = await this.getCache<T>(key);
    if (data === null) {
      data = await this.load(key, withDeleted);
      if (data !== null) {
        await this.addCache(data);
      }
    }
    return data;
  }

  // implement cache load
  protected async load(key: string, withDeleted = false): Promise<T> {
    const arr = key.split(':');
    if (arr.length === 1) {
      return this.respository.findOne({
        withDeleted,
        where: { [this.primaryKeyName]: key } as where<T>,
      });
    }
    const [k, ...values] = arr;
    return this.respository.findOne({
      withDeleted,
      where: { [k]: values.join(':') } as where<T>,
    });
  }
}
