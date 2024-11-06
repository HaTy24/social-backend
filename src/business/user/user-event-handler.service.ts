import { Cache } from 'cache-manager';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  EmailUpdatedEvent,
  UserUpdatedEvent,
} from '@business/event/event.model';

import { APP_EVENT } from '@shared/constants';

@Injectable()
export class UserEventHandlerService {
  protected logger = new Logger(UserEventHandlerService.name);

  constructor(
    @Inject(CACHE_MANAGER)
    protected cacheService: Cache,
  ) {}

  @OnEvent(APP_EVENT.EMAIL_UPDATED)
  public async handleEmailUpdatedEvent(
    event: EmailUpdatedEvent,
  ): Promise<void> {
    this.logger.debug(`[${event.logId}]: Handle email updated event`);

    await this.cacheService.del(`user_profile:${event.userId}`);
  }

  @OnEvent(APP_EVENT.USER_UPDATED)
  public async handleUserUpdatedEvent(event: UserUpdatedEvent): Promise<void> {
    this.logger.debug(`[${event.logId}]: Handle user updated event`);

    await this.cacheService.del(`user_profile:${event.userId}`);

    if (event.referenceId) {
      await this.cacheService.del(
        `viewIntegrateUser:${event.referenceId.toUpperCase()}`,
      );
    }
  }
}
