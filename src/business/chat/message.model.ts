import { HydratedDocument, SchemaTypes } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { CHAT_MESSAGE_TYPE } from '@shared/constants';
import { HasTimestamp } from '@shared/types';

export type MessageDocument = HydratedDocument<Message> &
  HasTimestamp & {
    addUserToReadList(userId: string): MessageDocument;
  } & { _doc: Message };

export class MessageReadInformation {
  @Prop({
    index: true,
  })
  userId: string;

  @Prop()
  readAt: Date;
}

const MessageReadInformationSchema = SchemaFactory.createForClass(
  MessageReadInformation,
);

@Schema({ timestamps: false, id: false })
export class ReplyMetadata {
  @Prop({ index: true })
  ownerId: string;

  @Prop({ index: true })
  messageId: string;
}

const ReplyMetadataSchema = SchemaFactory.createForClass(ReplyMetadata);

@Schema({ timestamps: false, id: false })
export class DeleteMetadata {
  @Prop()
  deletedAt: Date;

  @Prop()
  description: string;
}

const DeleteMetadataSchema = SchemaFactory.createForClass(DeleteMetadata);

@Schema({ timestamps: false, id: false })
export class MessageMetadata {
  @Prop({
    type: [MessageReadInformationSchema],
  })
  readStatus: MessageReadInformation[];

  @Prop({
    type: [DeleteMetadataSchema],
  })
  deleteStatus: DeleteMetadata;

  @Prop({
    type: [ReplyMetadataSchema],
  })
  reply: ReplyMetadata;
}

@Schema({ timestamps: false, id: false })
export class Content {
  @Prop({ type: String })
  text: string;

  @Prop({
    type: [Object],
  })
  images: object[];
}

@Schema({ collection: 'messages', timestamps: true })
export class Message {
  @Prop({
    index: true,
  })
  senderId: string;

  @Prop({
    index: true,
    type: SchemaTypes.ObjectId,
  })
  chatId: string;

  @Prop({
    type: String,
    index: true,
    default: CHAT_MESSAGE_TYPE.SEND_MESSAGE,
  })
  type: CHAT_MESSAGE_TYPE;

  @Prop({
    type: SchemaTypes.Mixed,
  })
  content: Content;

  @Prop({
    type: SchemaTypes.Mixed,
  })
  metadata: MessageMetadata;

  @Prop({
    index: true,
    type: Number
  })
  position: number;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.methods.addUserToReadList = function (
  userId: string,
): MessageDocument {
  const readData = {
    userId,
    readAt: new Date(),
  };

  const readList: MessageReadInformation[] = this.metadata?.readStatus || [];

  if (readList.find((i) => i.userId === userId)) return this;

  readList.push(readData);

  return this;
};
