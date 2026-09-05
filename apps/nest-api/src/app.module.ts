import { Module } from '@nestjs/common';
import { ProductsModule } from './products/products.module';

/**
 * The root module. Nest's DI container is hierarchical and module-scoped:
 * a provider is only injectable where its module is imported or where it is
 * exported. That is the difference from Angular's root-level `providedIn: 'root'`,
 * even though the decorator syntax looks identical.
 */
@Module({ imports: [ProductsModule] })
export class AppModule {}
