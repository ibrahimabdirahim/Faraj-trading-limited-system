import type { NextConfig } from "next";

// If you open the dev server from another device (e.g. your phone at
// http://192.168.1.42:3000), Next.js blocks its client JavaScript on that
// non-localhost origin and buttons/wizards stop working. List those exact
// origins here — set DEV_ORIGINS in .env, comma-separated, e.g.
//   DEV_ORIGINS=192.168.1.42,my-mac.local
// Opening the app at http://localhost:3000 never needs this.
const devOrigins = (process.env.DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  ...(devOrigins.length ? { allowedDevOrigins: devOrigins } : {}),
};

export default nextConfig;
