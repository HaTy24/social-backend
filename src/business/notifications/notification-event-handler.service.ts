import { FundsTransferredEvent, SharesBoughtEvent, SharesSoldEvent, TagUserEvent, TokenTransferredEvent, } from '@business/event/event.model';
import { HttpWrapperService } from '@core/http/http-wrapper.service';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { APP_ACTION, APP_EVENT, ENV_KEY, INJECTION_TOKEN, } from '@shared/constants';
import { AuditService, ErrorLog } from 'mvc-common-toolkit';
import { NotificationHttpRequestService } from './notification-http-request.service';
import { NOTIFICATION_TYPE } from './notification.model';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationEventHandlerService extends HttpWrapperService {
  protected logger = new Logger(NotificationEventHandlerService.name);
  protected baseURL: string;

  constructor(
    protected httpService: HttpService,
    protected configService: ConfigService,
    protected notificationService: NotificationService,
    protected notificationHttpRequestService: NotificationHttpRequestService,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {
    super(httpService);
    this.baseURL = this.configService.get(ENV_KEY.WEBSOCKET_ENDPOINT);
  }

  @OnEvent(APP_EVENT.SHARE_BOUGHT)
  public async handleSharesBoughtEvent(
    event: SharesBoughtEvent,
  ): Promise<void> {
    try {
      this.logger.debug(`[${event.logId}]: Handle shares bought event`);

      const content = {
        buyerId: event.buyerId,
        buyerAddress: event.buyerAddress,
        buyerProfileImage: event.buyerProfileImage,
        buyerTwitterScreenName: event.buyerTwitterScreenName,
        ownerId: event.ownerId,
        ownerAddress: event.ownerAddress,
        ownerProfileImage: event.ownerProfileImage,
        ownerTwitterScreenName: event.ownerTwitterScreenName,
        createdAt: event.createdAt,
        txHash: event.txHash,
        quantity: event.quantity,
        buyPrice: event.buyPrice,
      };

      if (event.buyerId === event.ownerId) {
        return;
      }

      await this.notificationService.create({
        toUserIds: [event.ownerId, event.buyerId],
        type: NOTIFICATION_TYPE.SHARE_BOUGHT,
        content,
      });

      await this.notificationHttpRequestService.sendNotificationRequest({
        logId: event.logId,
        userIds: [event.ownerId, event.buyerId],
        content,
      });
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          logId: event.logId,
          message: error.message,
          action: APP_ACTION.PUSH_NOTIFICATION,
          payload: event,
        }),
      );
    }
  }

  @OnEvent(APP_EVENT.SHARE_SOLD)
  public async handleSharesSoldEvent(event: SharesSoldEvent): Promise<void> {
    try {
      this.logger.debug(`[${event.logId}]: Handle shares sold event`);

      const content = {
        sellerId: event.sellerId,
        sellerAddress: event.sellerAddress,
        sellerProfileImage: event.sellerProfileImage,
        sellerTwitterScreenName: event.sellerTwitterScreenName,
        ownerId: event.ownerId,
        ownerAddress: event.ownerAddress,
        ownerProfileImage: event.ownerProfileImage,
        ownerTwitterScreenName: event.ownerTwitterScreenName,
        createdAt: event.createdAt,
        txHash: event.txHash,
        quantity: event.quantity,
        sellPrice: event.sellPrice,
      };

      if (event.sellerId === event.ownerId) {
        return;
      }

      await this.notificationService.create({
        toUserIds: [event.ownerId, event.sellerId],
        type: NOTIFICATION_TYPE.SHARE_SOLD,
        content,
      });

      await this.notificationHttpRequestService.sendNotificationRequest({
        logId: event.logId,
        userIds: [event.ownerId, event.sellerId],
        content,
      });
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          logId: event.logId,
          message: error.message,
          action: APP_ACTION.PUSH_NOTIFICATION,
          payload: event,
        }),
      );
    }
  }

  @OnEvent(APP_EVENT.FUNDS_TRANSFERRED)
  public async handleFundsTransferredEvent(
    event: FundsTransferredEvent,
  ): Promise<void> {
    try {
      this.logger.debug(`[${event.logId}]: Handle funds transferred event`);

      const content = {
        fromUserId: event.fromUserId,
        fromAddress: event.fromAddress,
        fromUserProfileImage: event.fromUserProfileImage,
        fromUserTwitterScreenName: event.fromUserTwitterScreenName,
        toUserId: event.toUserId,
        toAddress: event.toAddress,
        toUserProfileImage: event.toUserProfileImage,
        toUserTwitterScreenName: event.toUserTwitterScreenName,
        createdAt: event.createdAt,
        txHash: event.txHash,
        amount: event.amount,
      };

      if (event.fromUserId === event.toUserId) {
        return;
      }

      await this.notificationService.create({
        toUserIds: [event.fromUserId, event.toUserId],
        type: NOTIFICATION_TYPE.FUNDS_TRANSFERRED,
        content,
      });

      await this.notificationHttpRequestService.sendNotificationRequest({
        logId: event.logId,
        userIds: [event.fromUserId, event.toUserId],
        content,
      });
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          logId: event.logId,
          message: error.message,
          action: APP_ACTION.PUSH_NOTIFICATION,
          payload: event,
        }),
      );
    }
  }

  @OnEvent(APP_EVENT.TOKEN_TRANSFERRED)
  public async handleTokenTransferredEvent(
    event: TokenTransferredEvent,
  ): Promise<void> {
    try {
      this.logger.debug(`[${event.logId}]: Handle token transferred event`);

      const content = {
        fromUserId: event.fromUserId,
        fromAddress: event.fromAddress,
        fromUserProfileImage: event.fromUserProfileImage,
        fromUserTwitterScreenName: event.fromUserTwitterScreenName,
        toUserId: event.toUserId,
        toAddress: event.toAddress,
        token: event.token,
        tokenAddress: event.tokenAddress,
        toUserProfileImage: event.toUserProfileImage,
        toUserTwitterScreenName: event.toUserTwitterScreenName,
        createdAt: event.createdAt,
        txHash: event.txHash,
        amount: event.amount,
      };

      if (event.fromUserId === event.toUserId) {
        return;
      }

      await this.notificationService.create({
        toUserIds: [event.fromUserId, event.toUserId],
        type: NOTIFICATION_TYPE.TOKEN_TRANSFERRED,
        content,
      });

      await this.notificationHttpRequestService.sendNotificationRequest({
        logId: event.logId,
        userIds: [event.fromUserId, event.toUserId],
        content,
      });
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          logId: event.logId,
          message: error.message,
          action: APP_ACTION.PUSH_NOTIFICATION,
          payload: event,
        }),
      );
    }
  }

  @OnEvent(APP_EVENT.TAG_USER)
  public async handleTagUserEvent(event: TagUserEvent): Promise<void> {
    try {
      this.logger.debug(`[${event.logId}]: Handle tag user event`);

      const content = {
        postOwnerId: event.postOwnerId,
        postOwnerScreenName: event.postOwnerScreenName,
        postOwnerProfileImage: event.postOwnerProfileImage,
        postSlug: event.postSlug,
        postText: event.postText,
      };

      await this.notificationService.create({
        toUserIds: event.taggedUserIds,
        type: NOTIFICATION_TYPE.TAGGED_USER,
        content,
      });

      await this.notificationHttpRequestService.sendNotificationRequest({
        logId: event.logId,
        userIds: event.taggedUserIds,
        content,
      });
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          logId: event.logId,
          message: error.message,
          action: APP_ACTION.PUSH_NOTIFICATION,
          payload: event,
        }),
      );
    }
  }
}
