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

  /** Nullable for legacy users created before phone was required. New registrations must provide it. */
  @Column({ type: 'varchar', unique: true, nullable: true })
  phoneNumber!: string | null;

  @Column()
  password!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CLIENT })
  role!: UserRole;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance!: number;

  @OneToOne(() => EscortProfile, (profile) => profile.user)
  escort_profile?: EscortProfile;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => EscortReview, (review) => review.user)
  reviews!: EscortReview[];
}
