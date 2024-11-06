import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ChatModule } from '@business/chat/chat.module';
import { MessageQueueModule } from '@business/message-queue/message-queue.module';
import { PostModule } from '@business/post/post.module';

import { ImageEventHandlerService } from './image-event-handler.service';
import { ImageService } from './image.service';

@Module({
  imports: [HttpModule, MessageQueueModule, PostModule, ChatModule],
  providers: [ImageService, ImageEventHandlerService],
  exports: [ImageService, ImageEventHandlerService],
})
export class ImageModule {}
