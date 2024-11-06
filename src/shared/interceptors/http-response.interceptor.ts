import dayjs from 'dayjs';
import { AuditService, ErrorLog } from 'mvc-common-toolkit';
import { Observable, catchError, map, of } from 'rxjs';

import {
  CallHandler,
  ExecutionContext,
  BadRequestException,
  HttpStatus,
  Logger,
  NestInterceptor,
} from '@nestjs/common';

import { HttpResponse, ResponseCode } from '@core/dto/response';
import { GetLogId } from '@core/logging/logging';
import { PrometheusGateway } from '@core/monitoring/prometheus.gateway';

export class HttpResponseInterceptor implements NestInterceptor {
  protected logger = new Logger(this.constructor.name);

  constructor(private auditService: AuditService, protected prometheusGateway: PrometheusGateway) {}

  public intercept(
    ctx: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const request: any = ctx.switchToHttp().getRequest();
    const logId = GetLogId(request);

    const startDate = request.startTime;
    const duration = dayjs().diff(startDate, 'milliseconds');

    return next.handle().pipe(
      map((response: HttpResponse<unknown>) => {
        this.prometheusGateway.recordHttpResponse({
          path: request.path,
          duration,
          method: request.method,
          statusCode: '200',
        });

        // it's completed response from controller
        if (response?.success === false || response?.success === true)
          return response;

        // not completed, response is data
        const payload = response?.data || response;
        return { success: true, data: payload };
      }),
      catchError((error) => {
        this.logger.error(`[${logId}]: ${error?.message}`, error.stack);

        this.prometheusGateway.recordHttpResponse({
          path: request.path,
          duration,
          method: request.method,
          statusCode: (error.getStatus?.() || 500).toString(),
        });

        if (!(error instanceof BadRequestException)) {
          this.auditService
            .emitLog(
              new ErrorLog({
                logId,
                message: error?.message,
                action: 'http_response',
                metadata: {
                  url: request.url,
                  method: request.method,
                },
              }),
            )
            .catch((e) =>
              this.logger.error(`[${logId}]: ${error?.message}`, e?.stack),
            );
        }

        return of({
          success: false,
          message: error.response?.message || error.message || 'internal server error',
          code: ResponseCode.INTERNAL_SERVER_ERROR,
          httpStatus: error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }),
    );
  }
}
