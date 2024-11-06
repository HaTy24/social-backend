import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OssManagementModule } from '@business/oss-management/oss-management.module';
import { UserModule } from '@business/user/user.module';

import { AuditModule } from '../audit/audit.module';
import { InteractionModule } from '../interaction/interaction.module';
import { PostEventHandlerService } from './post-event-handler.service';
import { Post, PostSchema } from './post.model';
import { PostService } from './post.service';

@Module({
  imports: [
    InteractionModule,
    AuditModule,
    UserModule,
    MongooseModule.forFeature([
      {
        name: Post.name,
        schema: PostSchema,
      },
    ]),
    OssManagementModule,
  ],
  providers: [PostService, PostEventHandlerService],
  exports: [PostService, PostEventHandlerService],
})
export class PostModule {}
