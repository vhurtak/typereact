import { productId, type Category, type Product } from './types.js';

const NAMES: Record<Category, readonly string[]> = {
  laptops: ['Aero 14', 'Aero 16 Pro', 'Forge Studio', 'Nimbus Book', 'Vector X1'],
  phones: ['Pixelate 9', 'Nova Mini', 'Nova Ultra', 'Slate 7', 'Halo Fold'],
  audio: ['Echo Buds', 'Studio Cans', 'Reef IEM', 'Loft Speaker', 'Trail Clip'],
  wearables: ['Pulse Band', 'Chrono S', 'Chrono X', 'Sight Frames', 'Ring One'],
};

/** Deterministic pseudo-random so snapshots and demos stay stable. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeProducts(count = 60, seed = 42): Product[] {
  const random = mulberry32(seed);
  const categories = Object.keys(NAMES) as Category[];
  return Array.from({ length: count }, (_, index) => {
    const category = categories[index % categories.length] as Category;
    const pool = NAMES[category];
    const base = pool[index % pool.length] as string;
    return {
      id: productId(`p-${index + 1}`),
      name: `${base} ${String.fromCharCode(65 + (index % 26))}${index}`,
      category,
      priceCents: 9900 + Math.floor(random() * 250_000),
      rating: Math.round(random() * 40 + 10) / 10,
      inStock: random() > 0.25,
    } satisfies Product;
  });
}

export const PRODUCTS: readonly Product[] = makeProducts();
