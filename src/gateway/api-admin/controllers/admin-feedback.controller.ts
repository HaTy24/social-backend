import { AdminFilterFeedbackDTO, AdminUpdateFeedbackStatusDTO, } from '@business/admin/feedback-manager/feedback.dto';
import { FeedbackService } from '@business/feedback/feedback.service';
import { HttpResponse } from '@core/dto/response';
import { LogId } from '@core/logging/logging';
import { Body, Controller, Get, Inject, Logger, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { INJECTION_TOKEN } from '@shared/constants';
import * as queryHelper from '@shared/helpers/query-helper';
import { AuditService } from 'mvc-common-toolkit';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

@ApiTags('admin/feedback')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
@Controller('admin/feedbacks')
export class AdminFeedbackController {
  protected logger = new Logger(AdminFeedbackController.name);

  constructor(
    protected feedbackService: FeedbackService,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {}

  @Get()
  public async getFeedback(
    @LogId() logId: string,
    @Query() dto: AdminFilterFeedbackDTO,
  ): Promise<HttpResponse> {
    const parseSort = queryHelper.parseSortMongo(dto.sort);

    const feedbackResult = await this.feedbackService.paginate(dto, {
      sort: parseSort,
    });

    return {
      success: true,
      data: feedbackResult,
    };
  }

  @Patch(':id/status')
  public async updateFeedbackStatus(
    @LogId() logId: string,
    @Param('id') id: string,
    @Body() dto: AdminUpdateFeedbackStatusDTO,
  ): Promise<HttpResponse> {
    await this.feedbackService.updateById(id, {
      status: dto.status,
    });

    return {
      success: true,
    };
  }
}
