/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      fallback: [
        { source: "/backend/:path*", destination: "http://localhost:8080/:path*" },
      ],
    };
  },
};

export default nextConfig;