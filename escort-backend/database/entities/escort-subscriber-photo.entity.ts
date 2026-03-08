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

/** Photos visible only to subscribers of this escort profile. */
@Entity('escort_subscriber_photos')
export class EscortSubscriberPhoto {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => EscortProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profileId' })
  profile!: EscortProfile;

  @Index('IDX_escort_subscriber_photos_profileId')
  @Column('uuid')
  profileId!: string;

  @Column({ type: 'varchar', length: 500 })
  picturePath!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  mediaType!: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
