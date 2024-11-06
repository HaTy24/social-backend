import { AdminService } from '@business/admin/admin.service';
import { LoginAdminDTO } from '@business/admin/auth/admin.dto';
import { AdminAuthService } from '@business/admin/auth/auth.service';
import { HttpResponse, ResponseCode } from '@core/dto/response';
import { LogId } from '@core/logging/logging';
import { Body, Controller, Inject, Logger, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ENV_KEY, INJECTION_TOKEN, SYSTEM_USER_TYPE } from '@shared/constants';
import { AuditService, bcryptHelper } from 'mvc-common-toolkit';

@ApiTags('admin/authentication')
@Controller('admin')
export class AdminAuthController {
  protected logger = new Logger(AdminAuthController.name);
  constructor(
    protected adminService: AdminService,
    protected authService: AdminAuthService,
    protected jwtService: JwtService,
    protected configService: ConfigService,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {}

  @Post('init-admin')
  @ApiOperation({ summary: 'init admin user' })
  public async initAdmin(): Promise<HttpResponse> {
    const existedAdmin = await this.adminService.findOne({
      email: this.configService.getOrThrow(ENV_KEY.SYSTEM_ADMIN_EMAIL),
    });
    if (existedAdmin) {
      return {
        success: false,
        code: ResponseCode.CONFLICT,
        message: 'Admin user already exists',
      };
    }

    const hashedPassword = await bcryptHelper.hash(
      this.configService.get(ENV_KEY.SYSTEM_ADMIN_PASSWORD, 'TpSsyNZknMxUh9e3rGaWQL'),
    );
    await this.adminService.save({
      user_type: SYSTEM_USER_TYPE.ADMIN,
      email: this.configService.getOrThrow(ENV_KEY.SYSTEM_ADMIN_EMAIL),
      password: hashedPassword,
    });

    return {
      success: true,
      message: 'Admin user created',
      data: {
        email: this.configService.getOrThrow(ENV_KEY.SYSTEM_ADMIN_EMAIL),
        password: this.configService.get(ENV_KEY.SYSTEM_ADMIN_PASSWORD, 'TpSsyNZknMxUh9e3rGaWQL'),
      },
    };
  }

  @Post('login')
  public async loginAdmin(
    @LogId() logId: string,
    @Body() dto: LoginAdminDTO,
  ): Promise<HttpResponse> {
    const data = await this.authService.validateSystemUser(dto);
    if (!data) {
      return {
        success: false,
        code: ResponseCode.UNAUTHORIZED,
        message: 'Invalid email or password',
      };
    }

    const { password: _, ...sanitizedUser } = data;
    const access_token = await this.jwtService.signAsync(sanitizedUser);
    return {
      success: true,
      data: {
        access_token,
        user: sanitizedUser,
      },
    };
  }
}
