import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const isDevelopment = process.env.NODE_ENV !== "production";
const contentSecurityPolicyDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
];
if (!isDevelopment) {
  contentSecurityPolicyDirectives.push("upgrade-insecure-requests");
}
const contentSecurityPolicy = contentSecurityPolicyDirectives.join("; ").trim();

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: [
    "workflow",
    "@workflow/core",
    "@workflow/world-vercel",
    "@workflow/world-local",
    "@vercel/queue",
  ],
  async headers() {
    const baseHeaders = [
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];

    if (!isDevelopment) {
      baseHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/:path*",
        headers: baseHeaders,
      },
    ];
  },
};

export default withWorkflow(nextConfig);
