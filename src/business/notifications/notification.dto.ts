import { ArrayMinSize, IsArray, IsOptional } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { PaginationDTO } from '@core/dto/pagination.dto';

export class ReadNotificationDTO {
  @IsArray()
  @ArrayMinSize(1)
  @ApiProperty()
  notificationIds: string[];
}

export class GetNotificationsDTO extends PaginationDTO {
  @IsOptional()
  @IsArray()
  @ApiProperty()
  notificationTypes: string[];

  public parseFilters(): void {
    if (this.notificationTypes) {
      this.addFilter({
        type: {
          $in: this.notificationTypes
        }
      });
    }
  }
}
