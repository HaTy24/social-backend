import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OssManagementModule } from '@business/oss-management/oss-management.module';

import { AuditModule } from '../audit/audit.module';
import { PrePost, PrePostSchema } from './pre-post.model';
import { PrePostService } from './pre-post.service';

@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([
      {
        name: PrePost.name,
        schema: PrePostSchema,
      },
    ]),
    OssManagementModule,
  ],
  providers: [PrePostService],
  exports: [PrePostService],
})
export class PrePostModule {}
