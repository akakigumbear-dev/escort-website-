import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
} from 'typeorm';
import { User } from './user.entity';
import { EscortProfile } from './escort-profile.entity';

@Entity('escort_reviews')
@Index('IDX_escort_reviews_userId_profileId', ['userId', 'profileId'], { unique: true }) // ერთ იუზერს ერთ პროფილზე ერთი review
@Check(`"rating" >= 1 AND "rating" <= 5`)
export class EscortReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  
  @Index('IDX_escort_reviews_userId')
  @Column('uuid')
  userId!: string;

  @ManyToOne(() => EscortProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profileId' })
  profile!: EscortProfile;

  @Index('IDX_escort_reviews_profileId')
  @Column('uuid')
  profileId!: string;

  // შეფასება 1-5
  @Column({ type: 'int' })
  rating!: number;

  // პატარა კომენტარი
  @Column({ type: 'text', nullable: true })
  comment?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}