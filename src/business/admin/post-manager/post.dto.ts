import { Equals, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { POST_TYPE } from '@business/post/post.model';
import { PaginationDTO } from '@core/dto/pagination.dto';
import { cleanAlphaNumeric, cleanDate } from '@shared/helpers/text-cleaning-helper';

class FilterPost {
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
    example: POST_TYPE.TWEET,
    name: 'filters[type]',
  })
  @Equals(POST_TYPE[Object.values(POST_TYPE) as unknown as string])
  type: POST_TYPE;

  @ApiPropertyOptional({
    name: 'filters[tag]',
  })
  @IsString()
  tag: string;
}

export class AdminFilterPostDTO extends PaginationDTO {
  @ApiProperty({
    type: () => FilterPost,
  })
  filters: FilterPost;

  public parseFilters(): void {
    if (!this.filters) return;
    if (this.filters.tag) {
      this.addFilter({
        tags: cleanAlphaNumeric(this.filters.tag.toLowerCase()),
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
    if (this.filters.type) {
      this.addFilter({
        type: { $eq: this.filters.type },
      });
    }
  }
}
