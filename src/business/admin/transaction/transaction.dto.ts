import { IsString } from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PaginationDTO } from '@core/dto/pagination.dto';

import { SHARES_TRADE_TYPE } from '@shared/constants';

export class FilterTransaction {
  @ApiPropertyOptional({
    example: '',
    name: 'filters[address]',
  })
  @IsString()
  address: string;

  @ApiPropertyOptional({
    example: SHARES_TRADE_TYPE.NORMAL,
    name: 'filters[type]',
  })
  type: SHARES_TRADE_TYPE;
}
export class AdminFilterTransactionDTO extends PaginationDTO {
  @ApiProperty({
    type: () => FilterTransaction,
  })
  filters: FilterTransaction;
}
