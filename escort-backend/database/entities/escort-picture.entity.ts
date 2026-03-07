import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EscortProfile } from './escort-profile.entity';

@Entity('escort_pictures')
export class EscortPicture {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => EscortProfile, (profile) => profile.pictures, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profileId' })
  profile!: EscortProfile;

  @Index()
  @Column('uuid')
  profileId!: string;

  // სურათის path (filesystem ან CDN URL)
  @Index()
  @Column({ type: 'varchar', length: 500 })
  picturePath!: string;

  // არის თუ არა მთავარი profile picture
  @Index()
  @Column({ type: 'boolean', default: false })
  isProfilePicture!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}