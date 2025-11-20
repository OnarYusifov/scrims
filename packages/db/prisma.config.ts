import "dotenv/config";
import { defineConfig } from "prisma/config";

const schema = "./prisma/schema.prisma";
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

if (!process.env.DATABASE_URL) {
  console.warn(
    '[prisma.config] DATABASE_URL not set; using placeholder connection string for build-time operations.',
  );
}

export default defineConfig({
  schema,
  datasource: {
    url: databaseUrl,
  },
});

