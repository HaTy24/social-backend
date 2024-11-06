import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { BaseCRUDService } from '@shared/services/base-crud-service';
import { Connection, Model } from 'mongoose';
import { PREPOST_STATUS, PrePost } from './pre-post.model';

@Injectable()
export class PrePostService extends BaseCRUDService {
  protected logger = new Logger(this.constructor.name);

  constructor(
    @InjectModel(PrePost.name)
    protected repo: Model<PrePost>,
    @InjectConnection() protected connection: Connection,
  ) {
    super(repo);
  }

  async deleteBySlug(slug: string) {
    return this.repo.deleteOne({ slug });
  }

  async updateBySlug(slug: string, data: Partial<PrePost>) {
    return this.repo.updateOne({ slug }, data);
  }

  async getTop(limit = 5): Promise<PrePost[]> {
    return this.repo.find({ scheduled_at: { $lt: new Date() }, status: PREPOST_STATUS.PENDING }, null, { sort: 'scheduled_at', skip: 0, limit }).exec();
  }

}
