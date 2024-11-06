import { FilterQuery, Model, QueryOptions } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { BlockchainProfile } from '../models/blockchain.model';

@Injectable()
export class BlockchainProfileService {
  constructor(
    @InjectModel(BlockchainProfile.name)
    private model: Model<BlockchainProfile>,
  ) {}

  async save(data: Partial<BlockchainProfile>): Promise<BlockchainProfile> {
    const createdBlockchainProfile = new this.model(data);
    return createdBlockchainProfile.save();
  }

  async bulkCreate(
    data: Partial<BlockchainProfile>[],
  ): Promise<BlockchainProfile[]> {
    return this.model.create(...data);
  }

  public updateByWalletAddress(
    walletAddress: string,
    updateDto: Partial<BlockchainProfile>,
  ) {
    return this.model.findOneAndUpdate({ walletAddress }, updateDto, {
      new: true,
    });
  }

  public async find(
    filter: FilterQuery<BlockchainProfile>,
    options?: QueryOptions<BlockchainProfile>,
  ) {
    return this.model.find(filter, null, options).exec();
  }

  public async count(filter: FilterQuery<BlockchainProfile>) {
    return this.model.count(filter).exec();
  }
}
