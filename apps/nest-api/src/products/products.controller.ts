import type { Product, TableResult } from '@lab/core';
import { Controller, Get, Header, Param, Query, Version } from '@nestjs/common';
import { ProductsService } from './products.service';
import { QueryProductsDto } from './query-products.dto';

/**
 * Controllers should be boring: route, delegate, return. No business logic, no
 * database calls. If a controller method is longer than five lines, the logic
 * belongs in a service.
 */
@Controller('products')
export class ProductsController {
  // Constructor injection with a `private readonly` parameter property — the
  // Nest idiom, identical in shape to Angular's. `inject()` exists in Angular
  // now; Nest still prefers the constructor because it needs the emitted
  // design:paramtypes metadata to resolve the token.
  constructor(private readonly products: ProductsService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
  findAll(@Query() query: QueryProductsDto): TableResult<Product> {
    return this.products.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Product {
    return this.products.findOne(id);
  }

  /** Same route, v2 shape. Demonstrates @Version on a single handler. */
  @Version('2')
  @Get()
  findAllV2(@Query() query: QueryProductsDto): { data: TableResult<Product>; version: 2 } {
    return { data: this.products.findAll(query), version: 2 };
  }
}
