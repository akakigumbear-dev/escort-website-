import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SubscriptionPost } from './subscription-post.entity';
import { User } from './user.entity';

@Entity('post_comments')
export class PostComment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => SubscriptionPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post!: SubscriptionPost;

  @Index('IDX_post_comments_postId')
  @Column('uuid')
  postId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column('uuid')
  userId!: string;

  @Column({ type: 'text' })
  content!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
