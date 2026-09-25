import { z } from "zod";

export const roleCodeSchema = z.enum(["ADMIN", "LEADER", "WORKER"]);
export type RoleCode = z.infer<typeof roleCodeSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(200),
});

export const sessionUserSchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1),
  roles: z.array(roleCodeSchema),
  permissions: z.array(z.string()),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const projectStatusSchema = z.enum(["OPEN", "CLOSED"]);

export const createProjectSchema = z.object({
  code: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(160),
  location: z.string().trim().min(2).max(240),
  besip: z.boolean().default(false),
  leaderEmployeeId: z.string().uuid(),
  startDate: z.iso.date(),
  endDate: z.iso.date().nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
}).superRefine((value, context) => {
  if (value.endDate && value.endDate < value.startDate) {
    context.addIssue({ code: "custom", path: ["endDate"], message: "Datum ukončení nesmí předcházet zahájení." });
  }
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const projectSummarySchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  location: z.string(),
  besip: z.boolean(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  status: projectStatusSchema,
  leaderEmployeeId: z.string().uuid(),
  leaderName: z.string(),
});
export type ProjectSummary = z.infer<typeof projectSummarySchema>;

export const createEmployeeUserSchema = z.object({
  employeeNumber: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  displayName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(200),
  roles: z.array(roleCodeSchema).min(1).max(3).transform((roles) => [...new Set(roles)]),
});
export type CreateEmployeeUserInput = z.infer<typeof createEmployeeUserSchema>;

export const employeeStateSchema = z.object({
  active: z.boolean(),
  reason: z.string().trim().min(3).max(500),
});

export const projectStateSchema = z.object({
  status: projectStatusSchema,
  reason: z.string().trim().max(500).nullable().optional(),
});

export const employeeSummarySchema = z.object({
  id: z.string().uuid(),
  employeeNumber: z.string(),
  displayName: z.string(),
  email: z.string().email(),
  isActive: z.boolean(),
  roles: z.array(roleCodeSchema),
});
export type EmployeeSummary = z.infer<typeof employeeSummarySchema>;

export const shiftTypeSchema = z.enum(["MORNING", "NIGHT"]);
export const workStateSchema = z.enum(["DRAFT", "SUBMITTED", "PARTIALLY_APPROVED", "APPROVED", "RETURNED"]);

export const createWorkDaySchema = z.object({
  workDate: z.iso.date(),
  shiftType: shiftTypeSchema,
});

const intervalSchema = z.object({
  startAt: z.iso.datetime({ offset: true }),
  endAt: z.iso.datetime({ offset: true }),
}).refine((value) => new Date(value.endAt) > new Date(value.startAt), {
  message: "Konec intervalu musí následovat po začátku.", path: ["endAt"],
});

export const createWorkEntrySchema = intervalSchema.and(z.object({
  projectId: z.string().uuid(),
  workTypeCode: z.enum(["MACHINE_MOWING", "BRUSHCUTTER", "TREE_CUTTING", "REPROFILING", "OTHER"]),
  workActivityCode: z.string().trim().max(60).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
}));

export const createBreakEntrySchema = intervalSchema;

export const projectDaySchema = z.object({
  weather: z.string().trim().max(120).nullable().optional(),
  temperatureC: z.number().min(-60).max(60).nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
});

export const createMachineSchema = z.object({
  code: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(160),
  typeName: z.string().trim().min(2).max(100),
  tracksMth: z.boolean().default(true),
});

export const machineUsageSchema = z.object({
  machineId: z.string().uuid(),
  startMth: z.number().min(0).max(10000000).nullable().optional(),
  endMth: z.number().min(0).max(10000000).nullable().optional(),
  fuelConsumed: z.number().min(0).max(100000).nullable().optional(),
  fuelRefuelled: z.number().min(0).max(100000).nullable().optional(),
  attachmentIds: z.array(z.string().uuid()).max(20).default([]),
}).superRefine((value, context) => {
  if (value.startMth != null && value.endMth != null && value.endMth < value.startMth) {
    context.addIssue({ code: "custom", path: ["endMth"], message: "Konečný MTH nesmí být nižší než počáteční." });
  }
});

export const createAttachmentSchema = z.object({
  code: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(160),
  typeName: z.string().trim().min(2).max(100),
  uniquelyTracked: z.boolean().default(true),
});

export const createVehicleSchema = z.object({
  code: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(160),
  registrationNumber: z.string().trim().min(2).max(20).transform((value) => value.toUpperCase()),
});

export const createVehicleTripSchema = intervalSchema.and(z.object({
  vehicleId: z.string().uuid(),
  startOdometerKm: z.number().min(0).max(10000000),
  endOdometerKm: z.number().min(0).max(10000000),
  fuelConsumed: z.number().min(0).max(100000).nullable().optional(),
  fuelRefuelled: z.number().min(0).max(100000).nullable().optional(),
  passengerEmployeeIds: z.array(z.string().uuid()).max(20).default([]).transform((ids) => [...new Set(ids)]),
  note: z.string().trim().max(1000).nullable().optional(),
})).superRefine((value, context) => {
  if (value.endOdometerKm < value.startOdometerKm) {
    context.addIssue({ code: "custom", path: ["endOdometerKm"], message: "Konečný stav kilometrů nesmí být nižší než počáteční." });
  }
});

export const approvalDecisionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("APPROVED") }),
  z.object({ action: z.literal("RETURNED"), reason: z.string().trim().min(3).max(1000) }),
]);
