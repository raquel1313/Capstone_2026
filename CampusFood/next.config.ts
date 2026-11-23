import type { NextConfig } from 'next';

function supabaseImagePatterns(): NonNullable<NextConfig['images']>['remotePatterns'] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!raw) {
    return [];
  }

  try {
    const { hostname } = new URL(raw);

    return [
      {
        protocol: 'https',
        hostname,
        pathname: '/storage/v1/object/public/product-images/**',
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(supabaseImagePatterns() ?? []),

      {
        protocol: 'https',
        hostname: 'tofuu.getjusto.com',
        pathname: '/orioneat-local/**',
      },

      {
        protocol: 'https',
        hostname: 'images.lider.cl',
        pathname: '/wmtcl',
      },
    ],

    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;