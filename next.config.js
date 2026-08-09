/** @type {import('next').NextConfig} */
const nextConfig = { images: { domains: ['*.supabase.co'] }, experimental: { missingSuspenseWithCSRBailout: false } };
module.exports = nextConfig;
