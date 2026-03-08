import {
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { SubscriptionPost } from './subscription-post.entity';
import { User } from './user.entity';

@Entity('post_upvotes')
@Index('IDX_post_upvotes_post_user', ['postId', 'userId'], { unique: true })
export class PostUpvote {
  @PrimaryColumn('uuid')
  postId!: string;

  @PrimaryColumn('uuid')
  userId!: string;

  @ManyToOne(() => SubscriptionPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post!: SubscriptionPost;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;
}
