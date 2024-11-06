import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FEEDBACK_STATUS } from '@shared/constants';
import { cleanHTML } from '@shared/helpers/text-cleaning-helper';
import { BaseCRUDService } from '@shared/services/base-crud-service';
import { Model } from 'mongoose';
import { CreateFeedbackDTO } from './feedback.dto';
import { Feedback } from './feedback.model';


@Injectable()
export class FeedbackService extends BaseCRUDService {
  constructor(
    @InjectModel(Feedback.name)
    protected feedbackRepository: Model<Feedback>,
  ) {
    super(feedbackRepository);
  }

  public async createFeedback(
    dto: CreateFeedbackDTO,
  ): Promise<void> {

    const cleanedTitleText = cleanHTML(dto.title);
    const cleanedFeedbackText = cleanHTML(dto.feedback);
    await this.create({
      status: FEEDBACK_STATUS.SUBMITTED,
      images: dto.images,
      title: cleanedTitleText,
      feedback: cleanedFeedbackText,
      phoneNumber: dto.phoneNumber,
      email: dto.email,
    });

  }

}
