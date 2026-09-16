import { pgTable, serial, text, integer, numeric, timestamp, date } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { regionsTable } from "./regions";
import { weatherTypesTable } from "./weatherTypes";

export const fellingRecordsTable = pgTable("felling_records", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  regionId: integer("region_id").notNull().references(() => regionsTable.id),
  workType: text("work_type"),
  location: text("location"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  weatherTypeId: integer("weather_type_id").references(() => weatherTypesTable.id),
  weatherTypeIds: text("weather_type_ids"),
  temperature: integer("temperature"),
  mth: numeric("mth", { precision: 10, scale: 2 }),
  fuelConsumption: numeric("fuel_consumption", { precision: 10, scale: 2 }),
  refueling: numeric("refueling", { precision: 10, scale: 2 }),
  manualWorkerIds: text("manual_worker_ids"),
  machineWorkerIds: text("machine_worker_ids"),
  workerTimeEntries: text("worker_time_entries"),
  machineMthEntries: text("machine_mth_entries"),
  assignedAverage: text("assigned_average"),
  vehicleKmStart: numeric("vehicle_km_start", { precision: 10, scale: 2 }),
  vehicleKmEnd: numeric("vehicle_km_end", { precision: 10, scale: 2 }),
  vehicleKmTotal: numeric("vehicle_km_total", { precision: 10, scale: 2 }),
  vehicleRefueling: numeric("vehicle_refueling", { precision: 10, scale: 2 }),
  trafficMarking: text("traffic_marking"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: integer("deleted_by"),
});

export const fellingRecordWorkersTable = pgTable("felling_record_workers", {
  id: serial("id").primaryKey(),
  fellingRecordId: integer("felling_record_id").notNull().references(() => fellingRecordsTable.id, { onDelete: "cascade" }),
  workerId: integer("worker_id").notNull(),
});

export const fellingRecordVehiclesTable = pgTable("felling_record_vehicles", {
  id: serial("id").primaryKey(),
  fellingRecordId: integer("felling_record_id").notNull().references(() => fellingRecordsTable.id, { onDelete: "cascade" }),
  vehicleId: integer("vehicle_id").notNull(),
});

export const fellingRecordMachinesTable = pgTable("felling_record_machines", {
  id: serial("id").primaryKey(),
  fellingRecordId: integer("felling_record_id").notNull().references(() => fellingRecordsTable.id, { onDelete: "cascade" }),
  machineId: integer("machine_id").notNull(),
});

export const fellingRecordAccessoriesTable = pgTable("felling_record_accessories", {
  id: serial("id").primaryKey(),
  fellingRecordId: integer("felling_record_id").notNull().references(() => fellingRecordsTable.id, { onDelete: "cascade" }),
  accessoryId: integer("accessory_id").notNull(),
});

export type FellingRecord = typeof fellingRecordsTable.$inferSelect;
export type FellingRecordWorker = typeof fellingRecordWorkersTable.$inferSelect;
export type FellingRecordVehicle = typeof fellingRecordVehiclesTable.$inferSelect;
export type FellingRecordMachine = typeof fellingRecordMachinesTable.$inferSelect;
export type FellingRecordAccessory = typeof fellingRecordAccessoriesTable.$inferSelect;
