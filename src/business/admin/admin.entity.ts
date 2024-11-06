import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { Audit } from '@core/database/audit';
import { ENTITY_STATUS, SYSTEM_USER_TYPE } from '@shared/constants';

@Entity({ name: 'system_users' })
export class SystemUser extends Audit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    nullable: false,
    default: ENTITY_STATUS.ACTIVE,
  })
  status: string;

  @Column({
    nullable: false,
    default: SYSTEM_USER_TYPE.MODERATOR,
  })
  user_type: string;

  @Column({
    name: 'email',
    nullable: false,
    unique: true,
  })
  email: string;

  @Column({
    name: 'password',
    nullable: false,
  })
  password: string;
}
