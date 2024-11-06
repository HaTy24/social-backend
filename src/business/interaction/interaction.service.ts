import { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { BaseCRUDService } from '@shared/services/base-crud-service';

import { Interaction } from './interaction.model';

@Injectable()
export class InteractionService extends BaseCRUDService {
  constructor(@InjectModel(Interaction.name) model: Model<Interaction>) {
    super(model);
  }
}
