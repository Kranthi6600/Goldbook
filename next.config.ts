import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-pdf must run in Node (server action), not be bundled — its dynamic
  // requires break under webpack/Turbopack.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
