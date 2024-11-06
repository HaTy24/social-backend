import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  ImageProcessedEvent,
  ImageRejectedEvent,
} from '@business/event/event.model';
import { OSSDeleteQueueService } from '@business/oss-management/oss-delete-queue.service';

import { APP_EVENT, SOURCE_TYPE } from '@shared/constants';

import { PostService } from './post.service';

@Injectable()
export class PostEventHandlerService {
  protected logger = new Logger(PostEventHandlerService.name);

  constructor(
    protected postService: PostService,

    protected ossDeleteQueueService: OSSDeleteQueueService,
  ) {}

  @OnEvent(APP_EVENT.IMAGE_PROCESSED)
  public async handleImageProcessedEvent(
    event: ImageProcessedEvent,
  ): Promise<void> {
    this.logger.debug(`[${event.logId}]: Handle image processed event`);

    if (event.sourceType != SOURCE_TYPE.POST) {
      return;
    }

    const foundPost = await this.postService.getOne({
      slug: event.postSlug,
    });
    if (!foundPost) return;

    const image = foundPost.media[event.imageIndex];
    if (image?.original) {
      await this.ossDeleteQueueService.scheduleDelete(
        image.original.split('/')[3],
      );
    }

    foundPost.media[event.imageIndex] = {
      ...foundPost.media[event.imageIndex],
      ...event.imagesResized,
    };

    await this.postService.updateById(foundPost._id, {
      media: foundPost.media,
    });
  }

  @OnEvent(APP_EVENT.IMAGE_REJECTED)
  public async handleImageRejectedEvent(
    event: ImageRejectedEvent,
  ): Promise<void> {
    this.logger.debug(`[${event.logId}]: Handle image rejected event`);

    if (event.sourceType != SOURCE_TYPE.POST) {
      return;
    }

    await this.postService.forceDeleteBySlug(event.postSlug);
  }
}
