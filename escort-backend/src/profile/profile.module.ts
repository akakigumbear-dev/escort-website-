import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EscortPrices } from 'database/entities/escort-price.entity';
import { EscortProfile } from 'database/entities/escort-profile.entity';
import { User } from 'database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EscortProfile, EscortPrices, User]),],

  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
