import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 设置全局路由前缀
  app.setGlobalPrefix(process.env.API_PREFIX || 'api');

  // 注册全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());
    // 👇 这是后端 CORS 配置（关键！）
  app.enableCors({
    origin: 'http://localhost:5173', // 允许前端开发服务器访问
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
