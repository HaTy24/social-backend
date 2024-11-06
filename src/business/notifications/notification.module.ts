import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { NotificationEventHandlerService } from './notification-event-handler.service';
import { NotificationHttpRequestService } from './notification-http-request.service';
import { Notification, NotificationSchema } from './notification.model';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Notification.name,
        schema: NotificationSchema,
      },
    ]),
    HttpModule,
  ],
  exports: [NotificationService],
  providers: [
    NotificationService,
    NotificationEventHandlerService,
    NotificationHttpRequestService,
  ],
})
export class NotificationModule {}
