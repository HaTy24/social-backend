import { AuditService, ErrorLog } from 'mvc-common-toolkit';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { HttpResponse } from '@core/dto/response';
import { HttpWrapperService } from '@core/http/http-wrapper.service';

import { MessageQueueService } from '@business/message-queue/message-queue.service';

import {
  APP_ACTION,
  ENV_KEY,
  ERR_CODE,
  INJECTION_TOKEN
} from '@shared/constants';

@Injectable()
export class ImageService extends HttpWrapperService {
  protected logger = new Logger(ImageService.name);
  protected baseURL: string;

  constructor(
    protected httpService: HttpService,
    protected configService: ConfigService,
    protected messageQueueService: MessageQueueService,
    protected eventEmitter: EventEmitter2,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {
    super(httpService);
    this.baseURL = this.configService.get(ENV_KEY.IMAGE_SERVICE_ENDPOINT);
  }

  public async checkImageNSFW(
    logId: string,
    imageUrl: string,
  ): Promise<HttpResponse> {
    try {
      const response = await this.send<HttpResponse<string>>(logId, {
        baseURL: this.baseURL,
        url: `/checks/images/nsfw?url=${encodeURIComponent(imageUrl)}`,
        method: 'GET',
      });

      const { data: body } = response;

      if (!body?.success) {
        return body;
      }

      if (body.data?.code === ERR_CODE.IMG_IS_NSFW) {
        return {
          success: true,
          data: { isSafe: false },
        };
      }

      return {
        success: true,
        data: { isSafe: true },
      };
    } catch (error) {
      this.logger.error(error.message, error.stack);

      this.auditService.emitLog(
        new ErrorLog({
          logId,
          message: error.message,
          action: APP_ACTION.REQUEST_TO_CHECK_IMAGE_NSFW,
          payload: { imageUrl },
        }),
      );

      return {
        success: false,
        message: error.message,
      };
    }
  }
}
