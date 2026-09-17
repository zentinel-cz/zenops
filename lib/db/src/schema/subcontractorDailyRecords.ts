import { date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { contractorCompaniesTable } from "./contractorCompanies";
import { usersTable } from "./users";

export const subcontractorDailyRecordsTable = pgTable("subcontractor_daily_records", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  contractorCompanyId: integer("contractor_company_id").notNull().references(() => contractorCompaniesTable.id),
  location: text("location").notNull(),
  workerCount: integer("worker_count").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  createdByUserId: integer("created_by_user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type SubcontractorDailyRecord = typeof subcontractorDailyRecordsTable.$inferSelect;
