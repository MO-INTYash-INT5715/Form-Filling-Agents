/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Playwright must run server-side; exclude from client bundle (Next.js 14 key)
    serverComponentsExternalPackages: ['playwright', 'playwright-core'],
  },
};

module.exports = nextConfig;
