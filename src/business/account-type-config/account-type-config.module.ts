import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountTypeConfig } from './account-type-config.entity';
import { AccountTypeConfigService } from './account-type-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([AccountTypeConfig])],
  exports: [AccountTypeConfigService],
  providers: [AccountTypeConfigService],
})
export class AccountTypeConfigModule {}
