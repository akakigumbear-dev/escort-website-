import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { CfThrottlerGuard } from './Guards/cf-throttler.guard';
import { join } from 'path';
import { DatabaseModule } from 'database/database.module';
import { User } from 'database/entities/user.entity';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { EscortModule } from './escort/escort.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { MessagesModule } from './messages/messages.module';
import { SubscriptionPostsModule } from './subscription-posts/subscription-posts.module';
import { PaymentModule } from './payment/payment.module';
import { LastSeenInterceptor } from './Guards/last-seen.interceptor';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 60_000, limit: 2000 },
      { name: 'medium', ttl: 300_000, limit: 5000 },
      { name: 'auth', ttl: 60_000, limit: 10 },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '.env'),
        join(process.cwd(), '../.env'),
      ],
    }),
    DatabaseModule.forRoot(),
    TypeOrmModule.forFeature([User]),
    AuthModule,
    ProfileModule,
    EscortModule,
    SubscriptionModule,
    MessagesModule,
    SubscriptionPostsModule,
    PaymentModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LastSeenInterceptor },
    { provide: APP_GUARD, useClass: CfThrottlerGuard },
  ],
})
export class AppModule {}
