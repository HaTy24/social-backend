import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OSSDeleteQueue, OSSDeleteQueueSchema } from './oss-delete-queue.model';
import { OSSDeleteQueueService } from './oss-delete-queue.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: OSSDeleteQueue.name, schema: OSSDeleteQueueSchema }])],
  providers: [OSSDeleteQueueService],
  exports: [OSSDeleteQueueService],
})
export class OssManagementModule {}
