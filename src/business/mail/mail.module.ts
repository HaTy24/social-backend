import { MailService } from 'mvc-common-toolkit';

import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { ENV_KEY, INJECTION_TOKEN } from '@shared/constants';

import { NodemailerTransporter } from './transports/nodemailer-transporter';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: INJECTION_TOKEN.MAILER_SERVICE,
      useFactory: (configService: ConfigService) => {
        return new MailService(new NodemailerTransporter(configService), {
          adminEmails: [configService.getOrThrow(ENV_KEY.SMTP_MAIL_FROM)],
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [INJECTION_TOKEN.MAILER_SERVICE],
})
export class MailModule {}
