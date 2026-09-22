import { pgTable, serial, text, integer, date, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { workersTable } from "./workers";
import { regionsTable } from "./regions";
import { weatherTypesTable } from "./weatherTypes";

export const teamDailyRecordsTable = pgTable("team_daily_records", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  workCategory: text("work_category").notNull().default("machine_mowing"),
  regionId: integer("region_id").notNull().references(() => regionsTable.id),
  location: text("location"),
  weatherTypeId: integer("weather_type_id").references(() => weatherTypesTable.id),
  temperature: integer("temperature"),
  status: text("status", { enum: ["draft", "open", "closed"] }).notNull().default("draft"),
  createdByUserId: integer("created_by_user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const teamDailyAssignmentsTable = pgTable("team_daily_assignments", {
  id: serial("id").primaryKey(),
  dailyRecordId: integer("daily_record_id").notNull().references(() => teamDailyRecordsTable.id, { onDelete: "cascade" }),
  workerId: integer("worker_id").notNull().references(() => workersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("team_daily_assignment_record_worker_unique").on(table.dailyRecordId, table.workerId)]);

export const teamDailyEntriesTable = pgTable("team_daily_entries", {
  id: serial("id").primaryKey(),
  dailyRecordId: integer("daily_record_id").notNull().references(() => teamDailyRecordsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  workerId: integer("worker_id").notNull().references(() => workersTable.id),
  machineEntries: jsonb("machine_entries").notNull().default([]),
  vehicleEntries: jsonb("vehicle_entries").notNull().default([]),
  note: text("note"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [unique("team_daily_entry_record_worker_unique").on(table.dailyRecordId, table.workerId)]);

export type TeamDailyRecord = typeof teamDailyRecordsTable.$inferSelect;
export type TeamDailyAssignment = typeof teamDailyAssignmentsTable.$inferSelect;
export type TeamDailyEntry = typeof teamDailyEntriesTable.$inferSelect;
