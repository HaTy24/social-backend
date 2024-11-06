import { MessageDocument } from '@business/chat/message.model';
import { INTERACTION_ACTION } from '@business/interaction/interaction.model';
import { User } from '@business/user/user.entity';

import { CHAT_TYPE, ENTITY_STATUS } from './constants';

import {
  IMAGE_PROCESS_RESULT,
  IMAGE_SIZE,
  IMG_TASK_GOAL,
  IMG_TASK_TYPE,
  SOURCE_TYPE,
} from './constants';

export interface PaginationResult<T> {
  totalCount: number;
  items: T[];
}

export interface VerifyPinResult {
  isValid: boolean;
  attemptsLeft?: number;
  isLocked?: boolean;
}

export interface HasTimestamp {
  createdAt: Date;
  updatedAt: Date;
}

export interface Typed<T = any> {
  type: T;
}

export interface ReqContext {
  logId: string;
}

export interface ChatInformation {
  id: string;
  unreadCount: number;
  type: CHAT_TYPE;
  lastMessage: Partial<MessageDocument>;
  participants: Partial<User>[];
  status: ENTITY_STATUS;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageDTO {
  text?: string;
  images?: object[];
}

export interface InvestmentReport {
  totalShares: number;
  buyVolume: string;
  sellVolume: string;
  details: Record<string, UserInvestmentData>;
}

export interface UserInvestmentData {
  count: number;
  percentage: string;
}

export interface PostInteractionData {
  likesCount: number;
  commentCount: number;
  retweetCount: number;
  viewerInteractions: INTERACTION_ACTION[];
}

export interface UserEarnedFeesResponse {
  referralFee: string;
  tradingFee: string;
}

export interface UserEarnedFees {
  referralFee: string;
  subjectFee: string;
}

export interface FindOptions {
  sort: Record<string, number>;
  select: string;
  populate: any[];
}

export interface ViewSharesPriceResponse {
  buyPrice: string;
  sellPrice: string;
}

export interface ValidateAGCReferenceIdResult {
  success: boolean;
  message: string;
  data: {
    referenceid: string;
    isvalid: boolean;
  }
}

export interface UserRelationship {
  address: string;
  count: number;
}

export interface UserRelationshipResult {
  holdingAddresses: UserRelationship[];
  holderAddresses: UserRelationship[];
}

export interface GenNewKeyResponse {
  recoveryPassword: string;
  publicKey: string;
  userSecret: string;
  serverSecret: string;
}

export interface ViewUserSharesCountResponse {
  holderAddresses: { address: string; count: number }[];
  holdingAddresses: { address: string; count: number }[];
}

export interface RecentTrade {
  userAddress: string;
  ownerAddress: string;
  createdAt: Date;
  quantity: number;
  amount: string;
  action: 'buy_shares' | 'sell_shares';
}

export interface ImgUploadEventPayload {
  sourceType: SOURCE_TYPE;
  imageIndex: number;
  postSlug?: string;
  messageId?: string;
  fileName: string;
  fileURL: string;
  type: IMG_TASK_TYPE;
  goal: IMG_TASK_GOAL;
}

export interface ImageResizedEventPayload {
  imageIndex: number;
  sourceType: SOURCE_TYPE;
  postSlug?: string;
  messageId?: string;
  fileName?: string;
  fileURL?: string;
  processedData?: ImageResizeResult;
  type: IMG_TASK_TYPE;
  goal: IMG_TASK_GOAL;
  processed?: ImageProcessingStep[];
  result: IMAGE_PROCESS_RESULT;
  prev: any;
  reason?: string;
}

export interface ImgMetadata {
  postSlug: string;
}

export type ImageResizeResult = Record<IMAGE_SIZE, string>;

export type ImageProcessingStep = 'resize' | 'compress' | 'rotate' | 'blur';
