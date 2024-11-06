import { HydratedDocument, SchemaTypes } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { CHAT_TYPE, ENTITY_STATUS } from '@shared/constants';
import { HasTimestamp } from '@shared/types';

export type ChatDocument = HydratedDocument<Chat> & HasTimestamp;

@Schema({ timestamps: false, id: false })
export class ChatMetadata {
  @Prop({
    type: String,
  })
  name: string;
}

@Schema({ collection: 'chats', timestamps: true })
export class Chat {
  @Prop({
    type: [String],
    index: true,
  })
  participants: string[];

  @Prop({
    type: String,
    index: true,
  })
  type: CHAT_TYPE;

  @Prop({
    type: SchemaTypes.Mixed,
  })
  metadata: ChatMetadata;

  @Prop({
    type: String,
    default: ENTITY_STATUS.ACTIVE,
  })
  status: ENTITY_STATUS;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
