import { HydratedDocument, SchemaTypes } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export enum INTERACTION_ACTION {
  LIKE = 'like',
  SHARE = 'share',
}

export type InteractionDocument = HydratedDocument<Interaction>;

@Schema({ collection: 'interactions' })
export class Interaction {
  @Prop({ index: true })
  actionUserId: string;

  @Prop({ index: true })
  postSlug: string;

  @Prop({
    index: true,
  })
  action: INTERACTION_ACTION;

  @Prop({
    type: SchemaTypes.Mixed,
  })
  metadata: any;
}

export const InteractionSchema = SchemaFactory.createForClass(Interaction);
