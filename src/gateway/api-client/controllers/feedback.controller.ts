import { CreateFeedbackDTO, GetRecentFeedbacksDTO } from '@business/feedback/feedback.dto';
import { FeedbackService } from '@business/feedback/feedback.service';
import { UsePaginationQuery } from '@core/dto/pagination.dto';
import { LogId } from '@core/logging/logging';
import { Body, Controller, Inject, Logger, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { INJECTION_TOKEN } from '@shared/constants';
import { AuditService, HttpResponse } from 'mvc-common-toolkit';

@ApiTags('users/feedback')
@Controller('feedback')
export class FeedbackController {
  protected logger = new Logger(FeedbackController.name);

  constructor(
    protected feedbackService: FeedbackService,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) { }

  @Post()
  public async createNewFeedback(
    @LogId() logId: string,
    @Body() dto: CreateFeedbackDTO,
  ): Promise<HttpResponse> {
    const createdFeedback = await this.feedbackService.createFeedback(dto);

    return { success: true, data: createdFeedback };
  }

  @UsePaginationQuery()
  // @Get('recent')
  public async getRecentPosts(
    @LogId() logId: string,
    @Query() dto: GetRecentFeedbacksDTO,
  ): Promise<HttpResponse> {
    const paginateResult = await this.feedbackService.paginate(dto, {
      sort: { createdAt: -1 },
    });

    return {
      success: true,
      data: {
        rows: paginateResult.rows,
        total: paginateResult.total,
      },
    };
  }
}
