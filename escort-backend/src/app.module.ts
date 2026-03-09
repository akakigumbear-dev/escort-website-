import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { DatabaseModule } from 'database/database.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { EscortModule } from './escort/escort.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { MessagesModule } from './messages/messages.module';
import { SubscriptionPostsModule } from './subscription-posts/subscription-posts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '.env'),
        join(process.cwd(), '../.env'),
      ],
    }),
    DatabaseModule.forRoot(),
    AuthModule,
    ProfileModule,
    EscortModule,
    SubscriptionModule,
    MessagesModule,
    SubscriptionPostsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
