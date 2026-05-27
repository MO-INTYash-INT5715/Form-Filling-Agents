/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist/next',
  basePath: '',
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    return config;
  },
};

module.exports = nextConfig;
