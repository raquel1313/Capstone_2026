import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Carga .env.local y .env (la primera definición de cada variable gana).
dotenv.config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },

  datasource: {
    url: env("DIRECT_URL"),
  },
});
