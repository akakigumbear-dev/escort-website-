import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPost } from 'database/entities/subscription-post.entity';
import { PostUpvote } from 'database/entities/post-upvote.entity';
import { PostComment } from 'database/entities/post-comment.entity';
import { EscortProfile } from 'database/entities/escort-profile.entity';
import { Subscription } from 'database/entities/subscription.entity';
import { SubscriptionPostsService } from './subscription-posts.service';
import { SubscriptionPostsController } from './subscription-posts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionPost,
      PostUpvote,
      PostComment,
      EscortProfile,
      Subscription,
    ]),
  ],
  controllers: [SubscriptionPostsController],
  providers: [SubscriptionPostsService],
  exports: [SubscriptionPostsService],
})
export class SubscriptionPostsModule {}
