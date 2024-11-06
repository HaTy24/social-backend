import { IsOptional, IsString, MaxLength } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { PaginationDTO } from '@core/dto/pagination.dto';

export class PaginateUserChatsDTO extends PaginationDTO {
  protected parseFilters(): void {
    return;
  }
}

export class PaginateChatMessagesDTO extends PaginationDTO {
  protected parseFilters(): void {}

  @ApiProperty()
  @IsOptional()
  position: number;
}

export class SendMessageDTO {
  public static from(data: any): SendMessageDTO {
    const instance = new SendMessageDTO();

    Object.assign(instance, data);

    return instance;
  }

  @ApiProperty()
  @MaxLength(500)
  content: string;

  @ApiProperty()
  @IsOptional()
  images: string[];
}

export class ReplyMessageDTO {
  public static from(data: any): ReplyMessageDTO {
    const instance = new ReplyMessageDTO();

    Object.assign(instance, data);

    return instance;
  }

  @ApiProperty()
  @IsString()
  messageId: string;

  @ApiProperty()
  @MaxLength(500)
  content: string;

  @ApiProperty()
  @IsOptional()
  images: string[];
}

export class DeleteMessageDTO {
  @ApiProperty()
  @IsString()
  messageId: string;
}
