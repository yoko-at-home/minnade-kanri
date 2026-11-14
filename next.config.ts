import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // フェーズ1は localStorage のクライアント状態だけで動かす。
  // 事前描画のキャッシュは、ログイン前にカレンダーを隠す構成と衝突するため外す。
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
