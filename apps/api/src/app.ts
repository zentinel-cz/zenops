import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { loginSchema, type SessionUser } from "@zenops/contracts";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { authenticate, createSession, getSessionUser, revokeSession } from "./auth.js";
import type { AppConfig } from "./config.js";
import type { Database } from "./db.js";
import { isTrustedOrigin } from "./security.js";

declare module "fastify" {
  interface FastifyRequest {
    sessionUser: SessionUser | null;
  }
}

export function buildApp(config: AppConfig, db: Database): FastifyInstance {
  const app = Fastify({ logger: { level: config.NODE_ENV === "test" ? "silent" : "info" } });

  app.register(cookie);
  app.register(helmet, { contentSecurityPolicy: false });
  app.register(cors, { origin: config.WEB_ORIGIN, credentials: true });
  app.register(rateLimit, { global: false });

  app.decorateRequest("sessionUser", null);
  app.addHook("onRequest", async (request) => {
    const token = request.cookies[config.SESSION_COOKIE_NAME];
    request.sessionUser = token ? await getSessionUser(db, token) : null;
  });

  const requireTrustedOrigin = async (request: FastifyRequest): Promise<void> => {
    if (!isTrustedOrigin(request.headers.origin, config.WEB_ORIGIN)) {
      throw Object.assign(new Error("Nedůvěryhodný původ požadavku."), { statusCode: 403 });
    }
  };

  app.get("/health", async () => ({ status: "ok" }));
  app.get("/ready", async (_request, reply) => {
    try {
      await db`select 1`;
      return { status: "ready" };
    } catch {
      return reply.code(503).send({ status: "not_ready" });
    }
  });

  app.post("/api/auth/login", {
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    preHandler: requireTrustedOrigin,
  }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Neplatné přihlašovací údaje." });
    const user = await authenticate(db, parsed.data.email, parsed.data.password);
    if (!user) return reply.code(401).send({ error: "Nesprávný e-mail nebo heslo." });
    const userAgent = request.headers["user-agent"];
    const session = await createSession(db, user.id, config.SESSION_TTL_HOURS, {
      ipAddress: request.ip,
      ...(userAgent ? { userAgent } : {}),
    });
    reply.setCookie(config.SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: session.expiresAt,
    });
    return reply.code(204).send();
  });

  app.get("/api/auth/me", async (request, reply) => {
    if (!request.sessionUser) return reply.code(401).send({ error: "Nepřihlášený uživatel." });
    return { user: request.sessionUser };
  });

  app.post("/api/auth/logout", { preHandler: requireTrustedOrigin }, async (request, reply) => {
    const token = request.cookies[config.SESSION_COOKIE_NAME];
    if (token) await revokeSession(db, token);
    reply.clearCookie(config.SESSION_COOKIE_NAME, { path: "/" });
    return reply.code(204).send();
  });

  return app;
}
