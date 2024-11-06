
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { FEEDBACK_STATUS } from '@shared/constants';


@Schema({ collection: 'feedbacks', timestamps: true })
export class Feedback {
  public static from(data: Partial<Feedback>): Feedback {
    const entity = new Feedback();
    Object.assign(entity, data);

    return entity;
  }

  @Prop()
  title: string;

  @Prop()
  feedback: string;

  @Prop()
  phoneNumber: string;

  @Prop()
  email: string;

  @Prop({
    default: FEEDBACK_STATUS.SUBMITTED
  })
  status: FEEDBACK_STATUS;

  @Prop({
    type: [String],
  })
  images: string[];

  @Prop({
    select: false,
    index: true,
  })
  deletedAt: Date;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
