import { CreateDateColumn, DeleteDateColumn, UpdateDateColumn } from 'typeorm';

export class Audit {
  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    select: false,
  })
  deletedAt: Date;
}
