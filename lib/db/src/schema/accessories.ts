import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accessoriesTable = pgTable("accessories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type"),
  serialNumber: text("serial_number"),
  note: text("note"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: serial("deleted_by"),
});

export const insertAccessorySchema = createInsertSchema(accessoriesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deletedBy: true,
});

export type InsertAccessory = z.infer<typeof insertAccessorySchema>;
export type Accessory = typeof accessoriesTable.$inferSelect;
