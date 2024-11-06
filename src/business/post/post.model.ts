import { HydratedDocument } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export enum POST_TYPE {
  TWEET = 'tweet',
  RETWEET = 'retweet',
  REPLY = 'reply',
}

export enum POST_POLICY {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export type PostDocument = HydratedDocument<
  Post & { createdAt: Date; updatedAt: Date }
>;

@Schema({ id: false, timestamps: true })
export class ReplyMetadata {
  @Prop()
  ownerId: string;

  @Prop({ index: true })
  postSlug: string;
}

const ReplyMetadataSchema = SchemaFactory.createForClass(ReplyMetadata);

@Schema({ id: false, timestamps: true })
export class RepostMetadata {
  @Prop()
  ownerId: string;

  @Prop({ index: true })
  postSlug: string;
}

const RepostMetadataSchema = SchemaFactory.createForClass(RepostMetadata);

@Schema({ collection: 'posts', timestamps: true })
export class Post {
  public static from(data: Partial<Post>): Post {
    const entity = new Post();
    Object.assign(entity, data);

    return entity;
  }

  @Prop({
    index: true,
  })
  ownerId: string;

  @Prop({
    unique: true,
  })
  slug: string;

  @Prop()
  policy: POST_POLICY;

  @Prop()
  text: string;

  @Prop()
  type: POST_TYPE;

  @Prop({
    type: [Object],
  })
  media: object[];

  @Prop({
    type: [String],
    index: true,
  })
  tags: string[];

  @Prop({
    type: ReplyMetadataSchema,
  })
  replyMetadata: ReplyMetadata;

  @Prop({
    type: RepostMetadataSchema,
  })
  repostMetadata: RepostMetadata;

  @Prop({
    select: false,
    index: true,
  })
  deletedAt: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);
