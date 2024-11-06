/* eslint-disable no-case-declarations */
import { AdminFilterTransactionDTO } from '@business/admin/transaction/transaction.dto';
import { BlockchainWrapperService } from '@business/blockchain/services/blockchain-wrapper.service';
import { extractPublicInfo } from '@business/user/user.entity';
import { UserService } from '@business/user/user.service';
import { HttpResponse, ResponseCode } from '@core/dto/response';
import { LogId } from '@core/logging/logging';
import { Controller, Get, Inject, Logger, Query, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { INJECTION_TOKEN, SHARES_TRADE_TYPE } from '@shared/constants';
import { AuditService } from 'mvc-common-toolkit';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

@ApiTags('admin/trade')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
@Controller('admin/trade-history')
export class AdminTransactionController {
  protected logger = new Logger(AdminTransactionController.name);
  constructor(
    protected blockchainWrapperService: BlockchainWrapperService,
    protected userService: UserService,
    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,
  ) {}

  @Get()
  public async viewTransactionHistory(
    @LogId() logId: string,
    @Query() dto: AdminFilterTransactionDTO,
  ): Promise<HttpResponse> {
    let tradesResult = null;

    switch (dto.filters.type) {
      case SHARES_TRADE_TYPE.NORMAL:
        tradesResult =
          await this.blockchainWrapperService.viewUserTradeHistory(
            logId,
            { address: dto.filters.address, type: dto.filters.type },
            dto.limit,
            dto.offset,
          );
        break;

      case SHARES_TRADE_TYPE.INVESTMENT:
        tradesResult =
          await this.blockchainWrapperService.viewUserTradeHistory(
            logId,
            { ownerAddress: dto.filters.address, type: dto.filters.type },
            dto.limit,
            dto.offset,
          );
        break;

      default:
        return {
          success: false,
          message: 'share type not supported',
        };
    }

    if (!tradesResult.success)
      return { success: false, code: ResponseCode.INTERNAL_SERVER_ERROR };
    const { data } = tradesResult;

    const rows = await Promise.all(
      data.items.map(async (trade) => {
        switch (trade.type) {
          case SHARES_TRADE_TYPE.NORMAL:
            const owner = await this.userService.getByWalletAddress( trade.ownerAddress, );
            return { ...trade, owner: extractPublicInfo(owner) };

          case SHARES_TRADE_TYPE.INVESTMENT:
            const user = await this.userService.getByWalletAddress( trade.userAddress, );
            return { ...trade, owner: extractPublicInfo(user) };

          default:
            break;
        }
      }),
    );

    return { success: true, data: { total: data.totalCount, rows } };
  }
}
