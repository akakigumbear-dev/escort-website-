import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EscortProfile } from 'database/entities/escort-profile.entity';
import { EscortPrices } from 'database/entities/escort-price.entity';
import { EscortPicture } from 'database/entities/escort-picture.entity';
import { EscortSubscriberPhoto } from 'database/entities/escort-subscriber-photo.entity';
import { EscortController } from './escort.controller';
import { EscortService } from './escort.service';
import { EscortImageService } from './escortImage.service';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EscortProfile,
      EscortPrices,
      EscortPicture,
      EscortSubscriberPhoto,
    ]),
    SubscriptionModule,
  ],
  controllers: [EscortController],
  providers: [EscortService, EscortImageService],
})
export class EscortModule {}
