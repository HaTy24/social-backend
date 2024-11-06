import { AuditService, ErrorLog, OperationResult } from 'mvc-common-toolkit';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { HttpResponse } from '@core/dto/response';
import { HttpWrapperService } from '@core/http/http-wrapper.service';

import { Message } from '@business/chat/message.model';

import {
  APP_ACTION,
  CHAT_MESSAGE_TYPE,
  ENV_KEY,
  INJECTION_TOKEN,
} from '@shared/constants';
import { ReqContext } from '@shared/types';

@Injectable()
export class WebsocketService extends HttpWrapperService {
  protected logger = new Logger(WebsocketService.name);
  protected baseURL: string;

  constructor(
    protected httpService: HttpService,
    protected configService: ConfigService,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {
    super(httpService);
    this.baseURL = this.configService.get(ENV_KEY.WEBSOCKET_ENDPOINT);
  }

  /**
   * Sends a chat message to a list of users' currently connected socket.
   * @param context The request context
   * @param userIds The list of user to send the message to
   * @param content The message to send
   * @returns Operation Result
   */
  public async sendChatMessageTo(
    context: ReqContext,
    chatId: string,
    senderId: string,
    userIds: string[],
    message: Message,
    type?: CHAT_MESSAGE_TYPE,
  ): Promise<OperationResult> {
    try {
      const response = await this.send<HttpResponse<string>>(context.logId, {
        baseURL: this.baseURL,
        url: `/chats/${chatId}/messages`,
        method: 'POST',
        data: {
          content: JSON.stringify(message),
          userIds,
          senderId,
          type: type || CHAT_MESSAGE_TYPE.SEND_MESSAGE,
        },
        headers: {
          Authorization: this.configService.getOrThrow(
            ENV_KEY.WEBSOCKET_AUTH_SECRET,
          ),
        },
      });

      const { data: body } = response;

      if (!body?.success) {
        this.logger.error(body.message);

        this.auditService.emitLog(
          new ErrorLog({
            logId: context.logId,
            message: body.message,
            action: APP_ACTION.SEND_MESSAGE_TO_USER,
            payload: {
              message,
              userIds,
              senderId,
              type: CHAT_MESSAGE_TYPE.SEND_MESSAGE,
            },
          }),
        );
      }

      return body;
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          logId: context.logId,
          action: APP_ACTION.SEND_MESSAGE_TO_USER,
          message: error.message,
          payload: {
            message,
            userIds,
            senderId,
            type: CHAT_MESSAGE_TYPE.SEND_MESSAGE,
          },
        }),
      );

      return {
        success: false,
        message: error.message,
      };
    }
  }

  public async sendDeleteMessageTo(
    context: ReqContext,
    chatId: string,
    senderId: string,
    userIds: string[],
    messageId: string,
  ): Promise<OperationResult> {
    try {
      const response = await this.send<HttpResponse<string>>(context.logId, {
        baseURL: this.baseURL,
        url: `/chats/${chatId}/messages/delete`,
        method: 'DELETE',
        data: {
          messageId,
          userIds,
          senderId,
        },
        headers: {
          Authorization: this.configService.getOrThrow(
            ENV_KEY.WEBSOCKET_AUTH_SECRET,
          ),
        },
      });

      const { data: body } = response;

      if (!body?.success) {
        this.logger.error(body.message);

        this.auditService.emitLog(
          new ErrorLog({
            logId: context.logId,
            message: body.message,
            action: APP_ACTION.DELETE_MESSAGE,
            payload: {
              messageId,
              userIds,
              senderId,
            },
          }),
        );
      }

      return body;
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          logId: context.logId,
          action: APP_ACTION.DELETE_MESSAGE,
          message: error.message,
          payload: {
            messageId,
            userIds,
            senderId,
          },
        }),
      );

      return {
        success: false,
        message: error.message,
      };
    }
  }

  public async sendReadMessageTo(
    context: ReqContext,
    chatId: string,
    senderId: string,
    userIds: string[],
    messageIds: string[],
  ): Promise<OperationResult> {
    try {
      const response = await this.send<HttpResponse<string>>(context.logId, {
        baseURL: this.baseURL,
        url: `/chats/${chatId}/messages/read`,
        method: 'PATCH',
        data: {
          messageIds,
          userIds,
          senderId,
          type: CHAT_MESSAGE_TYPE.ACK_MESSAGE_RECEIVED,
        },
        headers: {
          Authorization: this.configService.getOrThrow(
            ENV_KEY.WEBSOCKET_AUTH_SECRET,
          ),
        },
      });

      const { data: body } = response;

      if (!body?.success) {
        this.logger.error(body.message);

        this.auditService.emitLog(
          new ErrorLog({
            logId: context.logId,
            message: body.message,
            action: APP_ACTION.MARK_MESSAGE_AS_READ,
            payload: {
              messageId: messageIds,
              userIds,
              senderId,
              type: CHAT_MESSAGE_TYPE.ACK_MESSAGE_RECEIVED,
            },
          }),
        );
      }

      return body;
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          logId: context.logId,
          action: APP_ACTION.MARK_MESSAGE_AS_READ,
          message: error.message,
          payload: {
            messageId: messageIds,
            userIds,
            senderId,
            type: CHAT_MESSAGE_TYPE.ACK_MESSAGE_RECEIVED,
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
