import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EscortProfile } from './escort-profile.entity';
import { EscortReview } from './escort-review.entity';
import { UserRole } from 'database/enums/enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CLIENT })
  role!: UserRole;

  @OneToOne(() => EscortProfile, (profile) => profile.user)
  escort_profile?: EscortProfile;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => EscortReview, (review) => review.user)
  reviews!: EscortReview[];
}