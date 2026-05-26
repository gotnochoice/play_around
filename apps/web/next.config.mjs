/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/sdk', 'pdf-parse', 'xlsx'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdf-parse is imported via a direct file path which bypasses serverComponentsExternalPackages
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
        ({ request }, callback) => {
          if (request === 'pdf-parse/lib/pdf-parse.js' || request === 'pdf-parse' || request === 'xlsx') {
            return callback(null, `commonjs ${request}`)
          }
          callback()
        },
      ]
    }
    return config
  },
}

export default nextConfig
