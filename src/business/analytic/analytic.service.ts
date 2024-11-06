import { ExcelService } from 'mvc-common-toolkit';
import { Injectable } from '@nestjs/common';

import { User } from '@business/user/user.entity';
import { UserService } from '@business/user/user.service';

import { InvestmentReport } from '@shared/types';

@Injectable()
export class AnalyticService {
  constructor(protected userService: UserService) {}

  public async convertToExcel(
    logId: string,
    companyAccount: User,
    data: InvestmentReport,
  ): Promise<ExcelService> {
    const excelService = new ExcelService();

    const template = await excelService.loadTemplate('templates/trade-share-report.xlsx');
    const report = template.getWorkSheet('Expense Report');

    const userAddress = Object.keys(data.details);
    await Promise.all(
      userAddress.map(async (walletAddress: string, index: number) => {
        const userInfo = await this.userService.getByWalletAddress(
          walletAddress,
        );

        const investmentData = data.details[walletAddress];

        report.writeCellByAddress('B1', { value: 'Trading Shares Report' });
        report.writeCellByAddress('D3', { value: new Date() });
        report.writeCellByAddress('D4', { value: 'Admin' });
        report.writeCellByAddress('D5', { value: companyAccount.fullname });
        report.writeCellByAddress('D6', {
          value: `@${companyAccount.twitterScreenName}`,
        });
        report.writeCellByAddress('D7', {
          value: companyAccount.email,
        });
        report.writeCellByAddress('D8', {
          value: companyAccount.walletAddress,
        });

        const rowNumber = index + 11;
        report.writeRow(rowNumber, 2, [
          index + 1,
          userInfo?.fullname,
          `@${userInfo?.twitterScreenName}`,
          userInfo?.email,
          userInfo?.walletAddress,
          investmentData.count,
          `${investmentData.percentage} %`,
        ]);
        const row = report.getRow(rowNumber);
        row.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: false,
        };
        row.height = 30;
      }),
    );

    return template;
  }
}
