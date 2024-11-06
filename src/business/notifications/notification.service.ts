import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseCRUDService } from '@shared/services/base-crud-service';

import { NotificationHttpRequestService } from './notification-http-request.service';
import { NOTIFICATION_TYPE, Notification } from './notification.model';
import { Post } from '@business/post/post.model';
import { PublicUser, User, extractPublicInfo } from '@business/user/user.entity';
import { stringUtils } from 'mvc-common-toolkit';

@Injectable()
export class NotificationService extends BaseCRUDService {
  constructor(
    @InjectModel(Notification.name) model: Model<Notification>,

    protected notificationHttpRequestService: NotificationHttpRequestService,
  ) {
    super(model);
  }

  public async postNotification(
    interactor: User,
    originalPost: Post,
    post: Post,
    type: NOTIFICATION_TYPE,
  ) {
    const group = `${type}:${originalPost.slug}`;

    let noti = await this.getOne({
      group,
      'metadata.readStatus.userId': { $ne: originalPost.ownerId },
      'content.users.id': { $ne: interactor.id},
    });

    if (!noti) {
      noti = await this.create({
        type,
        group,
        toUserIds: [originalPost.ownerId],
        content: { users: [], originalSlug: originalPost.slug, slug: post?.slug, text: originalPost.text },
      });
    }

    await this.domainModel.updateOne(
      { _id: noti._id },
      { $push: { 'content.users': extractPublicInfo(interactor) } },
    );

    await this.notificationHttpRequestService.sendNotificationRequest({
      logId: stringUtils.generateRandomId(),
      userIds: [originalPost.ownerId],
      content: noti
        ? noti.content
        : {
            users: [],
            originalSlug: originalPost.slug,
            slug: post?.slug,
            text: originalPost.text,
          },
    });
  }

  public async postRemoveNotification(
    interactor: User,
    originalPost: Post,
    post: Post,
    type: NOTIFICATION_TYPE,
  ): Promise<void> {
    const group = `${type}:${originalPost.slug}`;

    const noti = await this.getOne({
      group,
      'metadata.readStatus.userId': { $ne: originalPost.ownerId },
    });

    if (!noti) return;

    const users = noti.content?.users?.filter((u: PublicUser) => u.id != interactor.id);
    if (users?.length == 0) {
      await this.deleteById(noti._id);
      return;
    }

    await this.domainModel.updateOne(
      { _id: noti._id },
      { $set: { 'content.users': users } },
    );
  }

  public async markNotificationsAsRead(
    userId: string,
    notiIds: string[],
  ): Promise<void> {
    const notifications = await this.getAll({
      _id: {
        $in: notiIds,
      },
    });

    await Promise.all(
      notifications.map(async (noti) => {
        const exitedUser = noti?.metadata?.readStatus?.find(
          (readStatus) => readStatus.userId === userId,
        );
        if (exitedUser) {
          return;
        }

        const readData = {
          userId,
          readAt: new Date(),
        };

        await this.domainModel.updateOne(
          { _id: noti },
          { $push: { 'metadata.readStatus': readData } },
        );
      }),
    );
  }
}
