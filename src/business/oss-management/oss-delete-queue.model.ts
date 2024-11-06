import { HydratedDocument } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';


export type OSSDeleteQueueDocument = HydratedDocument<OSSDeleteQueue>;

@Schema({ collection: 'oss_delete_queue' })
export class OSSDeleteQueue {
  @Prop()
  path: string;

  @Prop()
  scheduled_at: number;
}

export const OSSDeleteQueueSchema = SchemaFactory.createForClass(OSSDeleteQueue);
