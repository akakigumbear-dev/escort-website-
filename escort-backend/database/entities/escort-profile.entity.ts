import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import {
  EscortService,
  Ethnicity,
  Gender,
  Language,
} from 'database/enums/enums';
import { EscortPrices } from './escort-price.entity';
import { EscortPicture } from './escort-picture.entity';
import { EscortReview } from './escort-review.entity';

@Entity('escort_profiles')
export class EscortProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, (user) => user.escort_profile, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn()
  user?: User | null;

  @OneToMany(() => EscortPrices, (price) => price.profile, { cascade: true })
  prices!: EscortPrices[];

  @OneToMany(() => EscortPicture, (picture) => picture.profile, {
    cascade: true,
  })
  pictures!: EscortPicture[];

  @OneToMany(() => EscortReview, (review) => review.profile)
  reviews!: EscortReview[];

  @Column({ unique: true })
  phoneNumber!: string;

  @Index({ unique: true })
  @Column({ unique: true })
  username!: string;

  @Index()
  @Column()
  city!: string;

  @Column()
  address!: string;

  @Column({
    type: 'enum',
    enum: EscortService,
    array: true,
    default: [],
  })
  services!: EscortService[];

  @Column({ type: 'int', nullable: true })
  height?: number;

  @Column({ type: 'int', nullable: true })
  weight?: number;

  @Column({ type: 'int', nullable: true })
  age?: number;

  @Column({ type: 'enum', enum: Ethnicity, nullable: true })
  ethnicity?: Ethnicity;

  @Column({ type: 'enum', enum: Gender })
  gender!: Gender;

  @Column({
    type: 'enum',
    enum: Language,
    array: true,
    default: [],
  })
  languages!: Language[];

  @Column({ type: 'text', nullable: true })
  bio?: string | null;

  // Raw service names from scraped data (Georgian text)
  @Column({ type: 'text', array: true, default: [] })
  serviceItems!: string[];

  // --- NEW FIELDS ---

  // რამდენი ვიზიტორი/ნახვა ჰქონდა პროფილს (საერთო count)
  @Index()
  @Column({ type: 'int', default: 0 })
  viewCount!: number;

  // ვერიფიცირებულია თუ არა (badge)
  @Index()
  @Column({ type: 'boolean', default: false })
  isVerified!: boolean;

  // VIP შეძენილია თუ არა: vipUntil > now()
  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  vipUntil?: Date | null;

  // (სასურველია) audit timestamps
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
