import helmet from '@fastify/helmet';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { DBExceptionFilter } from './common/exceptions/db-exception.filter';

async function bootstrap() {
  // const app = await NestFactory.create(AppModule)
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  const configService = app.get(ConfigService);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips unrecognized properties
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true }, // auto-transform payloads to DTO instances
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  app.useGlobalFilters(new DBExceptionFilter());
  // Use the namespaced 'app' config to get the port
  const port = configService.get<number>('app.port') ?? 3000;
  const host = configService.get<string>('app.host') ?? 'localhost';
  await app.register(helmet);

  await app.listen(port);
  console.log(`Application is running on: ${host}:${port}`);
}
bootstrap();
