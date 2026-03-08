import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { User } from 'database/entities/user.entity';

type RegisterDto = {
  email: string;
  password: string;
};

type LoginDto = {
  email: string;
  password: string;
};

type ForgetPasswordDto = {
  email: string;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  private signToken(user: Pick<User, 'id' | 'email'>) {
    return this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const exists = await this.usersRepo.findOne({
      where: { email },
      select: { id: true } as any,
    });

    if (exists) {
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const savedUser = await this.usersRepo.save(
      this.usersRepo.create({
        email,
        password: passwordHash,
      }),
    );

    const accessToken = await this.signToken({
      id: savedUser.id,
      email: savedUser.email,
    });

    return {
      accessToken,
      user: {
        id: savedUser.id,
        email: savedUser.email,
      },
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.usersRepo.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
      } as any,
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.signToken({
      id: user.id,
      email: user.email,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async forgetPassword(dto: ForgetPasswordDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.usersRepo.findOne({
      where: { email },
      select: { id: true } as any,
    });

    if (!user) {
      return { ok: true };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.usersRepo.update(user.id, {
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: expiresAt,
    } as any);

    return {
      ok: true,
      resetToken: token,
      expiresAt,
    };
  }
}
