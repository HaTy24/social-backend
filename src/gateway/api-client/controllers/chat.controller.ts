import { AuditService, HttpResponse } from 'mvc-common-toolkit';
import { AuthGuard } from 'src/gateway/api-client/auth/auth.guard';

import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Logger,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { RequestUser } from '@core/decorators/request-user';
import { ResponseCode } from '@core/dto/response';
import { LogId } from '@core/logging/logging';
import { BSONIdValidatorPipe } from '@core/pipes/bson-id-validator.pipe';

import {
  DeleteMessageDTO,
  PaginateChatMessagesDTO,
  PaginateUserChatsDTO,
  ReplyMessageDTO,
  SendMessageDTO,
} from '@business/chat/chat.dto';
import { ChatDocument } from '@business/chat/chat.model';
import { ChatService } from '@business/chat/chat.service';
import { Message, MessageDocument } from '@business/chat/message.model';
import { MessageService } from '@business/chat/message.service';
import { ImageService } from '@business/image/image.service';
import { MessageQueueService } from '@business/message-queue/message-queue.service';
import { User } from '@business/user/user.entity';
import { WebsocketService } from '@business/websocket/websocket.service';

import {
  CHAT_MESSAGE_TYPE,
  ENTITY_STATUS,
  ERR_CODE,
  IMG_TASK_GOAL,
  IMG_TASK_TYPE,
  INJECTION_TOKEN,
  SOURCE_TYPE,
} from '@shared/constants';
import { cleanHTML } from '@shared/helpers/text-cleaning-helper';
import { ReqContext } from '@shared/types';

@ApiTags('client/chats')
@Controller('chats')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ChatController {
  protected logger = new Logger(ChatController.name);

  constructor(
    protected configService: ConfigService,
    protected chatService: ChatService,
    protected messageService: MessageService,
    protected wsService: WebsocketService,
    protected imageService: ImageService,
    protected messageQueueService: MessageQueueService,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {}

  @Get()
  public async paginateUserChats(
    @LogId() logId: string,
    @Query() dto: PaginateUserChatsDTO,
    @RequestUser() user: User,
  ): Promise<HttpResponse> {
    dto.addFilter({
      status: ENTITY_STATUS.ACTIVE,
      participants: {
        $in: [user.id],
      },
    });

    const paginationResult = await this.chatService.paginate(dto, {
      sort: { updatedAt: -1 },
    });

    const chats = paginationResult.rows as ChatDocument[];

    const populatedChats = await Promise.all(
      chats.map((chat) =>
        this.chatService.populateChatInformation({ logId }, user.id, chat),
      ),
    );

    return {
      success: true,
      data: {
        rows: populatedChats,
        total: paginationResult.total,
      },
    };
  }

  @Get('unread-messages')
  public async countUnreadNotifications(
    @LogId() logId: string,
    @RequestUser() user: User,
  ): Promise<HttpResponse> {
    const countResult = await this.chatService.countAllUnreadMessages(user.id);

    return {
      success: true,
      data: countResult?.totalCount || 0,
    };
  }

  @Get(':chatId/detail')
  public async chatDetail(
    @LogId() logId: string,
    @Param('chatId') chatId: string,
    @RequestUser() user: User,
  ): Promise<HttpResponse> {
    const context: ReqContext = {
      logId,
    };

    const chat = await this.chatService.getChat(context, chatId, user.id);
    if (!chat.success) {
      return chat;
    }

    const { data } = chat;

    const populateChatInfo = await this.chatService.populateChatInformation(
      { logId },
      user.id,
      data,
    );

    return {
      success: true,
      data: populateChatInfo,
    };
  }

  @Get(':chatId/messages')
  public async paginateChatMessages(
    @LogId() logId: string,
    @Param('chatId') chatId: string,
    @Query() dto: PaginateChatMessagesDTO,
    @RequestUser() user: User,
  ): Promise<HttpResponse> {
    const context: ReqContext = {
      logId,
    };

    const chat = await this.chatService.getChat(context, chatId, user.id);
    if (!chat.success) {
      return chat;
    }

    dto.addFilter({
      chatId,
    });

    let paginationResult = {
      rows: [],
      total: 0,
      limit: dto.limit,
      offset: dto.offset,
    };

    if (dto.position) {
      dto.addFilter({
        position: {
          $gt: Number(dto.position - dto.limit),
          $lt: Number(dto.position),
        },
      });

      const totalMessage = await this.messageService.count({ chatId });
      const messages = await this.messageService.getAll(
        {
          ...dto.filter,
        },
        {
          sort: {
            createdAt: -1,
          },
        },
      );

      paginationResult.rows = messages;
      paginationResult.total = totalMessage;
    } else {
      paginationResult = await this.messageService.paginate(dto, {
        sort: {
          createdAt: -1,
        },
      });
    }

    const messages = paginationResult.rows;

    const populatedMessages = await Promise.all(
      messages.map((message) =>
        this.messageService.populateMessageInformation({ logId }, message),
      ),
    );

    return {
      success: true,
      data: {
        rows: populatedMessages,
        total: paginationResult.total,
      },
    };
  }

  @Post(':chatId/messages')
  @UsePipes(new BSONIdValidatorPipe('chatId'))
  public async sendMessage(
    @LogId() logId: string,
    @Param('chatId') chatId: string,
    @RequestUser() user: User,
    @Body() dto: SendMessageDTO,
  ) {
    const context: ReqContext = {
      logId,
    };

    const chat = await this.chatService.getChat(context, chatId, user.id);
    if (!chat.success) {
      return chat;
    }

    const { data } = chat;

    await this.chatService.updateById(data._id, {
      updatedAt: new Date(),
    });

    let isImageNSFW = false;
    if (dto.images && dto.images.length) {
      const checkNSFWResult = await Promise.all(
        dto.images.map(async (imageUrl: string) => {
          const result = await this.imageService.checkImageNSFW(
            logId,
            imageUrl,
          );

          const { success, data } = result;
          if (!success || !data.isSafe) {
            return false;
          }
          return true;
        }),
      );

      isImageNSFW = checkNSFWResult.includes(false);
    }

    if (isImageNSFW) {
      const addMsgResult = await this.chatService.addMessageToChat(
        context,
        user.id,
        chatId,
        { text: cleanHTML(dto.content) },
        {
          description: 'this message was deleted due to inappropriate content',
          deletedAt: new Date(),
        },
      );

      await this.wsService.sendChatMessageTo(
        context,
        chatId,
        user.id,
        data.participants,
        addMsgResult.data,
      );

      return {
        success: false,
        message: 'image is nsfw',
        code: ERR_CODE.IMG_IS_NSFW,
      };
    }

    const chatContent = {
      text: cleanHTML(dto.content),
      images:
        dto.images && dto.images.length
          ? dto.images.map((img) => ({ original: img }))
          : [],
    };

    const addMsgResult = await this.chatService.addMessageToChat(
      context,
      user.id,
      chatId,
      chatContent,
    );
    if (!addMsgResult.success) {
      return addMsgResult;
    }

    await this.wsService.sendChatMessageTo(
      context,
      chatId,
      user.id,
      data.participants,
      addMsgResult.data,
    );

    if (dto.images && dto.images.length) {
      await Promise.all(
        dto.images.map(async (imageUrl: string, index: number) => {
          await this.messageQueueService.publishMessage(
            JSON.stringify({
              sourceType: SOURCE_TYPE.MESSAGE,
              imageIndex: index,
              messageId: addMsgResult.data._id,
              fileName: imageUrl.split('/')[3],
              fileURL: imageUrl,
              type: IMG_TASK_TYPE.USER_UPLOAD,
              goal: IMG_TASK_GOAL.RESIZE_AND_COMPRESS,
            }),
          );
        }),
      );
    }

    return {
      success: true,
    };
  }

  @Post(':chatId/messages/reply')
  @UsePipes(new BSONIdValidatorPipe('chatId'))
  public async replyMessage(
    @LogId() logId: string,
    @Param('chatId') chatId: string,
    @RequestUser() user: User,
    @Body() dto: ReplyMessageDTO,
  ): Promise<HttpResponse> {
    const context: ReqContext = {
      logId,
    };

    const chat = await this.chatService.getChat(context, chatId, user.id);
    if (!chat.success) {
      return chat;
    }

    const { data } = chat;

    const originalMessage = await this.messageService.getById(dto.messageId);
    if (!originalMessage) {
      return {
        success: false,
        message: 'message not found',
        code: ResponseCode.NOT_FOUND,
      };
    }

    await this.chatService.updateById(data._id, {
      updatedAt: new Date(),
    });

    let isImageNSFW = false;
    if (dto.images && dto.images.length) {
      const checkNSFWResult = await Promise.all(
        dto.images.map(async (imageUrl: string) => {
          const result = await this.imageService.checkImageNSFW(
            logId,
            imageUrl,
          );

          const { success, data } = result;
          if (!success || !data.isSafe) {
            return false;
          }
          return true;
        }),
      );

      isImageNSFW = checkNSFWResult.includes(false);
    }

    if (isImageNSFW) {
      const addMsgResult = await this.chatService.addMessageToChat(
        context,
        user.id,
        chatId,
        { text: cleanHTML(dto.content) },
        {
          description: 'this message was deleted due to inappropriate content',
          deletedAt: new Date(),
        },
      );

      await this.wsService.sendChatMessageTo(
        context,
        chatId,
        user.id,
        data.participants,
        addMsgResult.data,
      );

      return {
        success: false,
        message: 'image is nsfw',
        code: ERR_CODE.IMG_IS_NSFW,
      };
    }

    const chatContent = {
      text: cleanHTML(dto.content),
      images:
        dto.images && dto.images.length
          ? dto.images.map((img) => ({ original: img }))
          : [],
    };

    const addMsgResult = await this.chatService.replyMessageToChat(
      context,
      user.id,
      chatId,
      dto.messageId,
      chatContent,
    );

    if (!addMsgResult.success) {
      return addMsgResult;
    }

    const populatedMessages =
      await this.messageService.populateMessageInformation(
        { logId },
        addMsgResult.data as MessageDocument,
      );

    await this.wsService.sendChatMessageTo(
      context,
      chatId,
      user.id,
      data.participants,
      populatedMessages as unknown as Message,
      CHAT_MESSAGE_TYPE.REPLY_MESSAGE,
    );

    if (dto.images && dto.images.length) {
      await Promise.all(
        dto.images.map(async (imageUrl: string, index: number) => {
          await this.messageQueueService.publishMessage(
            JSON.stringify({
              sourceType: SOURCE_TYPE.MESSAGE,
              imageIndex: index,
              messageId: addMsgResult.data._id,
              fileName: imageUrl.split('/')[3],
              fileURL: imageUrl,
              type: IMG_TASK_TYPE.USER_UPLOAD,
              goal: IMG_TASK_GOAL.RESIZE_AND_COMPRESS,
            }),
          );
        }),
      );
    }

    return {
      success: true,
    };
  }

  @Post(':chatId/messages/read')
  @UsePipes(new BSONIdValidatorPipe('chatId'))
  public async markMessagesAsRead(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Param('chatId') chatId: string,
  ): Promise<HttpResponse> {
    const context: ReqContext = {
      logId,
    };

    const chat = await this.chatService.getChat(context, chatId, user.id);
    if (!chat.success) {
      return chat;
    }

    await this.chatService.markMessageAsRead(context, user.id, chatId);

    return {
      success: true,
    };
  }

  @Delete(':chatId/messages/delete')
  @UsePipes(new BSONIdValidatorPipe('chatId'))
  public async deleteMessages(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Param('chatId') chatId: string,
    @Query() dto: DeleteMessageDTO,
  ): Promise<HttpResponse> {
    const context: ReqContext = {
      logId,
    };

    const chat = await this.chatService.getChat(context, chatId, user.id);
    if (!chat.success) {
      return chat;
    }

    const foundMessage = await this.messageService.getOne({
      _id: dto.messageId,
      chatId,
      senderId: user.id,
    });

    if (!foundMessage) {
      return {
        success: false,
        message: 'Message not found',
        code: ResponseCode.NOT_FOUND,
      };
    }

    await this.messageService.updateById(foundMessage._id, {
      metadata: {
        ...foundMessage.metadata,
        deleteStatus: {
          deletedAt: new Date(),
          description: 'this message has been deleted',
        },
      },
    });

    const { data } = chat;
    const participants = data.participants;

    await this.wsService.sendDeleteMessageTo(
      context,
      chatId,
      user.id,
      participants,
      dto.messageId,
    );

    return {
      success: true,
    };
  }
}
