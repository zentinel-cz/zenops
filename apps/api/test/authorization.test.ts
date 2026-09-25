import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";
import { requireAuthentication, requirePermission } from "../src/authorization.js";

function replyDouble() {
  const send = vi.fn(async () => undefined);
  const reply = { code: vi.fn(() => ({ send })) } as unknown as FastifyReply;
  return { reply, send };
}

describe("authorization guards", () => {
  it("rejects an anonymous request", async () => {
    const { reply, send } = replyDouble();
    await requireAuthentication({ sessionUser: null } as FastifyRequest, reply);
    expect(reply.code).toHaveBeenCalledWith(401);
    expect(send).toHaveBeenCalledWith({ error: "Nepřihlášený uživatel." });
  });

  it("rejects a missing permission", async () => {
    const { reply, send } = replyDouble();
    const request = { sessionUser: { permissions: ["project.read_open"] } } as FastifyRequest;
    await requirePermission("project.create")(request, reply);
    expect(reply.code).toHaveBeenCalledWith(403);
    expect(send).toHaveBeenCalledWith({ error: "K této operaci nemáte oprávnění." });
  });

  it("allows an explicit permission", async () => {
    const { reply, send } = replyDouble();
    const request = { sessionUser: { permissions: ["project.create"] } } as FastifyRequest;
    await requirePermission("project.create")(request, reply);
    expect(reply.code).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
