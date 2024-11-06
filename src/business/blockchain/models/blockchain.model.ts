import { HydratedDocument } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type BlockchainProfileDocument = HydratedDocument<BlockchainProfile>;

@Schema({ collection: 'blockchain_profiles', timestamps: true })
export class BlockchainProfile {
  @Prop({ index: true })
  userId: string;

  @Prop({ index: true })
  walletAddress: string;

  @Prop({ index: true })
  isVote: boolean;

  @Prop({ default: 0 })
  balance: number;

  @Prop({ default: 0 })
  tradingVolume: number;

  @Prop({ default: 0 })
  referralFee: number;

  @Prop({ default: 0 })
  subjectFee: number;

  @Prop({ default: 0 })
  earned: number;

  @Prop({ default: 0 })
  sold: number;

  @Prop({ default: 0 })
  bought: number;

  @Prop({ default: 0 })
  holding: number;

  @Prop({ default: 0 })
  holder: number;

  @Prop({ type: Date, default: Date.now })
  lastActivity: Date;
}

export const BlockchainProfileSchema =
  SchemaFactory.createForClass(BlockchainProfile);
