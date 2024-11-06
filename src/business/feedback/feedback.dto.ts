import {
  ArrayMaxSize,
  IsOptional,
  MaxLength,
  MinLength
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';



import { PaginationDTO } from '@core/dto/pagination.dto';

export class CreateFeedbackDTO {
  @ApiProperty({
    example: 'this is the title',
  })
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: '031231234',
  })
  phoneNumber: string;

  @ApiProperty({
    example: 'example@gmail.com',
  })
  @MaxLength(255)
  @MinLength(5)
  email: string;

  @ApiProperty({
    example: 'this is my feedback',
  })
  @MinLength(1)
  @MaxLength(2000)
  feedback: string;

  @IsOptional()
  @ArrayMaxSize(5)
  @ApiPropertyOptional({
    example: `https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png,
       https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png,
       https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png`,
  })
  images: string;
}

export class GetRecentFeedbacksDTO extends PaginationDTO {
  @ApiPropertyOptional({
    example: 'submitted',
  })
  @IsOptional()
  @MaxLength(20)
  status: string;

  public parseFilters(): void {
    if (this.status) {
      this.addFilter({
        status: this.status,
      });
    }
  }
}