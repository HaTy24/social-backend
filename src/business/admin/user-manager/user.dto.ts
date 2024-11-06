import { Equals, IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Between, ILike, JsonContains } from 'typeorm';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PaginationDTO } from '@core/dto/pagination.dto';

import { ACCOUNT_TYPE } from '@business/user/user.entity';

import { ENTITY_STATUS } from '@shared/constants';
import {
  cleanDate,
  cleanEmail,
  cleanTextNoSpace,
  cleanTextWithUnderscore,
} from '@shared/helpers/text-cleaning-helper';

class FilterUser {
  @ApiPropertyOptional({
    example: '2023-11-01',
    name: 'filters[startDate]',
  })
  @IsString()
  startDate: Date;

  @ApiPropertyOptional({
    example: 'abcdefg',
    name: 'filters[referenceId]',
  })
  @MaxLength(100)
  @IsString()
  @IsOptional()
  referenceId: string;

  @ApiPropertyOptional({
    example: '2023-12-30',
    name: 'filters[endDate]',
  })
  @IsString()
  endDate: Date;

  @ApiPropertyOptional({
    example: '',
    name: 'filters[email]',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({
    example: '',
    name: 'filters[isVerifiedEmail]',
  })
  @IsString()
  @MaxLength(10)
  isVerifiedEmail: string;

  @ApiPropertyOptional({
    example: '',
    name: 'filters[fullname]',
  })
  @IsString()
  fullname: string;

  @ApiPropertyOptional({
    example: '',
    name: 'filters[twitterScreenName]',
  })
  @IsString()
  twitterScreenName: string;

  @ApiPropertyOptional({
    example: ENTITY_STATUS.ACTIVE,
    name: 'filters[status]',
  })
  @IsEnum([...Object.values(ENTITY_STATUS), 'pendingEmailActivation'])
  status: string;

  @ApiPropertyOptional({
    example: ACCOUNT_TYPE.NORMAL,
    name: 'filters[accountType]',
  })
  @Equals(ACCOUNT_TYPE[Object.values(ACCOUNT_TYPE) as unknown as string])
  accountType: ACCOUNT_TYPE;
}

export class AdminFilterUserDTO extends PaginationDTO {
  @ApiProperty({
    type: () => FilterUser,
  })
  filters: FilterUser;

  public parseFilters(): void {
    if (!this.filters) return;
    if (this.filters.startDate && this.filters.endDate) {
      this.addFilter({
        createdAt: Between(
          new Date(cleanDate(this.filters.startDate.toString())).toISOString(),
          new Date(cleanDate(this.filters.endDate.toString())).toISOString(),
        ),
      });
    }
    if (this.filters.fullname) {
      this.addFilter({
        fullname: ILike(`${cleanTextWithUnderscore(this.filters.fullname)}%`),
      });
    }

    if (this.filters.email) {
      this.addFilter({
        email: ILike(`${cleanEmail(this.filters.email)}%`),
      });
    }
    if (this.filters.twitterScreenName) {
      this.addFilter({
        twitterScreenName: ILike(
          `${cleanTextWithUnderscore(this.filters.twitterScreenName)}%`,
        ),
      });
    }
    if (this.filters.status) {
      const status = this.filters.status;
      if (status === 'pendingEmailActivation') {
        this.addFilter({ isVerifiedEmail: false });
      } else {
        this.addFilter({
          status: cleanTextNoSpace(this.filters.status),
        });
      }
    }
    if (this.filters.accountType) {
      this.addFilter({
        accountType: cleanTextWithUnderscore(this.filters.accountType),
      });
    }

    if (this.filters.isVerifiedEmail && ['true', 'false'].includes(this.filters.isVerifiedEmail)) {
      this.addFilter({
        isVerifiedEmail: this.filters.isVerifiedEmail === 'true'
      });
    }

    if (this.filters.referenceId) {
      const referenceId = this.filters.referenceId;
      const metaFilter = referenceId === 'null' ? { type: 'common' } : { referenceid: referenceId.toUpperCase() }

      this.addFilter({ metadata: JsonContains(metaFilter) })
    }
  }
}
export class AdminUpdateUserStatusDTO {
  @ApiProperty({ example: ENTITY_STATUS.ACTIVE })
  @IsIn(Object.values(ENTITY_STATUS))
  status: ENTITY_STATUS;
}

export class AdminUpdateUserAccountTypeDTO {
  @ApiProperty({ example: ACCOUNT_TYPE.INVESTMENT })
  @IsIn(Object.values(ACCOUNT_TYPE))
  accountType: ACCOUNT_TYPE;
}
