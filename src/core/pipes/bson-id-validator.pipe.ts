import { isValidObjectId } from 'mongoose';

import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class BSONIdValidatorPipe implements PipeTransform {
  constructor(protected fieldName = 'id') {}

  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'param' || metadata.data !== this.fieldName) {
      return value;
    }

    const isValid = isValidObjectId(value);

    if (isValid) {
      return value;
    }

    throw new BadRequestException('invalid bson id format');
  }
}
