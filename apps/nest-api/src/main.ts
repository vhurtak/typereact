import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { LoggingInterceptor } from './common/logging.interceptor';

/**
 * Bootstrap. Every line here is a common interview question.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // URI versioning: /v1/products. Header and media-type versioning also exist.
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      // whitelist + forbidNonWhitelisted is the pair that actually protects you:
      // unknown properties are stripped, and sending them is a 400 instead of a
      // silent mass-assignment. Ask any backend interviewer about this one.
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true, // turns the plain body into an instance of the DTO class
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableShutdownHooks(); // SIGTERM -> onModuleDestroy: drain before k8s kills you

  const port = Number(process.env['PORT'] ?? 3001);
  await app.listen(port);
  Logger.log(`nest-api listening on http://localhost:${port}/v1/products`, 'Bootstrap');
}

void bootstrap();
