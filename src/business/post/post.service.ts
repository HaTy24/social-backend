import { createId } from '@paralleldrive/cuid2';
import { Connection, Model } from 'mongoose';

import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import { PaginationDTO } from '@core/dto/pagination.dto';

import { UserService } from '@business/user/user.service';

import { extractTagsFromText } from '@shared/helpers/tags-helper';
import { BaseCRUDService } from '@shared/services/base-crud-service';
import { PostInteractionData } from '@shared/types';

import {
  INTERACTION_ACTION,
  InteractionDocument,
} from '../interaction/interaction.model';
import { InteractionService } from '../interaction/interaction.service';
import { extractPublicInfo } from '../user/user.entity';
import { CreatePostDTO } from './post.dto';
import {
  POST_POLICY,
  POST_TYPE,
  Post,
  PostDocument,
  ReplyMetadata,
} from './post.model';
import { PostView, ViewPostData } from './post.type';

@Injectable()
export class PostService extends BaseCRUDService {
  protected logger = new Logger(PostService.name);

  constructor(
    @InjectModel(Post.name)
    protected repo: Model<Post>,

    protected userService: UserService,
    protected interactionService: InteractionService,
    @InjectConnection() protected connection: Connection,
  ) {
    super(repo);
  }

  public async writeComment(
    userId: string,
    slug: string,
    dto: CreatePostDTO,
  ): Promise<Post> {
    const originalPost: PostDocument = await this.getOne({ slug });

    const postComment = Post.from({
      type: POST_TYPE.REPLY,
      policy: POST_POLICY.PUBLIC,
      ownerId: userId,
      slug: createId(),
      media:
        dto.media && dto.media.length
          ? dto.media.map((media) => ({ original: media }))
          : [],
      tags: extractTagsFromText(dto.text),
      text: dto.text,
      replyMetadata: {
        postSlug: slug,
        ownerId: originalPost.ownerId,
      },
    });

    await this.create(postComment);

    return postComment;
  }

  public async interactWithPost(
    userId: string,
    slug: string,
    action: INTERACTION_ACTION,
  ): Promise<void> {
    return this.interactionService.create({
      actionUserId: userId,
      postSlug: slug,
      action,
      metadata: {},
    });
  }

  public async undoInteractWithPost(
    userId: string,
    slug: string,
    action: INTERACTION_ACTION,
  ): Promise<void> {
    const foundInteraction = await this.interactionService.getOne({
      actionUserId: userId,
      postSlug: slug,
      action,
    });

    if (!foundInteraction) {
      return;
    }

    await this.interactionService.forceDeleteById(foundInteraction.id);
  }

  public async createRetweet(userId: string, slug: string) {
    const originalPost: PostDocument = await this.getOne({ slug });

    const retweetPost = Post.from({
      type: POST_TYPE.RETWEET,
      ownerId: userId,
      slug: createId(),
      media: [],
      tags: [],
      text: '',
      policy: POST_POLICY.PUBLIC,
      repostMetadata: {
        postSlug: slug,
        ownerId: originalPost.ownerId,
      },
    });

    return this.create(retweetPost);
  }

  public async getPostInteractions(
    data: ViewPostData,
  ): Promise<PostInteractionData> {
    const postLikes = await this.interactionService.count({
      postSlug: data.slug,
      action: INTERACTION_ACTION.LIKE,
    });

    const retweetCount = await this.count({
      'repostMetadata.postSlug': data.slug,
    });

    const commentCount = await this.count({
      'replyMetadata.postSlug': data.slug,
    });

    const viewerInteractions: InteractionDocument[] =
      await this.interactionService.getAll({
        postSlug: data.slug,
        actionUserId: data.viewerId || undefined,
      });

    return {
      likesCount: postLikes,
      retweetCount,
      commentCount,
      viewerInteractions: viewerInteractions.map((i) => i.action),
    };
  }

  public async viewPost(logId: string, data: ViewPostData): Promise<PostView> {
    const post = await this.getOne({ slug: data.slug });
    if (!post) return null;

    const { viewerInteractions, likesCount, commentCount, retweetCount } =
      await this.getPostInteractions(data);
    const metadata: Record<string, any> = {};
    const postOwner = await this.userService.getOneByKey(post.ownerId);
    const mtdt: ReplyMetadata =
      post.type === POST_TYPE.REPLY ? post.replyMetadata : post.repostMetadata;

    if (mtdt?.postSlug) {
      const originalPost = await this.getOne({ slug: mtdt.postSlug });
      if (originalPost) {
        const canViewOriginalPost = originalPost.policy === POST_POLICY.PUBLIC;
        const originalPostOwner = await this.userService.getById(mtdt.ownerId);

        metadata.originalPost = {
          type: originalPost.type,
          policy: originalPost.policy,
          slug: canViewOriginalPost ? originalPost.slug : null,
          text: canViewOriginalPost ? originalPost.text : null,
          media: canViewOriginalPost ? originalPost.media : null,
          createdAt: originalPost.createdAt,
          canView: canViewOriginalPost,
        };
        metadata.originalUser = {
          ...extractPublicInfo(originalPostOwner),
          balance: '0',
          imageUrl: originalPostOwner.profile_image_url,
          username: originalPostOwner.twitterScreenName,
        };
      }
    }

    return {
      actions: viewerInteractions,
      likesCount,
      retweetCount,
      type: post.type,
      policy: post.policy,
      createdAt: post.createdAt,
      commentCount,
      media: post.media,
      text: post.text,
      slug: post.slug,
      metadata,
      user: {
        ...extractPublicInfo(postOwner),
        balance: '0',
        imageUrl: postOwner.profile_image_url,
        username: postOwner.twitterScreenName,
        share: {
          buyPrice: '0',
          sellPrice: '0',
        },
      },
    };
  }

  public async forceDeleteBySlug(slug: string): Promise<void> {
    const foundPost: PostDocument = await this.getOne({ slug });
    if (!foundPost) {
      return;
    }

    await this.bulkDelete({
      type: [POST_TYPE.REPLY],
      'replyMetadata.postSlug': slug,
    });

    await this.bulkDelete({
      type: [POST_TYPE.RETWEET],
      'repostMetadata.postSlug': slug,
    });

    await this.interactionService.bulkDelete({
      postSlug: slug,
    });

    await super.forceDeleteById(foundPost.id);
  }

  public async getPostNotLike(paginationDTO: PaginationDTO, userId: string) {
    const data = await this.domainModel.aggregate([
      {
        $lookup: {
          from: 'interactions',
          localField: 'slug',
          foreignField: 'postSlug',
          pipeline: [
            {
              $match: { action: INTERACTION_ACTION.LIKE },
            },
          ],
          as: 'interactions',
        },
      },
      {
        $match: {
          type: POST_TYPE.TWEET,
          'interactions.actionUserId': { $ne: userId },
          ownerId: { $ne: userId },
        },
      },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          rows: [
            { $skip: paginationDTO.offset },
            { $limit: paginationDTO.limit },
            { $sort: { createdAt: -1 } },
          ],
        },
      },
    ]);

    return data[0];
  }

  public async getPostHaveNewComment(
    paginationDTO: PaginationDTO,
    userId: string,
  ) {
    const data = await this.domainModel.aggregate([
      {
        $lookup: {
          from: 'posts',
          let: {
            slug: '$slug',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { type: POST_TYPE.REPLY },
                    {
                      $eq: ['$replyMetadata.postSlug', '$$slug'],
                    },
                    {
                      $ne: ['$ownerId', userId],
                    },
                  ],
                },
              },
            },
            { $sort: { 'replyMetadata.createdAt': -1 } },
            { $limit: 1 },
          ],
          as: 'reply',
        },
      },
      {
        $unwind: {
          path: '$reply',
          preserveNullAndEmptyArrays: true,
        },
      },
      { $sort: { 'reply.replyMetadata.createdAt': -1 } },
      {
        $match: {
          ownerId: userId,
          type: POST_TYPE.TWEET,
          reply: { $exists: true },
        },
      },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          rows: [
            { $skip: paginationDTO.offset },
            { $limit: paginationDTO.limit },
            { $sort: { createdAt: -1 } },
          ],
        },
      },
    ]);

    return data[0];
  }

  public async getPostNotComment(paginationDTO: PaginationDTO, userId: string) {
    const data = await this.domainModel.aggregate([
      {
        $lookup: {
          from: 'posts',
          let: {
            slug: '$slug',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { type: POST_TYPE.REPLY },
                    {
                      $eq: ['$replyMetadata.postSlug', '$$slug'],
                    },
                    {
                      $ne: ['$replyMetadata.ownerId', userId],
                    },
                  ],
                },
              },
            },
            { $sort: { 'replyMetadata.createdAt': -1 } },
          ],
          as: 'reply',
        },
      },
      {
        $unwind: {
          path: '$reply',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          ownerId: { $ne: userId },
          type: POST_TYPE.TWEET,
          reply: { $exists: false },
        },
      },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          rows: [
            { $skip: paginationDTO.offset },
            { $limit: paginationDTO.limit },
            { $sort: { createdAt: -1 } },
          ],
        },
      },
    ]);

    return data[0];
  }
}
