import type { FastifyReply, FastifyRequest } from "fastify";

export type AuthorizationHook = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

export async function requireAuthentication(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.sessionUser) {
    await reply.code(401).send({ error: "Nepřihlášený uživatel." });
  }
}

export function requirePermission(permission: string): AuthorizationHook {
  return async (request, reply) => {
    if (!request.sessionUser) {
      await reply.code(401).send({ error: "Nepřihlášený uživatel." });
      return;
    }
    if (!request.sessionUser.permissions.includes(permission)) {
      await reply.code(403).send({ error: "K této operaci nemáte oprávnění." });
    }
  };
}

export const requireWorkerOnly: AuthorizationHook = async (request, reply) => {
  if (!request.sessionUser) {
    await reply.code(401).send({ error: "Nepřihlášený uživatel." });
    return;
  }
  const roles = request.sessionUser.roles;
  if (!roles.includes("WORKER") || roles.includes("LEADER") || roles.includes("ADMIN")) {
    await reply.code(403).send({ error: "Denní záznamy vytváří pouze role Pracovník." });
  }
};
