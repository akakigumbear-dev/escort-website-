import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('messages')
@Index('IDX_messages_sender_receiver_created', ['senderId', 'receiverId', 'createdAt'])
@Index('IDX_messages_receiver_sender_created', ['receiverId', 'senderId', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender!: User;

  @Column('uuid')
  senderId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiverId' })
  receiver!: User;

  @Column('uuid')
  receiverId!: string;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  attachmentPath!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  attachmentOriginalName!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
