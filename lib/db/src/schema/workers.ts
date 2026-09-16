import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contractorCompaniesTable } from "./contractorCompanies";

export const workersTable = pgTable("workers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  note: text("note"),
  contractorCompanyId: integer("contractor_company_id").references(() => contractorCompaniesTable.id),
  defaultSubcontractor: boolean("default_subcontractor").notNull().default(false),
  defaultBrushcutter: boolean("default_brushcutter").notNull().default(false),
  defaultSlopeMower: boolean("default_slope_mower").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: serial("deleted_by"),
});

export const insertWorkerSchema = createInsertSchema(workersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deletedBy: true,
});

export type InsertWorker = z.infer<typeof insertWorkerSchema>;
export type Worker = typeof workersTable.$inferSelect;
