import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Addresses dev may be reached from besides localhost: lvh.me, which points at
// 127.0.0.1 and lets subdomains work, and this machine on the home network, the
// one a phone uses. Without them Next warns on every /_next request and will
// refuse it in a future major.
const lan = Object.values(networkInterfaces())
  .flat()
  .flatMap((i) => (i && i.family === "IPv4" && !i.internal ? [i.address] : []));

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const config: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["lvh.me", "*.lvh.me", ...lan],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // il microfono serve solo a questa origine
          { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=()" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withNextIntl(config);
