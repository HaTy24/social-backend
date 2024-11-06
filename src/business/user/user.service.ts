import { Cache } from 'cache-manager';
import { OperationResult, bcryptHelper } from 'mvc-common-toolkit';
import { DataSource, Repository } from 'typeorm';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { OrmCacheService } from '@core/database/orm.service';

import { ENTITY_STATUS, ERR_CODE, MAX_PIN_FAILURE, RANDOM_USERS_TTL } from '@shared/constants';
import { VerifyPinResult } from '@shared/types';

import { User } from './user.entity';

@Injectable()
export class UserService extends OrmCacheService<User> {
  protected ttl = 8 * 3600000; // 8h
  primaryKeyName = 'id';
  subKeyNames = ['walletAddress', 'twitterScreenName'];

  constructor(
    @Inject(CACHE_MANAGER)
    protected cache: Cache,
    @InjectRepository(User)
    protected readonly respository: Repository<User>,
    
    protected datasource: DataSource,
  ) {
    super(cache, respository);
  }

  public async getRandomUsers(max = 100): Promise<Partial<User>[]> {
    const cacheKey = 'suggested_users';
    const cached: Partial<User>[] = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const query = `SELECT id FROM users TABLESAMPLE BERNOULLI (50) LIMIT $1;`;

    const randomResult = await this.datasource.query(query, [max]);

    await this.cache.set(`suggested_users`, randomResult, RANDOM_USERS_TTL)

    return randomResult;
  }

  public async validatePin(
    userId: string,
    pinNumber: string,
  ): Promise<OperationResult<VerifyPinResult>> {
    const user = await this.getById(userId);
    if (!user) {
      return {
        success: false,
        message: 'user not found',
      };
    }

    if (user.status !== ENTITY_STATUS.ACTIVE) {
      return {
        success: false,
        message: 'you have been locked',
        code: ERR_CODE.USER_LOCKED,
        httpCode: HttpStatus.FORBIDDEN,
      };
    }

    const failureCountCacheKey = `pinFailureCount:${userId}`;

    // User not setup PIN yet
    if (!user.pinSecret) {
      return {
        success: false,
        message: 'user has not yet setup pin',
        code: ERR_CODE.USER_PIN_NOT_SET,
        httpCode: HttpStatus.UNPROCESSABLE_ENTITY,
      };
    }

    const isMatch = await bcryptHelper.compare(pinNumber, user.pinSecret);

    if (isMatch) {
      await this.cache.del(failureCountCacheKey);

      return {
        success: true,
        data: {
          isValid: true,
        },
      };
    }

    const userFailureCount =
      ((await this.cache.get(failureCountCacheKey)) as number) || 0;

    const newFailureCount = userFailureCount + 1;

    if (newFailureCount === MAX_PIN_FAILURE) {
      await this.updateById(userId, { status: ENTITY_STATUS.SUSPENDED });
      await this.cache.del(failureCountCacheKey);

      return {
        success: true,
        data: {
          isValid: false,
          attemptsLeft: 0,
          isLocked: true,
        },
      };
    }

    await this.cache.set(failureCountCacheKey, newFailureCount);

    return {
      success: true,
      data: {
        isValid: false,
        attemptsLeft: MAX_PIN_FAILURE - newFailureCount,
        isLocked: false,
      },
    };
  }

  public async findIntegrateUser(
    logId: string,
    referenceId: string,
  ): Promise<User> {
    const key = `viewIntegrateUser:${referenceId.toUpperCase()}`;
    const cached = await this.cache.get(key);
    if (cached) {
      this.logger.debug(`[${logId}]: Loaded ${key} from cache successful`);
      return cached as User;
    }

    const foundUser = await this.findUserByReferenceId(referenceId.toUpperCase());

    if (!foundUser) {
      return null;
    }

    await this.cache.set(key, foundUser);
    return foundUser;
  }

  public async findUserByReferenceId(referenceId: string): Promise<User> {
    const result = await this.respository
      .createQueryBuilder('users')
      .select()
      .where(`users.metadata->>'referenceid' = :referenceId`, { referenceId: referenceId.toUpperCase() })
      .getOne();

      return result
  }

  public async getById(id: string) {
    return this.getOneByKey(id);
  }

  public async getByWalletAddress(address: string) {
    return this.getOneByKey(`walletAddress:${address.toLowerCase()}`);
  }

  public async getByTwitterScreenName(screenName: string) {
    return this.getOneByKey(`twitterScreenName:${screenName}`);
  }

  public async getByIdOrTwitterScreenName(key: string) {
    return (
      (await this.getById(key)) || (await this.getByTwitterScreenName(key))
    );
  }
}
