import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { Audit } from '@core/database/audit';

@Entity({ name: 'system_accounts' })
export class SystemAccount extends Audit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'user_id',
    type: "uuid",
    nullable: false,
  })
  @Index()
  userId: string;

  @Column({
    name: 'system_user_id',
    type: "uuid",
    nullable: false,
  })
  @Index()
  systemUserId: string;

}
