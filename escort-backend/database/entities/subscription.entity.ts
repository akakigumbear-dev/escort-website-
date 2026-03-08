import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { EscortProfile } from './escort-profile.entity';
import { SubscriptionStatus } from 'database/enums/enums';

@Entity('subscriptions')
@Index('IDX_subscriptions_client_escort', ['clientId', 'escortProfileId'], {
  unique: true,
})
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client!: User;

  @Column('uuid')
  clientId!: string;

  @ManyToOne(() => EscortProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'escortProfileId' })
  escortProfile!: EscortProfile;

  @Column('uuid')
  escortProfileId!: string;

  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- SubscriptionStatus from database/enums */
  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
  status!: SubscriptionStatus;

  @Column({ type: 'timestamptz' })
  startDate!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endDate!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
