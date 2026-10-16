/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep the PostgreSQL driver as a normal Node.js package on the server
  experimental: { serverComponentsExternalPackages: ['pg'] },
};

export default nextConfig;
