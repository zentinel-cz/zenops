import { z } from "zod";

export const roleCodeSchema = z.enum(["ADMIN", "LEADER", "WORKER"]);
export type RoleCode = z.infer<typeof roleCodeSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(200),
});

export const sessionUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1),
  roles: z.array(roleCodeSchema),
  permissions: z.array(z.string()),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
