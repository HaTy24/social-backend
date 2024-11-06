import { Cache } from 'cache-manager';
import { Model } from 'mongoose';
import {
  AuditService,
  ErrorLog,
  OperationResult,
  stringUtils,
} from 'mvc-common-toolkit';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpStatus, Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { ResponseCode } from '@core/dto/response';

import { BlockchainWrapperService } from '@business/blockchain/services/blockchain-wrapper.service';
import { User } from '@business/user/user.entity';
import { UserService } from '@business/user/user.service';

import {
  APP_ACTION,
  CHAT_MESSAGE_TYPE,
  DEFAULT_CACHE_TTL,
  ENTITY_STATUS,
  INJECTION_TOKEN,
} from '@shared/constants';
import { BaseCRUDService } from '@shared/services/base-crud-service';
import { ChatInformation, MessageDTO, ReqContext } from '@shared/types';

import { Chat, ChatDocument } from './chat.model';
import { MessageDocument } from './message.model';
import { MessageService } from './message.service';

export class ChatService extends BaseCRUDService {
  protected logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(Chat.name)
    model: Model<Chat>,

    protected messageService: MessageService,
    protected userService: UserService,
    protected blockchainService: BlockchainWrapperService,

    @Inject(CACHE_MANAGER) private cacheService: Cache,
    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {
    super(model);
  }

  public async getChat(
    context: ReqContext,
    chatId: string,
    userId: string,
  ): Promise<OperationResult> {
    try {
      const key = `viewChat:${chatId}`;
      const cached: Chat = await this.cacheService.get(key);
      if (cached) {
        this.logger.debug(
          `[${context.logId}]: Loaded ${key} from cache successful`,
        );

        if (!cached.participants.includes(userId)) {
          return {
            success: false,
            message: 'user not chat member',
            httpCode: HttpStatus.FORBIDDEN,
          };
        }

        return {
          success: true,
          data: cached,
        };
      }

      const chat: ChatDocument = await this.getOne({
        _id: chatId,
        status: ENTITY_STATUS.ACTIVE,
        participants: {
          $in: [userId],
        },
      });
      if (!chat) {
        return {
          success: false,
          message: 'chat not found',
          code: ResponseCode.NOT_FOUND,
        };
      }

      if (chat) await this.cacheService.set(key, chat, DEFAULT_CACHE_TTL);

      return {
        success: true,
        data: chat,
      };
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          logId: context.logId,
          message: error.message,
          payload: { chatId },
          action: APP_ACTION.GET_CHAT,
        }),
      );
    }
  }

  public async removeChat(context: ReqContext, chatId: string): Promise<void> {
    try {
      await this.forceDeleteById(chatId);
      await this.messageService.bulkDelete({ chatId });
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          logId: context.logId,
          message: error.message,
          payload: { chatId },
          action: APP_ACTION.REMOVE_CHAT,
        }),
      );
    }
  }

  public async populateChatInformation(
    context: ReqContext,
    userId: string,
    chat: ChatDocument,
  ): Promise<ChatInformation> {
    try {
      const chatId = chat._id.toString();
      const populatedParticipants = await this.populateParticipants(
        chat.participants,
      );

      const latestMessage: MessageDocument = await this.messageService.getOne(
        {
          chatId,
        },
        {
          sort: {
            createdAt: -1,
          },
        },
      );

      const unreadCount = await this.messageService.countUnreadMessages(
        context,
        userId,
        chatId,
      );

      return {
        id: chatId,
        type: chat.type,
        participants: populatedParticipants,
        unreadCount,
        lastMessage: {
          metadata: latestMessage?.metadata,
          senderId: latestMessage?.senderId,
          content: !latestMessage?.metadata.deleteStatus?.deletedAt
            ? latestMessage?.content
            : { text: '', images: [] },
          createdAt: latestMessage?.createdAt,
        },
        status: chat.status,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      };
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          logId: context.logId,
          message: error.message,
          payload: chat,
          action: APP_ACTION.POPULATE_CHAT_INFORMATION,
        }),
      );

      return {
        id: chat.id,
        type: chat.type,
        participants: [],
        unreadCount: 0,
        lastMessage: null,
        status: chat.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  protected async populateParticipants(
    participants: string[],
  ): Promise<Partial<User>[]> {
    const populatedParticipants: Partial<User>[] = await Promise.all(
      participants.map(async (userId) => {
        const foundUser = await this.userService.getById(userId);

        // Just return userId if failed to fetch user
        if (!foundUser) {
          return {
            id: userId,
            imageUrl: null,
            status: null,
          };
        }

        const logId = stringUtils.generateRandomId();

        const viewUserBalance = await this.blockchainService.viewUserBalance(
          logId,
          foundUser.walletAddress,
        );

        const sharePriceResult = await this.blockchainService.viewSharesPrice(
          logId,
          foundUser.walletAddress,
        );
        const { buyPrice = '0', sellPrice = '0' } = sharePriceResult.data || {};
        const share = { buyPrice, sellPrice };

        return {
          id: foundUser.id,
          fullName: foundUser.fullname,
          twitterScreenName: foundUser.twitterScreenName,
          imageUrl: foundUser.profile_image_url,
          status: foundUser.status,
          balance: viewUserBalance.success ? viewUserBalance.data : '0',
          share,
        };
      }),
    );

    return populatedParticipants;
  }

  public async countAllUnreadMessages(userId: string) {
    const data = await this.domainModel.aggregate([
      {
        $match: {
          participants: {
            $in: [userId],
          },
        },
      },
      {
        $lookup: {
          from: 'messages',
          localField: '_id',
          foreignField: 'chatId',
          as: 'messageDetail',
          pipeline: [
            {
              $match: {
                'metadata.readStatus.userId': {
                  $ne: userId,
                },
              },
            },
          ],
        },
      },
      {
        $unwind: '$messageDetail',
      },
      {
        $count: 'totalCount',
      },
    ]);

    return data[0];
  }

  public async addMessageToChat(
    context: ReqContext,
    userId: string,
    chatId: string,
    content: MessageDTO,
    options?: { description?: string; deletedAt?: Date },
  ): Promise<OperationResult<MessageDocument>> {
    try {
      const totalMessage = await this.messageService.count({
        chatId,
      });

      const createdMsg: MessageDocument = await this.messageService.create({
        senderId: userId,
        chatId,
        content,
        position: totalMessage,
        metadata: {
          deleteStatus: {
            deletedAt: options?.deletedAt || null,
            description: options?.description || '',
          },
          // The user must first read its own message.
          readStatus: [
            {
              userId,
              readAt: new Date(),
            },
          ],
        },
      });

      return {
        success: true,
        data: createdMsg,
      };
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          action: APP_ACTION.ADD_MESSAGE_TO_CHAT,
          message: error.message,
          logId: context.logId,
          payload: {
            userId,
            chatId,
            content,
          },
        }),
      );

      return {
        success: false,
        message: error.message,
      };
    }
  }

  public async markMessageAsRead(
    context: ReqContext,
    userId: string,
    chatId: string,
  ): Promise<OperationResult> {
    try {
      const messages = await this.messageService.getAll({
        chatId,
        'metadata.readStatus.userId': { $ne: userId },
      });

      await Promise.all(
        messages.map(async (message) => {
          const updatedMsg = message.addUserToReadList(userId);

          await this.messageService.updateById(message.id, updatedMsg);
        }),
      );

      return {
        success: true,
      };
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          logId: context.logId,
          action: APP_ACTION.MARK_MESSAGE_AS_READ,
          message: error.message,
          payload: {
            userId,
            chatId,
          },
        }),
      );

      return {
        success: false,
        message: error.message,
      };
    }
  }

  public async replyMessageToChat(
    context: ReqContext,
    userId: string,
    chatId: string,
    messageId: string,
    content: MessageDTO,
    options?: { description?: string; deletedAt?: Date },
  ): Promise<OperationResult<MessageDocument>> {
    try {
      const originalMessage = await this.messageService.getById(messageId);
      if (!originalMessage) {
        return {
          success: false,
          code: ResponseCode.NOT_FOUND,
          message: 'message not found',
        };
      }

      const repliedMsg = await this.messageService.create({
        senderId: userId,
        chatId,
        content,
        type: CHAT_MESSAGE_TYPE.REPLY_MESSAGE,
        metadata: {
          deleteStatus: {
            deletedAt: options?.deletedAt || null,
            description: options?.description || '',
          },
          // The user must first read its own message.
          readStatus: [
            {
              userId,
              readAt: new Date(),
            },
          ],

          reply: {
            ownerId: originalMessage.senderId,
            messageId,
          },
        },
      });

      await this.messageService.create(repliedMsg);

      return {
        success: true,
        data: repliedMsg,
      };
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          action: APP_ACTION.REPLY_CHAT_MESSAGE,
          message: error.message,
          logId: context.logId,
          payload: {
            userId,
            chatId,
            content,
          },
        }),
      );

      return {
        success: false,
        message: error.message,
      };
    }
  }
}
