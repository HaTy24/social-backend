import { SOURCE_TYPE } from "@shared/constants";
import { ImageResizeResult } from "@shared/types";

export class SharesBoughtEvent {
  public static from(data: Partial<SharesBoughtEvent>): SharesBoughtEvent {
    const newEvent = new SharesBoughtEvent();

    Object.assign(newEvent, data);

    return newEvent;
  }

  public logId: string;
  public buyerId: string;
  public buyerAddress: string;
  public buyerProfileImage: string;
  public buyerTwitterScreenName: string;
  public ownerId: string;
  public ownerAddress: string;
  public ownerProfileImage: string;
  public ownerTwitterScreenName: string;
  public createdAt: Date;
  public txHash: string;
  public quantity: number;
  public buyPrice: string;
}

export class TagUserEvent {
  public static from(data: Partial<TagUserEvent>): TagUserEvent {
    const newEvent = new TagUserEvent();

    Object.assign(newEvent, data);

    return newEvent;
  }

  public logId: string;
  public postOwnerId: string;
  public postOwnerScreenName: string;
  public postOwnerProfileImage: string;
  public postSlug: string;
  public postText: string;
  public taggedUserIds: string[];
  public createdAt: Date;
}

export class SharesSoldEvent {
  public static from(data: Partial<SharesSoldEvent>): SharesSoldEvent {
    const newEvent = new SharesSoldEvent();

    Object.assign(newEvent, data);

    return newEvent;
  }

  public logId: string;
  public sellerId: string;
  public sellerAddress: string;
  public sellerProfileImage: string;
  public sellerTwitterScreenName: string;
  public ownerId: string;
  public ownerAddress: string;
  public ownerProfileImage: string;
  public ownerTwitterScreenName: string;
  public createdAt: Date;
  public txHash: string;
  public quantity: number;
  public sellPrice: string;
}

export class FundsTransferredEvent {
  public static from(
    data: Partial<FundsTransferredEvent>,
  ): FundsTransferredEvent {
    const newEvent = new FundsTransferredEvent();

    Object.assign(newEvent, data);

    return newEvent;
  }

  public logId: string;
  public fromAddress: string;
  public fromUserId: string;
  public fromUserProfileImage: string;
  public fromUserTwitterScreenName: string;
  public toUserId: string;
  public toAddress: string;
  public toUserProfileImage: string;
  public toUserTwitterScreenName: string;
  public createdAt: Date;
  public txHash: string;
  public amount: string;
}

export class TokenTransferredEvent {
  public static from(
    data: Partial<TokenTransferredEvent>,
  ): TokenTransferredEvent {
    const newEvent = new TokenTransferredEvent();

    Object.assign(newEvent, data);

    return newEvent;
  }

  public logId: string;
  public fromUserId: string;
  public fromAddress: string;
  public fromUserProfileImage: string;
  public fromUserTwitterScreenName: string;
  public toUserId: string;
  public toAddress: string;
  public toUserProfileImage: string;
  public toUserTwitterScreenName: string;
  public createdAt: Date;
  public token: string;
  public tokenAddress: string;
  public txHash: string;
  public amount: string;
}

export class EmailUpdatedEvent {
  public static from(data: Partial<EmailUpdatedEvent>): EmailUpdatedEvent {
    const newEvent = new EmailUpdatedEvent();

    Object.assign(newEvent, data);

    return newEvent;
  }

  public logId: string;
  public userId: string;
  public oldEmail: string;
  public newEmail: string;
  public createdAt: Date;
}

export class UserUpdatedEvent {
  public static from(data: Partial<UserUpdatedEvent>): UserUpdatedEvent {
    const newEvent = new UserUpdatedEvent();

    Object.assign(newEvent, data);

    return newEvent;
  }

  public logId: string;
  public userId: string;
  public referenceId?: string;
  public createdAt: Date;
}

export class ImageProcessedEvent {
  public static from(data: Partial<ImageProcessedEvent>): ImageProcessedEvent {
    const newEvent = new ImageProcessedEvent();

    Object.assign(newEvent, data);

    return newEvent;
  }

  public logId: string;
  public sourceType: SOURCE_TYPE;
  public imageIndex: number;
  public messageId?: string;
  public postSlug?: string;
  public imagesResized: ImageResizeResult;
  public createdAt: Date;
}

export class ImageRejectedEvent {
  public static from(data: Partial<ImageRejectedEvent>): ImageRejectedEvent {
    const newEvent = new ImageRejectedEvent();

    Object.assign(newEvent, data);

    return newEvent;
  }

  public logId: string;
  public sourceType: SOURCE_TYPE;
  public imageIndex: number;
  public messageId?: string;
  public postSlug?: string;
  public fileName: string;
  public fileURL: string;
  public createdAt: Date;
}
