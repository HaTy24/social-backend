import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';


import { AuditModule } from '../audit/audit.module';
import { Feedback, FeedbackSchema } from './feedback.model';
import { FeedbackService } from './feedback.service';

@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([
      {
        name: Feedback.name,
        schema: FeedbackSchema,
      },
    ]),
  ],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
