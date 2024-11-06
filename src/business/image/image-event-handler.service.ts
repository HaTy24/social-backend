import { EachMessagePayload } from 'kafkajs';
import { AuditService, ErrorLog, stringUtils } from 'mvc-common-toolkit';

import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { MessageService } from '@business/chat/message.service';
import {
  ImageProcessedEvent,
  ImageRejectedEvent,
} from '@business/event/event.model';
import { MessageQueueService } from '@business/message-queue/message-queue.service';

import {
  APP_ACTION,
  APP_EVENT,
  ENV_KEY,
  IMAGE_PROCESS_RESULT,
  INJECTION_TOKEN,
} from '@shared/constants';
import { ImageResizedEventPayload } from '@shared/types';

import { PostService } from '../post/post.service';

@Injectable()
export class ImageEventHandlerService implements OnModuleInit {
  protected logger = new Logger(ImageEventHandlerService.name);

  constructor(
    protected configService: ConfigService,
    protected postService: PostService,
    protected messageService: MessageService,
    protected messageQueueService: MessageQueueService,
    protected eventEmitter: EventEmitter2,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {}

  public async onModuleInit() {
    this.messageQueueService.listen(
      [
        this.configService.getOrThrow(
          ENV_KEY.KAFKA_IMG_PROCESS_RESULT_TOPIC_ID,
        ),
      ],
      this.onReceiveImageResizedEvent.bind(this),
    );
  }

  protected async onReceiveImageResizedEvent(
    payload: EachMessagePayload,
  ): Promise<void> {
    try {
      const { message } = payload;
      const parsedMessage: ImageResizedEventPayload = JSON.parse(
        String(message.value),
      );

      if (parsedMessage.result === IMAGE_PROCESS_RESULT.REJECTED) {
        this.eventEmitter.emit(
          APP_EVENT.IMAGE_REJECTED,
          ImageRejectedEvent.from({
            logId: stringUtils.generateRandomId(),
            sourceType: parsedMessage.sourceType,
            imageIndex: parsedMessage.imageIndex,
            postSlug: parsedMessage.postSlug,
            messageId: parsedMessage.messageId,
            fileName: parsedMessage.fileName,
            fileURL: parsedMessage.fileURL,
            createdAt: new Date(),
          }),
        );

        return;
      }

      this.eventEmitter.emit(
        APP_EVENT.IMAGE_PROCESSED,
        ImageProcessedEvent.from({
          logId: stringUtils.generateRandomId(),
          sourceType: parsedMessage.sourceType,
          imageIndex: parsedMessage.imageIndex,
          postSlug: parsedMessage.postSlug,
          messageId: parsedMessage.messageId,
          imagesResized: parsedMessage.processedData,
          createdAt: new Date(),
        }),
      );
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          action: APP_ACTION.HANDLE_IMG_RESIZED_EVENT,
          message: error.message,
          logId: stringUtils.generateRandomId(),
          payload,
        }),
      );
    }
  }
}
