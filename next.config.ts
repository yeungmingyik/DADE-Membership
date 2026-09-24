import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const config: NextConfig = {
  output: "standalone",
  outputFileTracingExcludes: {
    "/*": ["./docs/**/*", "./AGENTS.md", "./Agent.md", "./.local/**/*", "./.git/**/*", "./tests/**/*", "./scripts/**/*", "./.env*", "./**/*.sqlite*", "./**/*.db", "./**/*.db-*", "./**/*.db3*"]
  },
  poweredByHeader: false,
  reactStrictMode: true,
  images: { unoptimized: true },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "same-origin" },
        { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" }
      ]
    }, {
      source: "/api/:path*",
      headers: [{ key: "Cache-Control", value: "private, no-store" }]
    }, ...["bronze", "silver", "gold"].map((tier) => ({
      source: `/member-cards/${tier}-collection-v1.webp`,
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
    }))];
  }
};

export default createNextIntlPlugin("./src/i18n/request.ts")(config);
