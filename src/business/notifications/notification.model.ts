import { HydratedDocument, SchemaTypes } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export enum NOTIFICATION_TYPE {
  SHARE_BOUGHT = 'shares_bought',
  SHARE_SOLD = 'shares_sold',
  FUNDS_TRANSFERRED = 'funds_transferred',
  TOKEN_TRANSFERRED = 'token_transferred',
  POST_REACT = 'post_react',
  POST_SHARE = 'post_share',
  POST_COMMENT = 'post_comment',
  POST_REPLY = 'post_reply',
  TAGGED_USER = 'tagged_user',
}

export type NotificationDocument = HydratedDocument<Notification>;

export class NotificationReadInformation {
  @Prop({
    index: true,
  })
  userId: string;
  @Prop()
  readAt: Date;
}

const NotificationReadInformationSchema = SchemaFactory.createForClass(
  NotificationReadInformation,
);

@Schema({ timestamps: false, id: false })
export class NotificationMetadata {
  @Prop({
    type: [NotificationReadInformationSchema],
  })
  readStatus: NotificationReadInformation[];
}

@Schema({ collection: 'notifications', timestamps: true })
export class Notification {
  @Prop({ index: true })
  toUserIds: string[];

  @Prop({
    index: true,
  })
  type: NOTIFICATION_TYPE;

  @Prop()
  group: string;

  @Prop({
    type: SchemaTypes.Mixed,
  })
  content: Record<string, any>;

  @Prop({
    type: SchemaTypes.Mixed,
  })
  metadata: NotificationMetadata;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
