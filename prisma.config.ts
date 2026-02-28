import { defineConfig } from "@prisma/config";
import { config } from "dotenv";
import { resolve } from "path";

// Carica le variabili d'ambiente dal file .env
config({ path: resolve(__dirname, ".env") });

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "",
  },
} as const);
