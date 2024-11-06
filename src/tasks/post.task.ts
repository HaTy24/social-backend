import { createId } from '@paralleldrive/cuid2';
import { AuditService, ErrorLog } from 'mvc-common-toolkit';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

import { TagUserEvent } from '@business/event/event.model';
import { ImageService } from '@business/image/image.service';
import { MessageQueueService } from '@business/message-queue/message-queue.service';
import { CreatePostDTO } from '@business/post/post.dto';
import { POST_TYPE } from '@business/post/post.model';
import { PostService } from '@business/post/post.service';
import { PREPOST_STATUS } from '@business/pre-post/pre-post.model';
import { PrePostService } from '@business/pre-post/pre-post.service';
import { User } from '@business/user/user.entity';
import { UserService } from '@business/user/user.service';

import {
  APP_EVENT,
  ERR_CODE,
  IMG_TASK_GOAL,
  IMG_TASK_TYPE,
  INJECTION_TOKEN,
  SOURCE_TYPE,
} from '@shared/constants';
import {
  extractTagUserFromText,
  extractTagsFromText,
} from '@shared/helpers/tags-helper';
import { cleanHTML } from '@shared/helpers/text-cleaning-helper';

@Injectable()
export class PostTask {
  private readonly logger = new Logger(this.constructor.name);
  private isBusy = false;

  constructor(
    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    private auditService: AuditService,
    private eventEmitter: EventEmitter2,
    private imageService: ImageService,
    private messageQueueService: MessageQueueService,
    private postService: PostService,
    private prePostService: PrePostService,
    private userService: UserService,
  ) {}

  // @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCron() {
    const logId = createId().toUpperCase();
    this.logger.log(`[${logId}]: Trigger PostTask`);
    if (this.isBusy) {
      this.logger.log(`[${logId}]: End PostTask cause of busy`);
      return;
    }
    this.isBusy = true;
    try {
      const preposts = await this.prePostService.getTop();
      this.logger.log(`[${logId}]: Found ${preposts?.length} PrePost(s)`);
      if (!preposts?.length) {
        this.isBusy = false;
        this.logger.log(`[${logId}]: End PostTask cause of no prepost found`);
        return;
      }

      for (let i = 0; i < preposts.length; i++) {
        this.logger.log(`[${logId}]: Start ${i}`);

        const prepost = preposts[i];

        const dto: CreatePostDTO = {
          text: prepost.text,
          media: prepost.media as any,
          hastags: prepost.hastags,
          policy: prepost.policy,
        };
        const user = await this.userService.getById(prepost.ownerId);
        const slug = prepost.slug;

        const result = await this.createNewPost(
          `${logId}.${i}`,
          user,
          dto,
          slug,
        ).catch((e) => {
          this.logger.error(`[${logId}]: Error ${i}`, e);
          return { success: false, exception: e };
        });
        if (result.success) {
          this.logger.log(`[${logId}]: Delete ${i} ${slug}`);
          await this.prePostService.updateBySlug(slug, {
            status: PREPOST_STATUS.SUCCESS,
          });
        } else {
          await this.prePostService.updateBySlug(slug, {
            status: PREPOST_STATUS.FAIL,
          });
        }

        this.logger.log(`[${logId}]: Done ${i}`);
      }
    } catch (e) {
      this.logger.error(e.message, e.stack);

      this.auditService.emitLog(
        new ErrorLog({
          logId,
          message: e.message,
          action: 'PostTask',
        }),
      );
    }
    this.isBusy = false;
    this.logger.log(`[${logId}]: End PostTask`);
  }

  public async createNewPost(
    logId: string,
    user: User,
    dto: CreatePostDTO,
    slug: string,
  ) {
    const cleanedText = cleanHTML(dto.text);
    const tags = extractTagsFromText(cleanedText);

    if (dto.media?.length) {
      const checkNSFWResult = await Promise.all(
        (dto.media as unknown as string[]).map(async (imageUrl: string) => {
          const result = await this.imageService.checkImageNSFW(
            logId,
            imageUrl,
          );

          const { success, data } = result;

          if (!success || !data.isSafe) {
            return false;
          }

          return true;
        }),
      );

      if (checkNSFWResult.includes(false)) {
        return {
          success: false,
          message: 'image is nsfw',
          code: ERR_CODE.IMG_IS_NSFW,
        };
      }
    }

    const createdPost = await this.postService.create({
      type: POST_TYPE.TWEET,
      ownerId: user.id,
      media:
        dto.media && dto.media.length
          ? dto.media.map((media) => ({ original: media }))
          : [],
      policy: dto.policy,
      text: cleanedText,
      slug,
      tags,
    });

    const tagUser = extractTagUserFromText(cleanedText);
    if (tagUser.length) {
      const userIds = await Promise.all(
        tagUser.map(async (userName: string) => {
          const foundUserByUserName =
            await this.userService.getByTwitterScreenName(userName);
          if (!foundUserByUserName) {
            return null;
          }

          return foundUserByUserName.id;
        }),
      );

      this.eventEmitter.emit(
        APP_EVENT.TAG_USER,
        TagUserEvent.from({
          logId,
          postOwnerId: user.id,
          postOwnerScreenName: user.twitterScreenName,
          postOwnerProfileImage: user.profile_image_url,
          postSlug: createdPost.slug,
          postText: cleanedText,
          taggedUserIds: userIds.filter((i) => i),
        }),
      );
    }

    if (dto?.media?.length) {
      await Promise.all(
        (dto.media as any).map(async (imageUrl: string, index: number) => {
          await this.messageQueueService.publishMessage(
            JSON.stringify({
              sourceType: SOURCE_TYPE.POST,
              imageIndex: index,
              postSlug: createdPost.slug,
              fileName: imageUrl.split('/')[3],
              fileURL: imageUrl,
              type: IMG_TASK_TYPE.USER_UPLOAD,
              goal: IMG_TASK_GOAL.RESIZE_AND_COMPRESS,
            }),
          );
        }),
      );
    }

    return { success: true, data: createdPost };
  }
}
