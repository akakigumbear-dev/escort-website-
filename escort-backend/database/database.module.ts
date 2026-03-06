import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { User } from './entities/user.entity';
import { EscortProfile } from './entities/escort-profile.entity';
import { EscortPrices } from './entities/escort-price.entity';

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
            entities: [User, EscortProfile, EscortPrices],
            synchronize: false,
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