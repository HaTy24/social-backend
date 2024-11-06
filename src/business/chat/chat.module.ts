import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UserModule } from '@business/user/user.module';

import { ChatEventHandlerService } from './chat-event-handler.service';
import { Chat, ChatSchema } from './chat.model';
import { ChatService } from './chat.service';
import { Message, MessageSchema } from './message.model';
import { MessageService } from './message.service';
import { OssManagementModule } from '@business/oss-management/oss-management.module';

@Module({
  providers: [ChatService, MessageService, ChatEventHandlerService],
  exports: [ChatService, MessageService, ChatEventHandlerService],
  imports: [
    UserModule,
    MongooseModule.forFeature([
      {
        schema: ChatSchema,
        name: Chat.name,
      },
      {
        schema: MessageSchema,
        name: Message.name,
      },
    ]),
    OssManagementModule,
  ],
})
export class ChatModule {}
