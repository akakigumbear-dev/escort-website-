import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EscortProfile } from './escort-profile.entity';
import { User } from './user.entity';

@Entity('subscription_posts')
export class SubscriptionPost {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => EscortProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profileId' })
  profile!: EscortProfile;

  @Index('IDX_subscription_posts_profileId')
  @Column('uuid')
  profileId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorUserId' })
  author!: User;

  @Column('uuid')
  authorUserId!: string;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  mediaPath!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  mediaType!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
