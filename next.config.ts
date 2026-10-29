import type { NextConfig } from "next";

/**
 * Production-grade security headers. Next.js 16 dev mode requires
 * 'unsafe-inline' AND 'unsafe-eval' for scripts (the dev overlay and HMR
 * client use both), so the dev CSP is intentionally more permissive than
 * production. In production, dev-only scripts aren't shipped.
 */
const isDev = process.env.NODE_ENV !== "production";

const cspProduction = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const cspDev = [
  "default-src 'self'",
  // Dev mode needs 'unsafe-eval' for HMR + 'unsafe-inline' for inline scripts/styles
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Dev server may connect to itself and Next.js overlay endpoints
  "connect-src 'self' ws: wss:",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'none'",
  "object-src 'none'",
].join("; ");

const productionHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), payment=(), interest-cohort=()",
  },
  { key: "Content-Security-Policy", value: isDev ? cspDev : cspProduction },
];

const nextConfig: NextConfig = {
  // Development only: allow the sandbox preview host to load dev assets.
  // Has no effect on production builds.
  allowedDevOrigins: [
    "preview-chat-a19176ee-6be0-49ad-af6d-08a36c117cb1.space-z.ai",
    "*.space-z.ai",
  ],
  async redirects() {
    // Legacy/alias paths keep old links working. Real-world apps centralize
    // these in config so marketing emails, bookmarks and old docs never 404.
    // The landing is the only sign-in surface, so the retired /sign-in route
    // and its aliases all collapse onto "/". Next passes query values through,
    // so a stale "/sign-in?error=oauth" still arrives as "/?error=oauth".
    return [
      { source: "/login", destination: "/", permanent: true },
      { source: "/signin", destination: "/", permanent: true },
      // ":path*" also covers the bare "/sign-in", so stale sub-paths collapse
      // onto the landing instead of falling into the private-page gate.
      { source: "/sign-in/:path*", destination: "/", permanent: true },
      { source: "/home", destination: "/dashboard", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: productionHeaders,
      },
    ];
  },
};

export default nextConfig;
