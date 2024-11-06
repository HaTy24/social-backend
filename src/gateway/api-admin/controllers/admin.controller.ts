import { SystemUser } from '@business/admin/admin.entity';
import { ChangePasswordAdminDTO } from '@business/admin/auth/admin.dto';
import { AdminAuthService } from '@business/admin/auth/auth.service';
import { RequestSystemUser } from '@core/decorators/request-system-user';
import { HttpResponse } from '@core/dto/response';
import { LogId } from '@core/logging/logging';
import { Body, Controller, Get, Inject, Logger, Patch, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { INJECTION_TOKEN } from '@shared/constants';
import { AuditService } from 'mvc-common-toolkit';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

@ApiTags('admin/management')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  protected logger = new Logger(AdminController.name);

  constructor(
    protected authService: AdminAuthService,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {}

  @Patch('change-password')
  public async adminChangePassword(
    @LogId() logId: string,
    @Body() dto: ChangePasswordAdminDTO,
    @RequestSystemUser() systemUser: SystemUser,
  ) {
    const isSuccess = await this.authService.changePasswordSystemUser(dto, systemUser);
    if (!isSuccess) {
      return {
        success: false,
        message: 'Change password failed',
      };
    }

    return {
      success: true,
    };
  }

  @Get('profile')
  public async getProfile(
    @RequestSystemUser() systemUser: SystemUser,
  ): Promise<HttpResponse> {
    const { password: _, ...sanitizedUser } = systemUser;

    return { success: true, data: sanitizedUser };
  }
}
