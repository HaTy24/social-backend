import { redisStore } from 'cache-manager-redis-yet';

import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GlobalModule } from '@core/global/global.module';
import { MetricsModule } from '@core/metrics/metrics.module';

import { AppController } from './app.controller';
import { ApiAdminModule } from './gateway/api-admin/api-admin.module';
import { ApiClientModule } from './gateway/api-client/api-client.module';
import { ApiPublicModule } from './gateway/api-public/api-public.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  controllers: [AppController],
  imports: [
    GlobalModule,
    ConfigModule.forRoot({
      envFilePath: ['.local.env', '.env'],
      isGlobal: true,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          url: configService.get('REDIS_URL'),
          password: configService.get('REDIS_PASSWORD'),
        }),
      }),
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow('DB_HOST'),
        port: +configService.getOrThrow('DB_PORT'),
        username: configService.getOrThrow('DB_USERNAME'),
        password: configService.getOrThrow('DB_PASSWORD'),
        database: configService.getOrThrow('DB_SCHEMA'),
        autoLoadEntities: true,
        entities: [],
        synchronize:
          configService.get('DB_SYNCHRONIZE')?.toLowerCase() === 'true' &&
          !configService.get('APP_ENV')?.toLowerCase()?.startsWith('prod'),
        logging: configService.get('DB_LOGGING')?.toLowerCase() === 'true',
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    ApiPublicModule,
    ApiClientModule,
    ApiAdminModule,
    TasksModule,
    MetricsModule,
  ],
})
export class AppModule {}
