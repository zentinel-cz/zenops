import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contractorCompaniesTable = pgTable("contractor_companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  companyId: text("company_id"),
  note: text("note"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: serial("deleted_by"),
});

export const insertContractorCompanySchema = createInsertSchema(contractorCompaniesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deletedBy: true,
});

export type InsertContractorCompany = z.infer<typeof insertContractorCompanySchema>;
export type ContractorCompany = typeof contractorCompaniesTable.$inferSelect;
