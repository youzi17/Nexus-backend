import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, AuthTokens } from './types/auth.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<User> {
    const { username, email, password } = registerDto;

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    this.logger.log(`用户注册: ${email}`);

    return this.usersService.create(username, email, passwordHash);
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ user: Partial<User>; tokens: AuthTokens }> {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.logger.warn(`登录失败: 邮箱不存在 ${email}`);
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`登录失败: 密码错误 ${email}`);
      throw new UnauthorizedException('邮箱或密码错误');
    }

    this.logger.log(`用户登录成功: ${email}`);

    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      this.logger.log(`刷新令牌: ${user.email}`);

      return this.generateTokens(user);
    } catch (error) {
      this.logger.warn(`刷新令牌失败: ${(error as Error).message}`);
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }
  }

  async validateUser(userId: string): Promise<User> {
    return this.usersService.findById(userId);
  }

  /**
   * 为用户生成访问令牌和刷新令牌（公开方法）
   */
  async generateTokensForUser(user: User): Promise<AuthTokens> {
    return this.generateTokens(user);
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessExpiresIn = this.parseExpiresIn(
      process.env.JWT_EXPIRES_IN || '15m',
    );
    const refreshExpiresIn = this.parseExpiresIn(
      process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    );

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'default-secret',
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return {
      access_token,
      refresh_token,
      expires_in: accessExpiresIn,
    };
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 900;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * (multipliers[unit] || 1);
  }

  private sanitizeUser(user: User): Partial<User> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}
