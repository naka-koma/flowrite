import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import tailwindcss from "@tailwindcss/vite";
import { localCsvPlugin } from "./scripts/vite-plugin-local-csv.js";

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), localCsvPlugin()],
  build: {
    outDir: "build",
    emptyOutDir: false,
  },
});
