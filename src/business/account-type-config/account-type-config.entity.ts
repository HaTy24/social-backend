import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { Audit } from '@core/database/audit';

import { ENTITY_STATUS } from '@shared/constants';
import { ACCOUNT_TYPE } from '@business/user/user.entity';

export interface AccountTypeConfigMetadata {
  sharePrice: string;
  txFee: string;
  buyLimit: number;
}

@Entity({ name: 'account_type_configs' })
export class AccountTypeConfig extends Audit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({
    name: 'user_id',
    nullable: false,
  })
  userId: string;

  @Index()
  @Column({
    nullable: false,
    default: ENTITY_STATUS.ACTIVE,
  })
  status: string;

  @Index()
  @Column({
    nullable: false,
    default: ACCOUNT_TYPE.NORMAL,
  })
  type: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'metadata',
  })
  metadata: AccountTypeConfigMetadata;
}
