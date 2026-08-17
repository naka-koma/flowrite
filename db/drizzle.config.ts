import { defineConfig } from "drizzle-kit";

// マイグレーションファイルの生成（drizzle-kit generate）にはDB接続不要。
// 実際にマイグレーションを適用する（drizzle-kit migrate）にはDATABASE_URLが必要になる
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
