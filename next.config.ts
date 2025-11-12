import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS === "true";
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  assetPrefix: isGithubActions && repoName ? `/${repoName}/` : undefined,
  basePath: isGithubActions && repoName ? `/${repoName}` : undefined,
};

export default nextConfig;
