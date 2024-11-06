import { CreatePostDTO } from '@business/post/post.dto';
import { POST_POLICY } from '@business/post/post.model';
import { PrePostDocument } from '@business/pre-post/pre-post.model';
import { PrePostService } from '@business/pre-post/pre-post.service';
import { User, extractPublicInfo } from '@business/user/user.entity';
import { UserService } from '@business/user/user.service';
import { RequestSystemUser } from '@core/decorators/request-system-user';
import { PaginationDTO } from '@core/dto/pagination.dto';
import { HttpResponse } from '@core/dto/response';
import { LogId } from '@core/logging/logging';
import { Body, Controller, Delete, Get, Logger, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { createId } from '@paralleldrive/cuid2';
import * as queryHelper from '@shared/helpers/query-helper';
import { cleanDate } from '@shared/helpers/text-cleaning-helper';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

export class CreatePrePostDTO extends CreatePostDTO {
  @ApiProperty({
    example: 'a36eef4c-1638-425b-baff-8925efda1151',
  })
  @IsNotEmpty()
  @IsString()
  ownerId: string;

  @ApiProperty({
    example: '2024-02-20T03:33:11.638Z',
  })
  @IsNotEmpty()
  @IsDateString()
  scheduled_at: string;
}

export class FilterPrePost {
  @ApiPropertyOptional({
    example: '2023-11-01',
    name: 'filters[startDate]',
  })
  @IsString()
  startDate: Date;

  @ApiPropertyOptional({
    example: '2024-12-30',
    name: 'filters[endDate]',
  })
  @IsString()
  endDate: Date;

  @ApiPropertyOptional({
    name: 'filters[hastags]',
  })
  @IsString()
  hastags: string;

  @ApiPropertyOptional({
    name: 'filters[status]',
  })
  @IsString()
  status: string;
}

export class AdminFilterPrePostDTO extends PaginationDTO {
  @ApiProperty({
    type: () => FilterPrePost,
  })
  filters: FilterPrePost;

  public parseFilters(): void {
    if (!this.filters) return;
    if (this.filters.hastags) {
      this.addFilter({
        hastags: this.filters.hastags,
      });
    }
    if (this.filters.startDate && this.filters.endDate) {
      this.addFilter({
        scheduled_at: {
          $gte: new Date(
            cleanDate(this.filters.startDate.toString()),
          ).toISOString(),
          $lt: new Date(
            cleanDate(this.filters.endDate.toString()),
          ).toISOString(),
        },
      });
    }
    if (this.filters.status) {
      this.addFilter({
        status: Number(this.filters.status),
      });
    }
  }
}

@ApiTags('admin/pre-post')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
@Controller('admin/pre-posts')
export class AdminPrePostController {
  private logger = new Logger(this.constructor.name);

  constructor(
    private userService: UserService,
    private prePostService: PrePostService,
  ) { }

  @Get()
  public async getPrePosts(
    @LogId() logId: string,
    @Query() dto: AdminFilterPrePostDTO,
  ): Promise<HttpResponse> {
    const sort = queryHelper.parseSortMongo(dto.sort);
    const prePostResult = await this.prePostService.paginate(dto, { sort });
    const rows = await Promise.all(
      prePostResult.rows.map(async (prePost: PrePostDocument) => {
        const owner = await this.userService.getOneByKey(prePost.ownerId);
        return {
          owner: extractPublicInfo(owner),
          scheduled_at: prePost.scheduled_at,
          status: prePost.status,
          slug: prePost.slug,
          text: prePost.text,
          media: prePost.media,
          hastags: prePost.hastags,
          createdAt: prePost.createdAt,
        };
      }),
    );
    return {
      success: true,
      data: {
        total: prePostResult.total,
        rows
      },
    };
  }

  @Get(':slug')
  public async getPrePostDetail(
    @LogId() logId: string,
    @Param('slug') slug: string,
  ): Promise<HttpResponse> {
    const prePost = await this.prePostService.getOne({ slug }) as PrePostDocument;
    const owner = await this.userService.getOneByKey(prePost.ownerId);
    return {
      success: true,
      data: {
        slug: prePost.slug,
        status: prePost.status,
        text: prePost.text,
        media: prePost.media,
        hastags: prePost.hastags,
        createdAt: prePost.createdAt,
        scheduled_at: prePost.scheduled_at,
        owner: extractPublicInfo(owner)
      },
    };
  }

  @Post()
  public async createPrePost(
    @LogId() logId: string,
    @RequestSystemUser() user: User,
    @Body() dto: CreatePrePostDTO,
  ): Promise<HttpResponse> {
    dto.policy ||= POST_POLICY.PUBLIC;
    const createdPost = await this.prePostService.create({
      ...dto,
      authorId: user.id,
      scheduled_at: new Date(dto.scheduled_at),
      slug: createId(),
    });

    return { success: true, data: createdPost };
  }

  @ApiParam({
    name: 'slug'
  })
  @Patch(':slug')
  public async updatePrePost(
    @LogId() logId: string,
    @RequestSystemUser() user: User,
    @Param('slug') slug: string,
    @Body() dto: CreatePrePostDTO,
  ): Promise<HttpResponse> {
    const createdPost = await this.prePostService.updateBySlug(slug, {
      ...dto,
      authorId: user.id,
      scheduled_at: new Date(dto.scheduled_at),
    } as any);

    return { success: true, data: createdPost };
  }

  @ApiParam({
    name: 'slug'
  })
  @Delete(':slug')
  public async deletePrePost(
    @LogId() logId: string,
    @Param('slug') slug: string,
  ): Promise<HttpResponse> {
    await this.prePostService.deleteBySlug(slug);
    return { success: true, };
  }
}
