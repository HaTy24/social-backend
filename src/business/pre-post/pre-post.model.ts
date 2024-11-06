
import { POST_POLICY } from '@business/post/post.model';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum PREPOST_STATUS {
  FAIL = -1,
  PENDING = 0,
  SUCCESS = 1,
}

export type PrePostDocument = HydratedDocument<
  PrePost & { createdAt: Date; updatedAt: Date }
>;

@Schema({ collection: 'pre_post', timestamps: true })
export class PrePost {

  @Prop({
    index: true,
  })
  ownerId: string;

  @Prop({
    type: Date
  })
  scheduled_at: Date;

  @Prop({
    unique: true,
  })
  slug: string;

  @Prop()
  policy: POST_POLICY;

  @Prop()
  text: string;

  @Prop({
    type: [Object],
  })
  media: object[];

  @Prop({
    type: [String],
    index: true,
  })
  hastags: string[];

  @Prop({ type: Number, enum: PREPOST_STATUS, default: PREPOST_STATUS.PENDING })
  status: PREPOST_STATUS;

  @Prop()
  authorId: string;
}

export const PrePostSchema = SchemaFactory.createForClass(PrePost);
