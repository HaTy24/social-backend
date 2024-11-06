import { AuditService } from 'mvc-common-toolkit';

import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';

import { PrometheusGateway } from '@core/monitoring/prometheus.gateway';

import { INJECTION_TOKEN } from '@shared/constants';
import { HttpLatencyInterceptor } from '@shared/interceptors/http-latency.interceptor';
import { HttpResponseInterceptor } from '@shared/interceptors/http-response.interceptor';

import { AppModule } from './app.module';
import { HttpLoggingInterceptor } from './core/logging/logging';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'fatal', 'warn', 'log', 'verbose', 'debug'],
  });
  const configService = app.get(ConfigService);
  const auditService: AuditService = app.get(INJECTION_TOKEN.AUDIT_SERVICE);
  const logger = new Logger('NestApplication');

  const isProduction = ['production', 'prod'].includes(
    configService.get('APP_ENV', 'production').toLowerCase(),
  );
  if (!isProduction) {
    app.enableCors();
  }

  app.set('trust proxy', 'loopback');

  app.setGlobalPrefix('v1/api');

  if (
    configService.get('SWAGGER_ENABLE')?.toLowerCase() === 'true' &&
    configService.get('APP_ENV')?.toLowerCase() != 'production'
  ) {
    const config = new DocumentBuilder()
      .setTitle(process.env.npm_package_name)
      .setDescription(process.env.npm_package_description)
      .setVersion(process.env.npm_package_version)
      .addBearerAuth()
      .addTag('public')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    const customOptions: SwaggerCustomOptions = {
      swaggerOptions: {
        persistAuthorization: true,
      },
      customSiteTitle: process.env.npm_package_name,
    };
    SwaggerModule.setup('/docs', app, document, customOptions);
  }

  const promGateway = app.get(PrometheusGateway);

  app.useGlobalInterceptors(
    new HttpLatencyInterceptor(),
    new HttpLoggingInterceptor(),
    new HttpResponseInterceptor(auditService, promGateway),
  );
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const port = +configService.get('APP_PORT', 3000);
  await app.listen(port, () =>
    logger.log(`Application is running on port ${port}`),
  );
}
bootstrap();
