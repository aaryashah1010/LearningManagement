import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only on-screen route indicator — off since it sat in the same
  // bottom-left corner as the sidebar's collapse button during design work.
  devIndicators: false,
};

export default nextConfig;
