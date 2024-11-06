import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { Audit } from '@core/database/audit';
import { ENTITY_STATUS } from '@shared/constants';

@Entity({ name: 'user_game_accounts' })
export class UserGameAccount extends Audit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({
    name: 'user_id',
    nullable: false,
    unique: true,
  })
  userId: string;

  @Index()
  @Column({
    name: 'user_game_id',
    nullable: true,
    unique: true,
  })
  userGameId: string;

  @Column({
    nullable: false,
    default: ENTITY_STATUS.ACTIVE,
  })
  status: string;

  @Column({
    name: 'password',
    nullable: false,
  })
  password: string;
}
