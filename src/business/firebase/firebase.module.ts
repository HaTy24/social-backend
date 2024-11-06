import { HttpService } from '@nestjs/axios';
import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseService {
  protected logger = new Logger(this.constructor.name);
  constructor(
    protected httpService: HttpService,
    protected configService: ConfigService,
  ) {}
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}
