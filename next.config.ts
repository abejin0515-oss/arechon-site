import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The /showcase demo serves hand-authored local SVG gradient placeholders
    // through next/image (ParallaxImage). next/image blocks SVG by default; allow
    // it with Next's documented hardening (these are our own static assets).
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
