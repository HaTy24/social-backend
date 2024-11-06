import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { WebsocketService } from './websocket.service';

@Module({
  imports: [HttpModule],
  providers: [WebsocketService],
  exports: [WebsocketService],
})
export class WebsocketModule {}
