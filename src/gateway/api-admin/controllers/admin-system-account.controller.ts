import {
  Controller,
  Get,
  Inject,
  Logger,
  Query,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from 'mvc-common-toolkit';

import {
  AdminFilterUserDTO
} from '@business/admin/user-manager/user.dto';
import { UserService } from '@business/user/user.service';
import { HttpResponse } from '@core/dto/response';
import { LogId } from '@core/logging/logging';
import { INJECTION_TOKEN } from '@shared/constants';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

@ApiTags('admin/system-account')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
@Controller('admin/system-account')
export class AdminSystemAccountController {
  protected logger = new Logger(AdminSystemAccountController.name);

  constructor(
    protected userService: UserService,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) { }

  @Get()
  public async getSystemAccounts(
    @LogId() logId: string,
    @Query() query: AdminFilterUserDTO,
  ): Promise<HttpResponse> {
    query.addFilter({ isSystemAccount: true });

    const users = await this.userService.paginate(query);

    return {
      success: true,
      data: { total: users.totalCount, rows: users.items },
    };
  }
}
