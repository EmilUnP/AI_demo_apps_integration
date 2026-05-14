/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  async redirects() {
    return [
      {
        source: '/eduspace-integration',
        destination: '/eduator-integration',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig

