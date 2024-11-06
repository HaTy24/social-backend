import { PaginatePostNotCommentDTO, PaginatePostNotLikeDTO } from '@business/post/post.dto';
import { PostService } from '@business/post/post.service';
import { Conversation } from '@business/post/post.type';
import { User } from '@business/user/user.entity';
import { RequestUser } from '@core/decorators/request-user';
import { UsePaginationQuery } from '@core/dto/pagination.dto';
import { LogId } from '@core/logging/logging';
import { Controller, Get, Logger, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HttpResponse } from 'mvc-common-toolkit';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('client/others')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('others')
export class OtherController {
  private logger = new Logger(this.constructor.name);

  constructor(
    private postService: PostService
  ) { }

  @UsePaginationQuery()
  @Get('not-like')
  public async getPostsNotLike(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Query() dto: PaginatePostNotLikeDTO,
  ): Promise<HttpResponse> {
    const viewerId = user.id;

    const postNotLikeResult = await this.postService.getPostNotLike(
      dto,
      viewerId,
    );

    if (postNotLikeResult.rows.length === 0) {
      return {
        success: true,
        data: {
          total: 0,
          rows: [],
        },
      };
    }

    const listPostSlug = postNotLikeResult.rows.map((i) => i.slug);

    return {
      success: true,
      data: {
        total: postNotLikeResult.metadata[0].total,
        rows: listPostSlug,
      },
    };
  }

  @UsePaginationQuery()
  @Get('new-comment')
  public async getPostNewComment(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Query() dto: PaginatePostNotCommentDTO,
  ): Promise<HttpResponse> {
    const viewerId = user.id;

    const postHaveNewCommentResult = await this.postService.getPostHaveNewComment(dto, viewerId);

    if (postHaveNewCommentResult.rows.length === 0) {
      return { success: true, data: { total: 0, rows: [], }, };
    }

    const conversation: Conversation[] = postHaveNewCommentResult.rows.map(
      (post) => {
        return {
          post: {
            slug: post.slug,
            text: post.text,
          },
          reply: {
            slug: post.reply.slug,
            text: post.reply.text,
          },
        };
      },
    );

    return {
      success: true,
      data: {
        total: postHaveNewCommentResult.metadata[0].total,
        rows: conversation,
      },
    };
  }

  @UsePaginationQuery()
  @Get('not-comment')
  public async getNewComment(
    @LogId() logId: string,
    @RequestUser() user: User,
    @Query() dto: PaginatePostNotCommentDTO,
  ): Promise<HttpResponse> {
    const viewerId = user.id;
    const postNotCommentResult = await this.postService.getPostNotComment( dto, viewerId, );
    if (postNotCommentResult.rows.length === 0) {
      return { success: true, data: { total: 0, rows: [], }, };
    }

    const listPostSlug = postNotCommentResult.rows.map((i) => ({ slug: i.slug, text: i.text, }));

    return {
      success: true,
      data: {
        total: postNotCommentResult.metadata[0].total,
        rows: listPostSlug,
      },
    };
  }

}
