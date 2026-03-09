import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  @ApiResponse({ status: HttpStatus.CREATED, description: '注册成功' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: '用户已存在' })
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(registerDto);
    const tokens = await this.authService.generateTokensForUser(user);

    return ApiResponseDto.success(
      '注册成功',
      {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar_url: user.avatarUrl,
          preferences: user.preferences,
          role: user.role,
          created_at: user.createdAt,
        },
        ...tokens,
      },
      HttpStatus.CREATED,
    );
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({ status: HttpStatus.OK, description: '登录成功' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: '认证失败' })
  async login(@Body() loginDto: LoginDto) {
    const { user, tokens } = await this.authService.login(loginDto);

    return ApiResponseDto.success('登录成功', {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: (user as User).avatarUrl,
        preferences: user.preferences,
      },
      ...tokens,
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新令牌' })
  @ApiResponse({ status: HttpStatus.OK, description: '令牌刷新成功' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: '令牌无效' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const tokens = await this.authService.refreshToken(
      refreshTokenDto.refresh_token,
    );

    return ApiResponseDto.success('Token 刷新成功', tokens);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '用户登出' })
  @ApiResponse({ status: HttpStatus.OK, description: '登出成功' })
  logout() {
    return ApiResponseDto.success('登出成功');
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: HttpStatus.OK, description: '获取成功' })
  getProfile(@CurrentUser() user: User) {
    return ApiResponseDto.success('获取成功', {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar_url: user.avatarUrl,
      preferences: user.preferences,
      role: user.role,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    });
  }
}
