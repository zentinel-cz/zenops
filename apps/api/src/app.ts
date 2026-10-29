import { registerLeaderRecordRoutes } from "./leader-records.js";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { changePasswordSchema, loginSchema, type SessionUser } from "@zenops/contracts";
import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyError } from "fastify";
import { authenticate, changePassword, createSession, getSessionUser, revokeSession } from "./auth.js";
import { requireAuthentication } from "./authorization.js";
import type { AppConfig } from "./config.js";
import type { Database } from "./db.js";
import { isTrustedOrigin } from "./security.js";
import { registerProjectRoutes } from "./projects.js";
import { registerEmployeeRoutes } from "./employees.js";
import { registerWorkDayRoutes } from "./workdays.js";
import { registerProjectDayRoutes } from "./project-days.js";
import { registerAssetRoutes } from "./assets.js";
import { registerApprovalRoutes } from "./approvals.js";
import { registerVehicleRoutes } from "./vehicles.js";
import { registerReportRoutes } from "./reports.js";
import { registerPeriodRoutes } from "./periods.js";
import { registerAdminRecordRoutes } from "./admin-records.js";
import { registerWorkerProfileRoutes } from "./worker-profiles.js";

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

  // Fastify and plugins otherwise return English status/error text to the UI.
  const publicMessages = new Set([
    "Tento stroj již je k pracovnímu úseku připojen.",
    "K uzavřené zakázce nelze měnit denní údaje ani palivo.",
    "Samotnou poznámku k palivu nelze uložit bez spotřeby nebo tankování.",
    "Nedůvěryhodný původ požadavku.", "Stroj vyžaduje počáteční i konečný MTH.",
    "Řidič nemůže být cestující.", "Neplatný cestující.", "Měsíc je uzavřen.", "Vedoucí zakázky musí být aktivní uživatel s rolí Vedoucí.", "Pracovní den nelze upravit v aktuálním stavu.",
  ]);
  const statusMessages: Record<number, string> = {
    400: "Požadavek obsahuje neplatné údaje.",
    401: "Přihlaste se prosím znovu.",
    403: "K této operaci nemáte oprávnění.",
    404: "Požadovaná stránka nebo záznam nebyly nalezeny.",
    409: "Záznam se mezitím změnil. Obnovte stránku a zkuste to znovu.",
    413: "Odeslané údaje jsou příliš velké.",
    415: "Nepodporovaný formát odeslaných údajů.",
    422: "Zkontrolujte vyplněné údaje.",
    429: "Příliš mnoho pokusů. Chvíli počkejte a zkuste to znovu.",
  };
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (error.code === "ZA001") {
      void reply.code(409).send({ error: "Sdílený typ nelze přepsat. Změňte nastavení konkrétní položky techniky." });
      return;
    }
    if (error.code === "ZF001") {
      void reply.code(409).send({ error: "Historie paliva se nemaže. Vymažte hodnoty prostřednictvím auditované opravy." });
      return;
    }
    if (error.code === "ZC001" || error.code === "ZC002") {
      void reply.code(error.code === "ZC002" ? 403 : 409).send({ error: error.code === "ZC002"
        ? "Ke změně stavu tohoto dne nemáte oprávnění nebo chybí důvod."
        : "Zrušit nebo obnovit lze pouze prázdný a dosud neodeslaný pracovní den. Zrušený den nejprve obnovte." });
      return;
    }
    if (error.code === "ZT001" || error.code === "ZT002") {
      void reply.code(422).send({ error: error.code === "ZT001"
        ? "Čas musí patřit k datu pracovního dne nebo následujícímu dni v pásmu Europe/Prague."
        : "Směna musí začínat v datu pracovního dne (Europe/Prague). Zkontrolujte první práci, přestávku nebo jízdu." });
      return;
    }
    if (error.code === "55000") {
      void reply.code(409).send({ error: "Uzavřený měsíc nelze měnit. Nejprve jej znovu otevřete." });
      return;
    }
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode <= 599 ? error.statusCode : 500;
    if (status >= 500) request.log.error({ err: error }, "Request failed");
    const message = status < 500 && publicMessages.has(error.message)
      ? error.message
      : statusMessages[status] ?? "Požadavek se nepodařilo zpracovat. Zkuste to prosím později.";
    void reply.code(status).send({ error: message });
  });
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: statusMessages[404] }));

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

  // Register routes after plugins so rate-limit hooks apply to real endpoints.
  app.after(() => {
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
    const user = await authenticate(db, parsed.data.identifier, parsed.data.password);
    if (!user) return reply.code(401).send({ error: "Nesprávné uživatelské jméno, e-mail nebo heslo." });
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

  app.get("/api/auth/me", { preHandler: requireAuthentication }, async (request) => {
    return { user: request.sessionUser };
  });

  app.post("/api/auth/logout", { preHandler: requireTrustedOrigin }, async (request, reply) => {
    const token = request.cookies[config.SESSION_COOKIE_NAME];
    if (token) await revokeSession(db, token);
    reply.clearCookie(config.SESSION_COOKIE_NAME, { path: "/" });
    return reply.code(204).send();
  });

  app.post("/api/auth/password", {
    config: { rateLimit: { max: 3, timeWindow: "5 minutes" } },
    preHandler: [requireTrustedOrigin, requireAuthentication],
  }, async (request, reply) => {
    const parsed = changePasswordSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Vyplňte současné heslo a odlišné nové heslo, nejvýše 200 znaků." });
    const changed = await changePassword(
      db,
      request.sessionUser!.id,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );
    if (!changed) return reply.code(401).send({ error: "Současné heslo není správné." });
    reply.clearCookie(config.SESSION_COOKIE_NAME, { path: "/" });
    return reply.code(204).send();
  });

  registerProjectRoutes(app, db, requireTrustedOrigin);
  registerEmployeeRoutes(app, db, requireTrustedOrigin);
  registerWorkDayRoutes(app, db, requireTrustedOrigin);
  registerProjectDayRoutes(app, db, requireTrustedOrigin);
  registerAssetRoutes(app, db, requireTrustedOrigin);
  registerApprovalRoutes(app, db, requireTrustedOrigin);
  registerVehicleRoutes(app, db, requireTrustedOrigin);
  registerReportRoutes(app, db);
  registerPeriodRoutes(app, db, requireTrustedOrigin);
  registerLeaderRecordRoutes(app, db, requireTrustedOrigin);
  registerAdminRecordRoutes(app, db, requireTrustedOrigin);
  registerWorkerProfileRoutes(app, db, requireTrustedOrigin);
  });

  return app;
}
