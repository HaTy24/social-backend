import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PaginationDTO } from '@core/dto/pagination.dto';

import { cleanAlphaNumeric } from '@shared/helpers/text-cleaning-helper';

import { INTERACTION_ACTION } from '../interaction/interaction.model';
import { POST_POLICY } from './post.model';

export class CreatePostDTO {
  @ApiProperty({
    example: 'this is a tweet',
  })
  @MinLength(1)
  @MaxLength(2000)
  text: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ApiPropertyOptional({
    example: ['this is a media'],
  })
  media: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ApiPropertyOptional({
    example: ['this is a hashtag'],
  })
  hastags: string[];

  @ApiPropertyOptional({
    example: POST_POLICY.PUBLIC,
    enum: POST_POLICY,
  })
  @IsOptional()
  @IsEnum(POST_POLICY)
  policy?: POST_POLICY;
}

export class AdminCreatePostDTO {

  @ApiProperty({
    example: '0fa4825c-742a-4429-be3b-159ca95f47b5',
  })
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    example: 'this is a tweet',
  })
  @MinLength(1)
  @MaxLength(2000)
  text: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ApiPropertyOptional({
    example: ['this is a media'],
  })
  media: string[];
}

export class PostInteractDTO {
  @ApiProperty({
    example: INTERACTION_ACTION.LIKE,
    enum: INTERACTION_ACTION,
  })
  @IsEnum(INTERACTION_ACTION)
  action: INTERACTION_ACTION;
}

export class PaginatePostCommentsDTO extends PaginationDTO {
  public parseFilters(): void {}
}

export class PaginateUserHomePostsDTO extends PaginationDTO {
  public parseFilters(): void {}
}

export class GetRecentPostsDTO extends PaginationDTO {
  @IsOptional()
  @MaxLength(20)
  tag: string;

  public parseFilters(): void {
    if (this.tag) {
      this.addFilter({
        tags: cleanAlphaNumeric(this.tag.toLowerCase()),
      });
    }
  }
}

export class PaginatePostNotLikeDTO extends PaginationDTO {
  public parseFilters(): void {}
}

export class PaginatePostNotCommentDTO extends PaginationDTO {
  public parseFilters(): void {}
}
