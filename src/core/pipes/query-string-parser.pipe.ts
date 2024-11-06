import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class QueryStringParserPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'query') {
      return value;
    }

    try {
      if (value.offset) {
        value.offset = Number(value.offset);
      }

      if (value.limit) {
        value.limit = Number(value.limit);
      }

      return value;
    } catch (error) {
      throw new BadRequestException('Malformed filter object');
    }
  }
}
