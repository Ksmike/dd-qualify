import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: [
    "workflow",
    "@workflow/core",
    "@workflow/world-vercel",
    "@workflow/world-local",
    "@vercel/queue",
  ],
};

export default withWorkflow(nextConfig);
