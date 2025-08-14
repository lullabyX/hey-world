import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@hey-world/ui',
    '@hey-world/components',
    '@hey-world/lib',
  ],
};

export default nextConfig;
