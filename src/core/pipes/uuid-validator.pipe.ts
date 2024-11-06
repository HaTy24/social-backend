import validator from 'validator';

import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class UUIDValidatorPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'param') {
      return value;
    }

    const isValid = validator.isUUID(value, '4')

    if (isValid) {
      return value;
    }

    throw new BadRequestException('invalid id format');
  }
}
