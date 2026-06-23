import type { NextConfig } from "next";

/**
 * Allow the app to be embedded inside Edge Impulse Studio as an extension
 * iframe. We set a Content-Security-Policy `frame-ancestors` directive (the
 * modern replacement for X-Frame-Options) and intentionally do NOT send
 * X-Frame-Options: DENY, which would block all framing.
 *
 * Scoped to the SPECIFIC Studio origin (plus 'self'). A wildcard across all
 * *.edgeimpulse.com subdomains would let any subdomain — including ones hosting
 * user content or vulnerable to subdomain takeover — frame the app and drive a
 * connect with attacker-chosen params. To embed under another known Studio
 * origin, add it explicitly here.
 *
 * In development we additionally allow localhost origins so the app can be
 * embedded in a local harness during testing. These are NOT added in
 * production, so the deployed policy stays locked to Studio.
 */
const isDev = process.env.NODE_ENV !== "production";

const FRAME_ANCESTORS = [
  "'self'",
  "https://studio.edgeimpulse.com",
  ...(isDev ? ["http://localhost:*", "http://127.0.0.1:*"] : []),
].join(" ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${FRAME_ANCESTORS};`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
