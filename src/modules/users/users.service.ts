import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    username: string,
    email: string,
    passwordHash: string,
    role: UserRole = UserRole.USER,
  ): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { username }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('邮箱已被注册');
      }
      if (existingUser.username === username) {
        throw new ConflictException('用户名已被使用');
      }
    }

    const user = this.userRepository.create({
      username,
      email,
      passwordHash,
      role,
      preferences: {},
    });

    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  async updatePreferences(
    userId: string,
    preferences: Record<string, unknown>,
  ): Promise<User> {
    const user = await this.findById(userId);
    user.preferences = { ...user.preferences, ...preferences };
    return this.userRepository.save(user);
  }
}
