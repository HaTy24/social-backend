import { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { OSSDeleteQueue } from './oss-delete-queue.model';
import { format } from 'date-fns';


@Injectable()
export class OSSDeleteQueueService {
  constructor(@InjectModel(OSSDeleteQueue.name) private model: Model<OSSDeleteQueue>) { }

  async scheduleDelete(path: string, delay_in_second = 600): Promise<OSSDeleteQueue> {
    const dt = new Date();
    dt.setMinutes(dt.getSeconds() - delay_in_second);

    const createdOSSDeleteQueue = new this.model({ path, scheduled_at: +format(dt, 'yyyyMMddHHmmss') });
    return createdOSSDeleteQueue.save();
  }

  async getTop(limit = 10): Promise<OSSDeleteQueue[]> {
    return this.model.find({ scheduled_at: { $lt: +format(new Date(), 'yyyyMMddHHmmss') } }, null, { sort: 'scheduled_at', skip: 0, limit }).exec();
  }

  async delete(path: string) {
    return this.model.deleteOne({ path });
  }

}
