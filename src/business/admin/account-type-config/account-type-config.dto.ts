import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, MaxLength, MinLength } from "class-validator";

export class ConfigAccountTypeDTO {
  @ApiProperty({
    example: '0.03',
  })
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  sharePrice: string;

  @ApiProperty({
    example: '0.025',
  })
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  txFee: string;
}