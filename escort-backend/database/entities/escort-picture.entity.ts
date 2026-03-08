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

  @Index('IDX_escort_pictures_profileId')
  @Column('uuid')
  profileId!: string;

  // სურათის path (filesystem ან CDN URL)
  @Index('IDX_escort_pictures_picturePath')
  @Column({ type: 'varchar', length: 500 })
  picturePath!: string;

  // არის თუ არა მთავარი profile picture
  @Index('IDX_escort_pictures_isProfilePicture')
  @Column({ type: 'boolean', default: false })
  isProfilePicture!: boolean;

  // Premium: only visible to subscribers
  @Column({ type: 'boolean', default: false })
  isExclusive!: boolean;

  // 'image' | 'video' - infer from path if null
  @Column({ type: 'varchar', length: 20, nullable: true })
  mediaType!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}