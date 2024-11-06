import { AccountTypeConfigService } from '@business/account-type-config/account-type-config.service';
import { ConfigAccountTypeDTO } from '@business/admin/account-type-config/account-type-config.dto';
import { HttpResponse, ResponseCode } from '@core/dto/response';
import { LogId } from '@core/logging/logging';
import { Body, Controller, Inject, Logger, Param, Patch, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from 'mvc-common-toolkit';

import {
  DEFAULT_BUY_LIMIT,
  INJECTION_TOKEN
} from '@shared/constants';

import { AdminAuthGuard } from '../auth/admin-auth.guard';

@ApiTags('admin/account-type')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
@Controller('admin/account-type-config')
export class AdminAccountTypeConfigController {
  protected logger = new Logger(AdminAccountTypeConfigController.name);

  constructor(
    protected accountTypeConfigService: AccountTypeConfigService,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {}

  @Patch('bulk-config')
  public async bulkConfigAccountType(
    @LogId() logId: string,
    @Body() dto: ConfigAccountTypeDTO,
  ): Promise<HttpResponse> {
    await this.accountTypeConfigService.bulkUpdate({
      metadata: {
        buyLimit: DEFAULT_BUY_LIMIT,
        sharePrice: dto.sharePrice,
        txFee: dto.txFee,
      },
    });

    return {
      success: true,
    };
  }

  @Patch(':userId/config')
  public async configAccountType(
    @LogId() logId: string,
    @Param('userId') userId: string,
    @Body() dto: ConfigAccountTypeDTO,
  ): Promise<HttpResponse> {
    const foundAccountTypeConfig =
      await this.accountTypeConfigService.findOne({ userId });
    if (!foundAccountTypeConfig) {
      return {
        success: false,
        code: ResponseCode.NOT_FOUND,
        message: 'account type config not found',
      };
    }

    await this.accountTypeConfigService.updateById(
      foundAccountTypeConfig.id,
      {
        metadata: {
          ...foundAccountTypeConfig.metadata,
          sharePrice: dto.sharePrice || foundAccountTypeConfig.metadata.sharePrice,
          txFee: dto.txFee || foundAccountTypeConfig.metadata.txFee,
        },
      },
    );

    return {
      success: true,
    };
  }
}
