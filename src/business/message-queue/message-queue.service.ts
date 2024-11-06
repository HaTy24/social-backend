import { AuditService, IKafkaService } from 'mvc-common-toolkit';

import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ENV_KEY, INJECTION_TOKEN } from '@shared/constants';

@Injectable()
export class MessageQueueService implements OnModuleInit {
  protected logger = new Logger(MessageQueueService.name);

  constructor(
    protected configService: ConfigService,
    protected eventEmitter: EventEmitter2,

    @Inject(INJECTION_TOKEN.KAFKA_SERVICE)
    protected messageQueue: IKafkaService,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {}

  public async onModuleInit() {
    if (!this.messageQueue) {
      this.logger.debug('KAFKA is not setup');
      return;
    }

    await this.messageQueue?.initProducer();
    this.logger.debug('Producer initialized');
    await this.messageQueue?.initConsumer({
      groupId: this.configService.getOrThrow(ENV_KEY.KAFKA_CONSUMER_GROUP_ID),
    });

    this.logger.debug('Consumer initialized');
  }

  public publishMessage(message: string | Buffer): Promise<void> {
    return this.messageQueue?.publish({
      topic: this.configService.getOrThrow(
        ENV_KEY.KAFKA_IMG_PROCESSING_TOPIC_ID,
      ),
      messages: [{ value: message }],
    });
  }

  public listen(topics: string[], handler: any): Promise<void> {
    return this.messageQueue?.listen(
      {
        topics,
      },
      {
        eachMessage: handler,
        autoCommit: true,
      },
    );
  }
}
