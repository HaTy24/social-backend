import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SystemAccount } from './system-account.entiy';
import { SystemAccountService } from './system-account.service';

@Module({
  imports: [TypeOrmModule.forFeature([SystemAccount])],
  exports: [SystemAccountService],
  providers: [SystemAccountService],
})
export class SystemAccountModule { }
