import { AnalyticFilterDTO } from '@business/admin/analytic/analytic.dto';
import { AnalyticService } from '@business/analytic/analytic.service';
import { BlockchainWrapperService } from '@business/blockchain/services/blockchain-wrapper.service';
import { UserService } from '@business/user/user.service';
import { HttpResponse, ResponseCode } from '@core/dto/response';
import { LogId } from '@core/logging/logging';
import { Controller, Get, Inject, Logger, Query, Res, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { INJECTION_TOKEN } from '@shared/constants';
import { Response } from 'express';
import { AuditService } from 'mvc-common-toolkit';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

@ApiTags('admin/analytics')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
@Controller('admin/analytics')
export class AnalyticController {
  protected logger = new Logger(AnalyticController.name);
  constructor(
    protected blockchainWrapperService: BlockchainWrapperService,
    protected userService: UserService,
    protected analyticService: AnalyticService,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {}

  @Get('trade-investment-share')
  public async tradeShare(
    @LogId() logId: string,
    @Query() query: AnalyticFilterDTO,
  ): Promise<HttpResponse> {
    const analyticResponse = await this.blockchainWrapperService.analytics(
      logId,
      query,
    );
    if (!analyticResponse.success) {
      return analyticResponse;
    }

    const data = analyticResponse.data;

    const userAddress = Object.keys(data.details);

    const mappedUser = await Promise.all(
      userAddress.map(async (walletAddress: string) => {
        const userInfo = await this.userService.getByWalletAddress(
          walletAddress,
        );
        const investmentData = data.details[walletAddress];

        return {
          fullName: userInfo.fullname,
          twitterScreenName: userInfo.twitterScreenName,
          email: userInfo.email,
          ...investmentData,
        };
      }),
    );

    return {
      success: true,
      data: {
        total: userAddress.length,
        rows: mappedUser,
      },
    };
  }

  @Get('export-investment-share')
  public async exportInvestmentShare(
    @LogId() logId: string,
    @Query() query: AnalyticFilterDTO,
    @Res() response: Response,
  ): Promise<HttpResponse> {
    const foundCompanyAccount = await this.userService.getByWalletAddress(
      query.companyAddress,
    );
    if (!foundCompanyAccount) {
      return {
        success: false,
        message: 'Company account not found',
        code: ResponseCode.NOT_FOUND,
      };
    }

    const analyticResponse = await this.blockchainWrapperService.analytics(
      logId,
      query,
    );
    if (!analyticResponse.success) {
      return analyticResponse;
    }

    const excel = await this.analyticService.convertToExcel(
      logId,
      foundCompanyAccount,
      analyticResponse.data,
    );
    const fileName = `share-report(${query.endDate}).xlsx`;

    response.header(
      'Content-disposition',
      'attachment; filename=' + fileName,
    );
    response.type(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    await excel.write(response);
    response.end();

    return {
      success: true,
    };
  }
}
