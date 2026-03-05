import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/leadbot.ts",
      name: "LeadBot",
      fileName: () => "leadbot.js",
      formats: ["iife"],
    },
    outDir: "dist",
    // Optional: copy to web public for serving. Run from repo root: pnpm build:widget && cp apps/widget/dist/leadbot.js apps/web/public/widget/
    emptyOutDir: true,
    minify: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
