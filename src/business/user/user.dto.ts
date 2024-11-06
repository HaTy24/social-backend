import { IsNotEmpty, IsNumberString, IsString, MaxLength, MinLength } from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { PaginationDTO } from '@core/dto/pagination.dto';
import { SHARES_TRADE_TYPE } from '@shared/constants';

export class SearchUsersDTO {
  @ApiProperty({
    name: 'keyword',
    example: 'ahihi',
  })
  @MinLength(3)
  @MaxLength(15)
  keyword: string;
}

export class SetupPinDTO {
  @MinLength(6)
  @MaxLength(10)
  @IsNumberString()
  pin: string;
}

export class ExportPrivateKeyDTO {
  @MinLength(6)
  @MaxLength(10)
  @IsNumberString()
  pin: string;
}

export class ChangePinDTO {
  @MinLength(6)
  @MaxLength(10)
  @IsNumberString()
  oldPin: string;

  @MinLength(6)
  @MaxLength(10)
  @IsNumberString()
  newPin: string;
}

export class ShareReportDTO {
  @ApiPropertyOptional({
    example: '2024-12-30',
    name: 'endDate',
  })
  @IsString()
  endDate: Date;
}

export class TradeHistoryDTO extends PaginationDTO {
  @ApiPropertyOptional({
    example: SHARES_TRADE_TYPE.NORMAL,
  })
  @IsIn(Object.values(SHARES_TRADE_TYPE))
  @IsOptional()
  type: SHARES_TRADE_TYPE;
}

export class ChangePasswordDto {
  @ApiProperty({
    example: '123abcDef!@#',
    description: 'password',
  })
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(60)
  oldPassword: string;

  @ApiProperty({
    example: '123abcDef!@#',
    description: 'password',
  })
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(60)
  newPassword: string;
}
