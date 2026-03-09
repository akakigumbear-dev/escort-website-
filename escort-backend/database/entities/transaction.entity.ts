import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum TransactionStatus {
  PENDING = 'pending',
  PAYING = 'paying',
  PAID = 'paid',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'varchar' })
  userId!: string;

  /** Amount in GEL credited to the user balance. */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  /** OxaPay track_id for this invoice. */
  @Column({ type: 'varchar', unique: true })
  trackId!: string;

  /** OxaPay order_id — we set it to `userId:transactionId` for reconciliation. */
  @Column({ type: 'varchar', nullable: true })
  orderId!: string | null;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status!: TransactionStatus;

  /** Crypto currency used (e.g. USDT, BTC). Filled when webhook arrives. */
  @Column({ type: 'varchar', nullable: true })
  cryptoCurrency!: string | null;

  /** Amount actually paid in crypto. */
  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  cryptoAmount!: number | null;

  /** OxaPay payment URL for the user. */
  @Column({ type: 'varchar', nullable: true })
  paymentUrl!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
