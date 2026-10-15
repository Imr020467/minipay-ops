/** @type {import('next').NextConfig} */

const nextConfig = {
  allowedDevOrigins: ["10.20.144.242"],

  async rewrites() {
    return {
      fallback: [
        { source: "/api/:path*", destination: "http://localhost:8080/api/:path*" },
        { source: "/backend/:path*", destination: "http://localhost:8080/:path*" },
      ],
    };
  },
};

export default nextConfig;