import { Module } from '@nestjs/common';

import { UserModule } from '@business/user/user.module';

import { AnalyticService } from './analytic.service';

@Module({
  imports: [UserModule],
  exports: [AnalyticService],
  providers: [AnalyticService],
})
export class AnalyticModule {}
