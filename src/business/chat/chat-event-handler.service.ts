import { AuditService, ErrorLog } from 'mvc-common-toolkit';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';

import {
  ImageProcessedEvent,
  ImageRejectedEvent,
  SharesBoughtEvent,
  SharesSoldEvent,
} from '@business/event/event.model';
import { OSSDeleteQueueService } from '@business/oss-management/oss-delete-queue.service';

import {
  APP_ACTION,
  APP_EVENT,
  CHAT_TYPE,
  ENV_KEY,
  INJECTION_TOKEN,
  SOURCE_TYPE,
} from '@shared/constants';

import { ChatService } from './chat.service';
import { MessageService } from './message.service';

@Injectable()
export class ChatEventHandlerService {
  protected logger = new Logger(ChatEventHandlerService.name);
  protected baseURL: string;

  constructor(
    protected configService: ConfigService,
    protected chatService: ChatService,
    protected messageService: MessageService,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
    private ossDeleteQueueService: OSSDeleteQueueService,
  ) {
    this.baseURL = this.configService.get(ENV_KEY.WEBSOCKET_ENDPOINT);
  }

  @OnEvent(APP_EVENT.SHARE_BOUGHT)
  public async handleSharesBoughtEvent(
    event: SharesBoughtEvent,
  ): Promise<void> {
    try {
      this.logger.debug(`[${event.logId}]: Handle shares bought event`);

      const chatExisted = await this.chatService.getOne({
        participants: { $all: [event.ownerId, event.buyerId] },
      });

      if (chatExisted) {
        return;
      }

      await this.chatService.create({
        participants: [event.ownerId, event.buyerId],
        type: CHAT_TYPE.SINGLE,
      });
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          logId: event.logId,
          message: error.message,
          action: APP_ACTION.CREATE_CHAT,
          payload: event,
        }),
      );
    }
  }

  @OnEvent(APP_EVENT.IMAGE_PROCESSED)
  public async handleImageProcessedEvent(
    event: ImageProcessedEvent,
  ): Promise<void> {
    this.logger.debug(`[${event.logId}]: Handle image processed event`);

    if (event.sourceType != SOURCE_TYPE.MESSAGE) {
      return;
    }

    const foundMessage = await this.messageService.getById(event.messageId);
    if (!foundMessage) return;

    const image = foundMessage.content?.images[event.imageIndex];
    if (image?.original) {
      await this.ossDeleteQueueService.scheduleDelete(
        image.original.split('/')[3],
      );
    }

    foundMessage.content.images[event.imageIndex] = {
      ...foundMessage.content.images[event.imageIndex],
      ...event.imagesResized,
    };

    await this.messageService.updateById(event.messageId, {
      'content.images': foundMessage.content.images,
    });
  }

  @OnEvent(APP_EVENT.IMAGE_REJECTED)
  public async handleImageRejectedEvent(
    event: ImageRejectedEvent,
  ): Promise<void> {
    this.logger.debug(`[${event.logId}]: Handle image rejected event`);

    if (event.sourceType != SOURCE_TYPE.MESSAGE) {
      return;
    }

    const foundMessage = await this.messageService.getById(event.messageId);
    if (!foundMessage) {
      return;
    }

    await this.messageService.updateById(foundMessage._id, {
      metadata: {
        ...foundMessage.metadata,
        deleteStatus: {
          deletedAt: new Date(),
          description: 'this message was deleted due to inappropriate content',
        },
      },
    });
  }
}
