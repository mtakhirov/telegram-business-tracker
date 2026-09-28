import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/shared/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DB_PATH ?? "data/messages.db" },
});
