import {
  APP_ENV,
  AuditService,
  HttpAuditGateway,
  StdOutAuditGateway,
} from 'mvc-common-toolkit';

import { Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ENV_KEY, INJECTION_TOKEN } from '@shared/constants';

const auditServiceProvider: Provider = {
  provide: INJECTION_TOKEN.AUDIT_SERVICE,
  useFactory: (configService: ConfigService) => {
    const isProd =
      configService.get(ENV_KEY.APP_ENV, APP_ENV.DEVELOPMENT) ===
      APP_ENV.PRODUCTION;

    const gateway = isProd
      ? new HttpAuditGateway({
          baseUrl: configService.get(ENV_KEY.AUDIT_ENDPOINT),
          auth: {
            username: configService.get(ENV_KEY.AUDIT_USERNAME),
            password: configService.get(ENV_KEY.AUDIT_PASSWORD),
          },
          appName: `chat-service-${isProd ? 'production' : 'development'}`,
        })
      : new StdOutAuditGateway();

    const auditService = new AuditService(gateway);

    return auditService;
  },
  inject: [ConfigService],
};

@Global()
@Module({
  providers: [auditServiceProvider],
  exports: [INJECTION_TOKEN.AUDIT_SERVICE],
})
export class AuditModule {}
