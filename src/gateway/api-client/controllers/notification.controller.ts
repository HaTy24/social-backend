import { GetNotificationsDTO, ReadNotificationDTO, } from '@business/notifications/notification.dto';
import { NotificationService } from '@business/notifications/notification.service';
import { User } from '@business/user/user.entity';
import { RequestUser } from '@core/decorators/request-user';
import { UsePaginationQuery } from '@core/dto/pagination.dto';
import { LogId } from '@core/logging/logging';
import { Body, Controller, Get, Inject, Logger, Post, Query, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { INJECTION_TOKEN } from '@shared/constants';
import { AuditService, HttpResponse } from 'mvc-common-toolkit';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('client/notifications')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  protected logger = new Logger(NotificationController.name);

  constructor(
    @Inject(INJECTION_TOKEN.AUDIT_SERVICE) protected auditService: AuditService,
    protected notificationService: NotificationService,
  ) {}

  @UsePaginationQuery()
  @Get()
  public async getNotifications(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Query() dto: GetNotificationsDTO,
  ): Promise<HttpResponse> {
    const viewerId = user.id;
    dto.addFilter({
      toUserIds: viewerId,
    });

    const paginateResult = await this.notificationService.paginate(dto, {
      sort: { createdAt: -1 },
    });

    return {
      success: true,
      data: paginateResult,
    };
  }

  @Get('unread')
  public async countUnreadNotifications(
    @LogId() logId: string,
    @RequestUser() user: User,
  ): Promise<HttpResponse> {
    const viewerId = user.id;

    const count = await this.notificationService.count({
      toUserIds: viewerId,
      'metadata.readStatus.userId': { $ne: viewerId },
    });

    return {
      success: true,
      data: count,
    };
  }

  @Post('/read')
  public async readNotifications(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Body() dto: ReadNotificationDTO,
  ): Promise<HttpResponse> {
    const viewerId = user.id;

    await this.notificationService.markNotificationsAsRead(
      viewerId,
      dto.notificationIds,
    );

    return {
      success: true,
    };
  }
}
