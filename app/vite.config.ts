import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { backgroundImages } from "./server/images";

export default defineConfig({ plugins: [react(), backgroundImages()] });
