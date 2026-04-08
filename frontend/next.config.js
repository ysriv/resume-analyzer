/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
      {
        source: "/ops/:path*",
        destination: "http://localhost:8000/ops/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
