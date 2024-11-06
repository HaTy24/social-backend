import { Model } from 'mongoose';
import { AuditService, ErrorLog } from 'mvc-common-toolkit';

import { Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { extractPublicInfo } from '@business/user/user.entity';
import { UserService } from '@business/user/user.service';

import {
  APP_ACTION,
  CHAT_MESSAGE_TYPE,
  INJECTION_TOKEN,
} from '@shared/constants';
import { BaseCRUDService } from '@shared/services/base-crud-service';
import { ReqContext } from '@shared/types';

import { Message, MessageDocument } from './message.model';

export class MessageService extends BaseCRUDService {
  protected logger = new Logger(MessageService.name);

  constructor(
    protected userService: UserService,

    @InjectModel(Message.name)
    model: Model<Message>,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {
    super(model);
  }

  public async populateMessageInformation(
    context: ReqContext,
    message: MessageDocument,
  ) {
    try {
      const senderInfomation = await this.userService.getById(message.senderId);

      if (message.metadata.deleteStatus?.deletedAt) {
        return {
          message: {
            senderId: message.senderId,
            metadata: message.metadata
          },
          sender: extractPublicInfo(senderInfomation),
        };
      }

      if (message.type === CHAT_MESSAGE_TYPE.REPLY_MESSAGE) {
        const messageReplied = await this.getById(
          message.metadata.reply.messageId,
        );

        const originalSender = await this.userService.getById(
          messageReplied.senderId,
        );

        if (messageReplied.metadata.deleteStatus?.deletedAt) {
          return {
            message: {
              ...message._doc,
              messageReplied: {
                message: {
                  senderId: messageReplied.senderId,
                  metadata: messageReplied.metadata
                },
                sender: extractPublicInfo(originalSender),
              },
            },
            sender: extractPublicInfo(senderInfomation),
          };
        }

        return {
          message: {
            ...message._doc,
            messageReplied: {
              message: messageReplied,
              sender: extractPublicInfo(originalSender),
            },
          },
          sender: extractPublicInfo(senderInfomation),
        };
      }

      return {
        message,
        sender: extractPublicInfo(senderInfomation),
      };
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          logId: context.logId,
          message: error.message,
          payload: message,
          action: APP_ACTION.POPULATE_MESSAGE_INFORMATION,
        }),
      );

      return { message, sender: {} };
    }
  }

  public async countUnreadMessages(
    context: ReqContext,
    userId: string,
    chatId: string,
  ): Promise<number> {
    try {
      const countUnreadMessages = await this.count({
        chatId,
        'metadata.readStatus.userId': { $ne: userId },
      });

      return countUnreadMessages;
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          logId: context.logId,
          message: error.message,
          action: APP_ACTION.COUNT_UNREAD_MESSAGES,
          payload: {
            userId,
            chatId,
          },
        }),
      );

      return 0;
    }
  }
}
