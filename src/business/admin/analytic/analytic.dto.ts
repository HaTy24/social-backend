import { IsOptional, IsString } from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';

export class AnalyticFilterDTO {
  @ApiPropertyOptional({
    example: '2024-12-30',
    name: 'endDate',
  })
  @IsString()
  endDate: Date;

  @ApiPropertyOptional({
    example: '',
    name: 'companyAddress',
  })
  @IsString()
  @IsOptional()
  companyAddress: string;
}
