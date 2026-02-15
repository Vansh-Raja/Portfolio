/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'images.placeholders.dev',
      'api.lorem.space',
    ],
  },
  transpilePackages: ['@react-pdf/renderer'],
};

export default nextConfig;
