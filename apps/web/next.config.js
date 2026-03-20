/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/types", "@repo/db", "@repo/ai"],
};

export default nextConfig;
