import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: '用户名',
    example: 'zhangsan',
  })
  @IsString()
  username: string;

  @ApiProperty({
    description: '用户邮箱',
    example: 'zhangsan@example.com',
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({
    description: '用户密码（至少8位，包含大小写字母、数字和特殊字符）',
    example: 'Password123!',
  })
  @IsString()
  @MinLength(8, { message: '密码至少8位' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: '密码必须包含大小写字母、数字和特殊字符',
  })
  password: string;
}
