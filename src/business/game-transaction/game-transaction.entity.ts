import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { Audit } from '@core/database/audit';

@Entity({ name: 'game_transactions' })
export class GameTransaction extends Audit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({
    name: 'user_id',
    nullable: false,
  })
  userId: string;

  @Column({
    name: 'ref_code',
    nullable: true,
    unique: true,
  })
  refCode: string;

  @Column({
    name: 'transaction_type',
    nullable: false,
  })
  transactionType: string;

  @Index()
  @Column({
    nullable: false,
  })
  status: string;

  @Index()
  @Column({
    name: 'tx_id',
    nullable: true,
  })
  txId: string;

  @Column({
    nullable: false,
    type: 'decimal',
    precision: 18,
    scale: 6,
  })
  amount: number;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  description: object;
}
