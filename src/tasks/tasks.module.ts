import { Module } from '@nestjs/common';
import { OssManagementModule } from '@business/oss-management/oss-management.module';
import { PostTask } from './post.task';
import { PostModule } from '@business/post/post.module';
import { ImageModule } from '@business/image/image.module';
import { UserModule } from '@business/user/user.module';
import { MessageQueueModule } from '@business/message-queue/message-queue.module';
import { PrePostModule } from '@business/pre-post/pre-post.module';
import { AuditModule } from '@business/audit/audit.module';

@Module({
  imports: [
    OssManagementModule,
    PostModule,
    ImageModule,
    UserModule,
    MessageQueueModule,
    PrePostModule,
    AuditModule,
  ],
  providers: [ PostTask],
})
export class TasksModule {}
