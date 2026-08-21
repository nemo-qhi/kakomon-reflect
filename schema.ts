import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const shareCodes = sqliteTable("share_codes", {
  code: text("code").primaryKey(),
  payload: text("payload").notNull(),
  createdAt: text("created_at").notNull(),
});
