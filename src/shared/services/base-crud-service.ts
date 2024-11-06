import { Model } from 'mongoose';

import { PaginationDTO } from '@core/dto/pagination.dto';

import { FindOptions } from '@shared/types';

export class BaseCRUDService {
  constructor(protected domainModel: Model<any, any>) {}

  protected parseLimit(limit: number) {
    return limit || 10;
  }

  protected parseSkip(offset: number) {
    return offset || 0;
  }

  public getOne(filter: any = {}, options: Partial<FindOptions> = {}) {
    const query = this.domainModel.findOne({
      ...filter,
      deletedAt: null,
    });

    if (options.select) {
      query.select(options.select);
    }

    if (options.populate) {
      query.populate(options.populate);
    }

    if (options.sort) {
      query.sort(options.sort);
    }

    return query.exec();
  }

  public count(filter: any = {}) {
    return this.domainModel.count({
      ...filter,
      deletedAt: null,
    });
  }

  public async paginate(
    pagingDTO: PaginationDTO,
    options: Partial<FindOptions> = {},
  ) {
    const { limit = 10, offset = 0, filter } = pagingDTO || {};

    const total = await this.domainModel.count({
      ...filter,
      deletedAt: null,
    });

    const findQuery = this.domainModel
      .find({
        ...filter,
        deletedAt: null,
      })

      .skip(this.parseSkip(offset))
      .limit(this.parseLimit(limit));

    if (pagingDTO.sort || options.sort) {
      findQuery.sort(options.sort || pagingDTO.sort);
    }

    if (options.populate) {
      findQuery.populate(options.populate);
    }

    if (options.select) {
      findQuery.select = options.select;
    }

    const rows = await findQuery.exec();

    return {
      rows,
      total,
      limit,
      offset,
    };
  }

  public async getAll(filter?: any, options: Partial<FindOptions> = {}) {
    const findQuery = this.domainModel.find({
      ...filter,
      deletedAt: null,
    });

    if (options.sort) {
      findQuery.sort(options.sort);
    }

    if (options.populate) {
      findQuery.populate(options.populate);
    }

    if (options.select) {
      findQuery.select = options.select;
    }

    const rows = await findQuery.exec();

    return rows;
  }

  public getById(_id: string, options: Partial<FindOptions> = {}) {
    const findQuery = this.domainModel.findOne({ _id, deletedAt: null });

    if (options.populate) {
      findQuery.populate(options.populate);
    }

    if (options.select) {
      findQuery.select(options.select);
    }

    return findQuery.exec();
  }

  public async create(createDTO: any) {
    const newModel = await this.domainModel.create(createDTO);

    return newModel.save();
  }

  public updateById(id: string, updateDTO: any) {
    return this.domainModel.findByIdAndUpdate(id, updateDTO, { new: true });
  }

  public bulkUpdate(criteria: any, updateDTO: any) {
    return this.domainModel.updateMany(criteria, updateDTO, {
      new: true,
    });
  }

  public deleteById(id: string) {
    return this.domainModel.findByIdAndUpdate(id, {
      deletedAt: new Date(),
    });
  }

  public forceDeleteById(id: string) {
    return this.domainModel.findByIdAndDelete(id);
  }

  public bulkDelete(filter: any) {
    return this.domainModel.deleteMany(filter);
  }
}
