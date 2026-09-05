import { LruCache, PRODUCTS, defaultQuery, runQuery, type Product, type TableResult } from '@lab/core';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { QueryProductsDto } from './query-products.dto';

/**
 * Providers are singletons by default (`Scope.DEFAULT`).
 *
 * That matters: this `LruCache` is shared across every request in the process.
 * Request-scoped providers (`@Injectable({ scope: Scope.REQUEST })`) exist, but
 * they force Nest to rebuild the whole injection subtree per request and they
 * disable some optimisations — a real performance answer, not trivia.
 */
@Injectable()
export class ProductsService {
  private readonly cache = new LruCache<string, TableResult<Product>>(50);

  findAll(query: QueryProductsDto): TableResult<Product> {
    const key = JSON.stringify(query);
    const cached = this.cache.get(key);
    if (cached) return cached;

    const result = runQuery(PRODUCTS, {
      ...defaultQuery,
      search: query.q ?? '',
      category: query.category ?? 'all',
      inStockOnly: query.inStockOnly ?? false,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });

    this.cache.set(key, result);
    return result;
  }

  findOne(id: string): Product {
    const product = PRODUCTS.find((candidate) => candidate.id === id);
    // Throwing an HttpException from the service keeps the controller thin.
    // The alternative — returning a Result and mapping in the controller — is a
    // defensible answer too; know the trade-off (framework coupling vs boilerplate).
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }
}
