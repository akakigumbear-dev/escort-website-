import { Module } from '@nestjs/common';
import { EscortService } from './escort.service';
import { EscortController } from './escort.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EscortPrices } from 'database/entities/escort-price.entity';
import { EscortProfile } from 'database/entities/escort-profile.entity';

@Module({
  imports:[ TypeOrmModule.forFeature([EscortProfile, EscortPrices])],
  controllers: [EscortController],
  providers: [EscortService],
})
export class EscortModule {}
