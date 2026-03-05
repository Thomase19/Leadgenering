/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@leadbot/shared"],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
  },
  webpack: (config) => {
    config.resolve.symlinks = true;
    return config;
  },
};

module.exports = nextConfig;
