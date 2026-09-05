import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // The workspace package ships untranspiled-but-modern ESM; letting Next
  // transpile it keeps the monorepo working without a build step in dev.
  transpilePackages: ['@lab/core'],
  experimental: {
    // typedRoutes gives you compile-time checked <Link href>. Cheap win, and a
    // good thing to name-drop when asked how you prevent broken links.
    typedRoutes: true,
  },
};

export default config;
