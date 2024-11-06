import { IsIn, IsNumber, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { PaginationDTO } from '@core/dto/pagination.dto';
import { GAME_DEPOSIT_SORT_COLUMN, GAME_WITHDRAW_SORT_COLUMN } from '@shared/constants';

export class GameTransactionDTO {
  @ApiProperty({
    example: 10,
  })
  @IsNumber()
  @Min(5)
  @Max(50000)
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    example: '0xd34BccbB0AE0866d16EAc857a6e5dF9dBD9f97ce',
  })
  tokenAddress: string;
}

export class GameDepositHistoryDTO extends PaginationDTO {
  @ApiProperty({
    example: GAME_DEPOSIT_SORT_COLUMN.ADDON,
  })
  @IsIn(Object.values(GAME_DEPOSIT_SORT_COLUMN))
  sort: GAME_DEPOSIT_SORT_COLUMN;
}

export class GameWithdrawHistoryDTO extends PaginationDTO {
  @ApiProperty({
    example: GAME_WITHDRAW_SORT_COLUMN.WDON,
  })
  @IsIn(Object.values(GAME_WITHDRAW_SORT_COLUMN))
  sort: GAME_WITHDRAW_SORT_COLUMN;
}