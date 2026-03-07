import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EscortProfile } from './escort-profile.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @OneToOne(() => EscortProfile, (profile) => profile.user)
  escort_profile?: EscortProfile;

  @CreateDateColumn()
  createdAt!: Date;
}