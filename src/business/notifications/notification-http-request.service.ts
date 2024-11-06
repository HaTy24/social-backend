import { AuditService, ErrorLog } from 'mvc-common-toolkit';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { HttpResponse } from '@core/dto/response';
import { HttpWrapperService } from '@core/http/http-wrapper.service';

import { APP_ACTION, ENV_KEY, INJECTION_TOKEN } from '@shared/constants';

import { NotificationRequestData } from './notification.type';

@Injectable()
export class NotificationHttpRequestService extends HttpWrapperService {
  protected logger = new Logger(NotificationHttpRequestService.name);
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

  public async sendNotificationRequest(
    data: NotificationRequestData,
  ): Promise<void> {
    try {
      const { logId, userIds, content } = data;

      const response = await this.send<HttpResponse<string>>(logId, {
        baseURL: this.baseURL,
        url: '/notifications',
        method: 'POST',
        data: {
          userIds,
          content,
        },
      });

      const { data: body } = response;

      if (!body?.success) {
        this.logger.error(body.message);

        this.auditService.emitLog(
          new ErrorLog({
            logId: logId,
            message: body.message,
            action: APP_ACTION.REQUEST_TO_PUSH_NOTIFICATION,
            payload: content,
          }),
        );
      }
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          logId: data.logId,
          message: error.message,
          action: APP_ACTION.REQUEST_TO_PUSH_NOTIFICATION,
          payload: data.content,
        }),
      );
    }
  }
}
