import { AccountTypeConfigService } from '@business/account-type-config/account-type-config.service';
import { AdminFilterUserDTO, AdminUpdateUserAccountTypeDTO, AdminUpdateUserStatusDTO, } from '@business/admin/user-manager/user.dto';
import { UserUpdatedEvent } from '@business/event/event.model';
import { SystemAccountService } from '@business/system-account/system-account.service';
import { ACCOUNT_TYPE } from '@business/user/user.entity';
import { UserService } from '@business/user/user.service';
import { HttpResponse } from '@core/dto/response';
import { LogId } from '@core/logging/logging';
import { Body, Controller, Get, Inject, Logger, Param, Patch, Query, UseGuards, } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { APP_EVENT, DEFAULT_BUY_LIMIT, DEFAULT_SHARE_PRICE, DEFAULT_TX_FEE, INJECTION_TOKEN } from '@shared/constants';
import { AuditService } from 'mvc-common-toolkit';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

@ApiTags('admin/user')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
@Controller('admin/users')
export class AdminUserController {
  protected logger = new Logger(AdminUserController.name);

  constructor(
    protected userService: UserService,
    protected systemAccountService: SystemAccountService,
    protected accountTypeConfigService: AccountTypeConfigService,
    protected eventEmitter: EventEmitter2,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {}

  @Get()
  public async getUsers(
    @LogId() logId: string,
    @Query() query: AdminFilterUserDTO,
  ): Promise<HttpResponse> {
    const users = await this.userService.paginate(query);

    users.items = users.items.map(i => {
      delete i.password;
      delete i.pinSecret;
      delete i.walletSecret;

      return i;
    })

    return {
      success: true,
      data: { total: users.totalCount, rows: users.items },
    };
  }

  @Get(':id')
  public async getUserDetail(
    @LogId() logId: string,
    @Param('id') id: string,
  ): Promise<HttpResponse> {
    const userDetail = await this.userService.getById(id);

    if (userDetail.accountType !== ACCOUNT_TYPE.NORMAL) {
      const accountTypeConfig = await this.accountTypeConfigService.findOne({
        userId: id,
      });
      return {
        success: true,
        data: {
          ...userDetail,
          metadata: {
            ...accountTypeConfig.metadata,
          },
        },
      };
    }

    return {
      success: true,
      data: userDetail,
    };
  }

  @Patch(':id/status')
  public async updateUserStatus(
    @LogId() logId: string,
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserStatusDTO,
  ): Promise<HttpResponse> {
    await this.userService.updateById(id, {
      status: dto.status,
    });

    this.eventEmitter.emit(
      APP_EVENT.USER_UPDATED,
      UserUpdatedEvent.from({
        logId,
        userId: id,
        createdAt: new Date(),
      }),
    );

    return {
      success: true,
    };
  }

  @Patch(':id/account-type')
  public async updateUserAccountType(
    @LogId() logId: string,
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserAccountTypeDTO,
  ): Promise<HttpResponse> {
    await this.userService.updateById(id, {
      accountType: dto.accountType,
    });

    this.eventEmitter.emit(
      APP_EVENT.USER_UPDATED,
      UserUpdatedEvent.from({
        logId,
        userId: id,
        createdAt: new Date(),
      }),
    );

    switch (dto.accountType) {
      case ACCOUNT_TYPE.NORMAL:
        return { success: true };

      case ACCOUNT_TYPE.INVESTMENT:
        // eslint-disable-next-line no-case-declarations
        const foundAccountTypeConfig =
          await this.accountTypeConfigService.findOne({
            userId: id,
          });

        if (foundAccountTypeConfig) {
          await this.accountTypeConfigService.updateById(
            foundAccountTypeConfig.id,
            {
              type: ACCOUNT_TYPE.INVESTMENT,
              metadata: {
                sharePrice: DEFAULT_SHARE_PRICE,
                txFee: DEFAULT_TX_FEE,
                buyLimit: DEFAULT_BUY_LIMIT,
              },
            },
          );

          return { success: true };
        }

        await this.accountTypeConfigService.save({
          userId: id,
          type: ACCOUNT_TYPE.INVESTMENT,
          metadata: {
            sharePrice: DEFAULT_SHARE_PRICE,
            txFee: DEFAULT_TX_FEE,
            buyLimit: DEFAULT_BUY_LIMIT,
          },
        });

        return { success: true };

      default:
        return {
          success: false,
          message: 'account type not supported',
        };
    }
  }
}
