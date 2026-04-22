import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json" with { type: "json" };

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const pagesBasePath = process.env.VITE_BASE_PATH ?? (repositoryName ? `/${repositoryName}/` : "/cymanager/");

export default defineConfig({
  plugins: [react()],
  base: pagesBasePath,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});