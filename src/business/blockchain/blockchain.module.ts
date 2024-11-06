import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import {
  BlockchainProfile,
  BlockchainProfileSchema,
} from './models/blockchain.model';
import { BlockchainWrapperService } from './services/blockchain-wrapper.service';
import { BlockchainService } from './services/blockchain.service';
import { BlockchainProfileService } from './services/bockchain-profile.service';
import { AccountTypeConfigModule } from '@business/account-type-config/account-type-config.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    HttpModule,
    MongooseModule.forFeature([
      { name: BlockchainProfile.name, schema: BlockchainProfileSchema },
    ]),
    AccountTypeConfigModule
  ],
  providers: [
    BlockchainService,
    BlockchainWrapperService,
    BlockchainProfileService,
  ],
  exports: [
    BlockchainService,
    BlockchainWrapperService,
    BlockchainProfileService,
  ],
})
export class BlockchainModule {}
