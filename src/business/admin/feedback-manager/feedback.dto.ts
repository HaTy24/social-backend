import { Equals, IsIn, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PaginationDTO } from '@core/dto/pagination.dto';
import { FEEDBACK_STATUS } from '@shared/constants';
import {
  cleanDate,
  cleanEmail,
  cleanNumber,
  cleanText,
} from '@shared/helpers/text-cleaning-helper';

class FilterFeedback {
  @ApiPropertyOptional({
    example: '2023-11-01',
    name: 'filters[startDate]',
  })
  @IsString()
  startDate: Date;

  @ApiPropertyOptional({
    example: '2023-12-30',
    name: 'filters[endDate]',
  })
  @IsString()
  endDate: Date;

  @ApiPropertyOptional({
    name: 'filters[title]',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    name: 'filters[email]',
  })
  @IsString()
  email: string;

  @ApiPropertyOptional({
    name: 'filters[phoneNumber]',
  })
  @IsString()
  phoneNumber: string;

  @ApiPropertyOptional({
    example: FEEDBACK_STATUS.SUBMITTED,
    name: 'filters[status]',
  })
  @Equals(FEEDBACK_STATUS[Object.values(FEEDBACK_STATUS) as unknown as string])
  status: FEEDBACK_STATUS;
}

export class AdminFilterFeedbackDTO extends PaginationDTO {
  @ApiProperty({
    type: () => FilterFeedback,
  })
  filters: FilterFeedback;

  public parseFilters(): void {
    if (!this.filters) return;
    if (this.filters.status) {
      this.addFilter({
        status: this.filters.status,
      });
    }
    if (this.filters.title) {
      this.addFilter({
        title: {
          $regex: new RegExp(`${cleanText(this.filters.title)}.*`, 'i'),
        },
      });
    }
    if (this.filters.email) {
      this.addFilter({
        email: {
          $regex: new RegExp(`${cleanEmail(this.filters.email)}.*`, 'i'),
        },
      });
    }
    if (this.filters.phoneNumber) {
      this.addFilter({
        phoneNumber: {
          $regex: new RegExp(`${cleanNumber(this.filters.phoneNumber)}.*`, 'i'),
        },
      });
    }
    if (this.filters.startDate && this.filters.endDate) {
      this.addFilter({
        createdAt: {
          $gte: new Date(
            cleanDate(this.filters.startDate.toString()),
          ).toISOString(),
          $lt: new Date(
            cleanDate(this.filters.endDate.toString()),
          ).toISOString(),
        },
      });
    }
  }
}

export class AdminUpdateFeedbackStatusDTO {
  @ApiProperty({ example: FEEDBACK_STATUS.SOLVED })
  @IsIn(Object.values(FEEDBACK_STATUS))
  status: FEEDBACK_STATUS;
}
