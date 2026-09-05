import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ProductsService } from './products.service';

/**
 * Nest's `Test.createTestingModule` builds a real DI container, so you test the
 * wiring as well as the logic. Swap a real provider for a fake with
 * `.overrideProvider(X).useValue(fake)` — that is the answer to "how do you test
 * a service that hits the database?".
 */
describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [ProductsService] }).compile();
    service = moduleRef.get(ProductsService);
  });

  it('paginates with defaults', () => {
    const result = service.findAll({});
    expect(result.page).toBe(1);
    expect(result.rows.length).toBeLessThanOrEqual(20);
  });

  it('serves the second identical query from the cache', () => {
    const first = service.findAll({ q: 'nova' });
    const second = service.findAll({ q: 'nova' });
    expect(second).toBe(first); // same reference => cache hit
  });

  it('throws a 404 for an unknown id', () => {
    expect(() => service.findOne('nope')).toThrow(NotFoundException);
  });
});
