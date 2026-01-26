import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

// PWA Configuration (Disabled due to Next.js 16 build error)
// const withSerwist = require("@serwist/next").default({
//   swSrc: "src/app/sw.ts",
//   swDest: "public/sw.js",
//   disable: process.env.NODE_ENV === "development",
// });

// export default withSerwist(nextConfig);
export default nextConfig;
