import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { User } from './entities/user.entity';
import { EscortProfile } from './entities/escort-profile.entity';
import { EscortPrices } from './entities/escort-price.entity';
import { EscortPicture } from './entities/escort-picture.entity';
import { EscortReview } from './entities/escort-review.entity';
import { Subscription } from './entities/subscription.entity';
import { Message } from './entities/message.entity';
import { EscortSubscriberPhoto } from './entities/escort-subscriber-photo.entity';
import { SubscriptionPost } from './entities/subscription-post.entity';
import { PostUpvote } from './entities/post-upvote.entity';
import { PostComment } from './entities/post-comment.entity';

@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService): TypeOrmModuleOptions => ({
            type: 'postgres',
            host: config.get<string>('DB_HOST', 'localhost'),
            port: config.get<number>('DB_PORT', 5432),
            username: config.get<string>('DB_USER', 'nestuser'),
            password: config.get<string>('DB_PASS', 'nestpass'),
            database: config.get<string>('DB_NAME', 'nestdb'),
            entities: [
              User,
              EscortProfile,
              EscortPrices,
              EscortPicture,
              EscortSubscriberPhoto,
              EscortReview,
              Subscription,
              Message,
              SubscriptionPost,
              PostUpvote,
              PostComment,
            ],
            synchronize: true,
            logging: false,
            retryAttempts: 5,
            retryDelay: 5000,
          }),
        }),
      ],
      exports: [TypeOrmModule],
    };
  }
}
