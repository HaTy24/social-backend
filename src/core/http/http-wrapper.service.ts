import { AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  TimeoutError,
  catchError,
  firstValueFrom,
  of,
  tap,
  timeout,
} from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';

import { HEADER_KEY_LOG_ID, logStringify } from '@core/logging/logging';

@Injectable()
export abstract class HttpWrapperService {
  protected logger = new Logger(this.constructor.name);

  constructor(protected httpService: HttpService) {}

  protected send<T>(
    logId: string,
    options: AxiosRequestConfig,
  ): Promise<AxiosResponse<T> | { data: any }> {
    this.logger.debug(`[${logId}] Send: ${JSON.stringify(options)}`);
    options.headers ||= {};
    options.headers[HEADER_KEY_LOG_ID] =
      logId + '-' + Math.floor(Math.random() * 1000);
    return firstValueFrom(
      this.httpService.request<T>(options).pipe(
        tap((response) => {
          const { data, status } = response;
          this.logger.debug(
            `[${logId}] Receive [${status}]: ${logStringify(data)}`,
          );
        }),
        timeout(30000),
        catchError((error) => {
          if (error instanceof TimeoutError) {
            return of({
              data: {
                success: false,
                code: 'REQUEST_TIME_OUT',
                message: 'request time out',
              },
            });
          }

          const { data = {}, status = 500 } = error?.response || {};

          const errMsg = data.message || error.message || 'external server error';

          this.logger.error(
            `[${logId}] Error [${status}]: - ${errMsg}: ${logStringify(data)}`,
          );

          return of({
            data: {
              success: false,
              message: errMsg,
            },
          });
        }),
      ),
    );
  }
}
