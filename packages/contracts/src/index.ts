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
