import { KafkaService } from 'mvc-common-toolkit';

import { Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';


import { ENV_KEY, INJECTION_TOKEN } from '@shared/constants';

import { MessageQueueService } from './message-queue.service';
import { AuditModule } from '@business/audit/audit.module';

const kafkaProvider: Provider = {
  provide: INJECTION_TOKEN.KAFKA_SERVICE,
  useFactory: (configService: ConfigService) => {
    const broker = configService.get(ENV_KEY.KAFKA_BROKER_URL);
    if (!broker) return null;
    const kafkaService = new KafkaService({
      brokers: [broker],
      clientId:
        configService.getOrThrow(ENV_KEY.KAFKA_CLIENT_ID) ||
        'augment-social-blockchain',
    });

    return kafkaService;
  },
  inject: [ConfigService],
};

@Module({
  imports: [AuditModule],
  providers: [kafkaProvider, MessageQueueService],
  exports: [MessageQueueService],
})
export class MessageQueueModule {}
