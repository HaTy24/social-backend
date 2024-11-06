import { Type } from 'class-transformer';
import { IsOptional, IsString, Max, Min } from 'class-validator';

import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiQuery } from '@nestjs/swagger';

export class PaginationDTO {
  @ApiProperty({
    example: 0
  })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  offset?: number;

  @ApiProperty({
    example: 10
  })
  @Min(1)
  @Max(200)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiProperty({
    example: "-createdAt"
  })
  @IsString()
  @IsOptional()
  sort?: string;

  // Purpose is to disallow external services to touch the original filter
  protected _filter: Record<string, any> = {};

  protected parseFilters() {}

  public get filter(): Record<string, any> {
    this.parseFilters();

    return this._filter;
  }

  public addFilter(newFilter: Record<string, any>): void {
    this._filter = Object.assign(this._filter, newFilter);
  }
}

export function UsePaginationQuery(options?: {
  offset?: number;
  limit?: number;
  sort?: string;
}) {
  return applyDecorators(
    ApiQuery({
      name: 'offset',
      example: options?.offset || 0,
    }),
    ApiQuery({
      name: 'limit',
      example: options?.limit || 10,
    }),
    ApiQuery({
      required: false,
      name: 'sort',
      example: options?.sort || '-createdAt',
    }),
  );
}
