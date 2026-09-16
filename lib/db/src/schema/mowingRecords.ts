import { pgTable, serial, text, integer, numeric, timestamp, date } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { regionsTable } from "./regions";
import { weatherTypesTable } from "./weatherTypes";
import { vehiclesTable } from "./vehicles";
import { contractorCompaniesTable } from "./contractorCompanies";

export const mowingRecordsTable = pgTable("mowing_records", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  regionId: integer("region_id").notNull().references(() => regionsTable.id),
  workType: text("work_type"),
  mowingSection: text("mowing_section"),
  mowingKind: text("mowing_kind"),
  manualMowingKind: text("manual_mowing_kind"),
  contractorCompanyId: integer("contractor_company_id").references(() => contractorCompaniesTable.id),
  location: text("location"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  weatherTypeId: integer("weather_type_id").references(() => weatherTypesTable.id),
  weatherTypeIds: text("weather_type_ids"),
  temperature: integer("temperature"),
  vehicleId: integer("vehicle_id").references(() => vehiclesTable.id),
  mthStart: numeric("mth_start", { precision: 10, scale: 2 }),
  mthEnd: numeric("mth_end", { precision: 10, scale: 2 }),
  mthTotal: numeric("mth_total", { precision: 10, scale: 2 }),
  fuelConsumption: numeric("fuel_consumption", { precision: 10, scale: 2 }),
  refueling: numeric("refueling", { precision: 10, scale: 2 }),
  manualWorkerIds: text("manual_worker_ids"),
  machineWorkerIds: text("machine_worker_ids"),
  workerTimeEntries: text("worker_time_entries"),
  machineMthEntries: text("machine_mth_entries"),
  vehicleEntries: text("vehicle_entries"),
  assignedAverage: text("assigned_average"),
  dayHours: numeric("day_hours", { precision: 10, scale: 2 }),
  nightHours: numeric("night_hours", { precision: 10, scale: 2 }),
  laborHours: numeric("labor_hours", { precision: 10, scale: 2 }),
  vehicleKmStart: numeric("vehicle_km_start", { precision: 10, scale: 2 }),
  vehicleKmEnd: numeric("vehicle_km_end", { precision: 10, scale: 2 }),
  vehicleKmTotal: numeric("vehicle_km_total", { precision: 10, scale: 2 }),
  vehicleRefueling: numeric("vehicle_refueling", { precision: 10, scale: 2 }),
  brushcutterRefueling: numeric("brushcutter_refueling", { precision: 10, scale: 2 }),
  trafficMarking: text("traffic_marking"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: integer("deleted_by"),
});

export const mowingRecordWorkersTable = pgTable("mowing_record_workers", {
  id: serial("id").primaryKey(),
  mowingRecordId: integer("mowing_record_id").notNull().references(() => mowingRecordsTable.id, { onDelete: "cascade" }),
  workerId: integer("worker_id").notNull(),
});

export const mowingRecordMachinesTable = pgTable("mowing_record_machines", {
  id: serial("id").primaryKey(),
  mowingRecordId: integer("mowing_record_id").notNull().references(() => mowingRecordsTable.id, { onDelete: "cascade" }),
  machineId: integer("machine_id").notNull(),
});

export const mowingRecordAccessoriesTable = pgTable("mowing_record_accessories", {
  id: serial("id").primaryKey(),
  mowingRecordId: integer("mowing_record_id").notNull().references(() => mowingRecordsTable.id, { onDelete: "cascade" }),
  accessoryId: integer("accessory_id").notNull(),
});

export type MowingRecord = typeof mowingRecordsTable.$inferSelect;
export type MowingRecordWorker = typeof mowingRecordWorkersTable.$inferSelect;
export type MowingRecordMachine = typeof mowingRecordMachinesTable.$inferSelect;
export type MowingRecordAccessory = typeof mowingRecordAccessoriesTable.$inferSelect;
