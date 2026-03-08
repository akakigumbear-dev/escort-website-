import { Module } from '@nestjs/common';
import { EscortService } from './escort.service';
import { EscortController } from './escort.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EscortPrices } from 'database/entities/escort-price.entity';
import { EscortProfile } from 'database/entities/escort-profile.entity';
import { EscortImageService } from './escortImage.service';

@Module({
  imports: [TypeOrmModule.forFeature([EscortProfile, EscortPrices])],
  controllers: [EscortController],
  providers: [EscortService, EscortImageService],
})
export class EscortModule {}
