import { extractPublicIntegrateUser } from '@business/user/user.entity';
import { LogId } from '@core/logging/logging';
import { Controller, Get, Inject, Logger, Query, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { INJECTION_TOKEN } from '@shared/constants';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { AuditService, HttpResponse } from 'mvc-common-toolkit';
import { UserService } from 'src/business/user/user.service';
import { IntegrationAuthGuard } from '../auth/integration-auth.guard';

class CheckSignedUpDTO {
  @ApiProperty()
  @MinLength(3)
  @MaxLength(15)
  @IsString()
  referenceid: string;
}

@ApiTags('client/integration')
@Controller('integration')
@UseGuards(IntegrationAuthGuard)
@ApiBearerAuth()
export class IntegrationController {
  protected logger = new Logger(IntegrationController.name);

  constructor(
    private userService: UserService,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {}

  @Get('/sign-up-check')
  async checkSignedUp(
    @LogId() logId: string,
    @Query() dto: CheckSignedUpDTO,
  ): Promise<HttpResponse> {
    const augmentlabsUser = await this.userService.findIntegrateUser(
      logId,
      dto.referenceid.toUpperCase(),
    );

    if (!augmentlabsUser) {
      return {
        success: true,
        data: {
          issignedup: false,
        },
      };
    }

    if (!augmentlabsUser.isVerifiedEmail) {
      return {
        success: true,
        data: {
          issignedup: true,
          email: augmentlabsUser.email,
          status: 'emailunverified'
        },
      };
    }

    return {
      success: true,
      data: {
        ...extractPublicIntegrateUser(augmentlabsUser),
        issignedup: true,
        status: 'active',
      },
    };
  }
}
