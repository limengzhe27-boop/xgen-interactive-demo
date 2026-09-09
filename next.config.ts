import type { NextConfig } from 'next';

// Isolated local UI checks must not compete with an already running demo server.
const nextConfig: NextConfig = { distDir: process.env.XGEN_UI_TEST === '1' ? '.next-video-test' : '.next' };

export default nextConfig;
