/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse bundles pdfjs, which breaks under webpack bundling
  // ("Object.defineProperty called on non-object"). Keep it external so it's
  // required natively at runtime in the Node server.
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
  },
};

export default nextConfig;
