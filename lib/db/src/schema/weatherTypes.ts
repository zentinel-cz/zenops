import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const weatherTypesTable = pgTable("weather_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const insertWeatherTypeSchema = createInsertSchema(weatherTypesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type InsertWeatherType = z.infer<typeof insertWeatherTypeSchema>;
export type WeatherType = typeof weatherTypesTable.$inferSelect;
