import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './user.entity';
import { UserService } from './user.service';
import { UserEventHandlerService } from './user-event-handler.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  exports: [UserService],
  providers: [UserService, UserEventHandlerService],
})
export class UserModule {}
