import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EscortProfile } from './escort-profile.entity';
import { ServiceLocation } from 'database/enums/enums';


@Entity('escort_prices')
@Unique(['profile', 'serviceLocation'])
export class EscortPrices {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => EscortProfile, { onDelete: 'CASCADE' })
  profile!: EscortProfile;

  @Index('IDX_escort_prices_serviceLocation')
  @Column({ type: 'enum', enum: ServiceLocation })
  serviceLocation!: ServiceLocation;

  // ფასები (GEL), nullable თუ არ გინდა ყველა ტარიფის სავალდებულო გაკეთება
  @Index('IDX_escort_prices_price30min')
  @Column({ type: 'int', nullable: true })
  price30min?: number | null;

  @Index('IDX_escort_prices_price1hour')
  @Column({ type: 'int', nullable: true })
  price1hour?: number | null;

  @Index('IDX_escort_prices_priceWholeNight')
  @Column({ type: 'int', nullable: true })
  priceWholeNight?: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}