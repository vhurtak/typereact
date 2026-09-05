import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  // Export it and any module that imports ProductsModule can inject the service.
  // Without `exports`, the provider is private to this module — that
  // encapsulation is the point people miss when they compare Nest DI to Angular.
  exports: [ProductsService],
})
export class ProductsModule {}
