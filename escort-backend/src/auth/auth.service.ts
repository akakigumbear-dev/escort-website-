import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { User } from 'database/entities/user.entity';

type RegisterDto = { email: string; phoneNumber: string; password: string };
type LoginDto = { identifier: string; password: string };

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  private signToken(user: Pick<User, 'id' | 'email'>) {
    return this.jwt.signAsync({ sub: user.id, email: user.email });
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const phoneNumber = dto.phoneNumber.trim();

    const exists = await this.usersRepo.findOne({
      where: [{ email }, { phoneNumber }],
      select: { id: true } as any,
    });

    if (exists) throw new BadRequestException('Email or phoneNumber already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const savedUser = await this.usersRepo.save(
      this.usersRepo.create({ email, phoneNumber, password: passwordHash }),
    );

    const accessToken = await this.signToken({ id: savedUser.id, email: savedUser.email });

    return {
      accessToken,
      user: { id: savedUser.id, email: savedUser.email, phoneNumber: savedUser.phoneNumber },
    };
  }

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim();
    const isEmail = identifier.includes('@');

    const user = await this.usersRepo.findOne({
      where: isEmail ? { email: identifier.toLowerCase() } : { phoneNumber: identifier },
      select: { id: true, email: true, phoneNumber: true, password: true } as any,
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const accessToken = await this.signToken({ id: user.id, email: user.email });

    return {
      accessToken,
      user: { id: user.id, email: user.email, phoneNumber: user.phoneNumber },
    };
  }

  async forgetPassword(dto: { identifier: string }) {
    const identifier = dto.identifier.trim();
    const isEmail = identifier.includes('@');

    const user = await this.usersRepo.findOne({
      where: isEmail ? { email: identifier.toLowerCase() } : { phoneNumber: identifier },
      select: { id: true } as any,
    });

    if (!user) return { ok: true };

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.usersRepo.update(user.id, {
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: expiresAt,
    } as any);

    return {
      ok: true,
      // DEV ONLY: PROD-ზე არ დააბრუნო
      resetToken: token,
      expiresAt,
    };
  }
}