/**
 * Comfort Ledger hosted server (Fastify 4 hijack → handler HTTP único): static parent folder + onboarding/beta access + OpenAI coach + LemonSqueezy billing.
 * Run from repo: cd comfort-ledger/comfort-ledger-beta && npm install && npm start
 *
 * Env (core):
 *   OPENAI_API_KEY, OPENAI_TIMEOUT_MS (optional; default 30000, coach HTTP timeout),
 *   OPENAI_COACH_MAX_TOKENS (optional; default 450, max output tokens por respuesta del coach — auditoría #19),
 *   COMFORT_SESSION_SECRET (optional), COMFORT_SUBSCRIBE_URL,
 *   COMFORT_HEALTH_DEEP (optional: set true so /api/health?deep=1 runs an OpenAI reachability probe in production),
 *   COMFORT_RATE_WAITLIST_MAX — max POST /api/waitlist por IP cada hora (defecto 1; auditing #7 anti-spam),
 *   COMFORT_RATE_AI_COACH_HOURLY_MAX — max consultas /api/ai-coach por usuario autenticado por hora (defecto 5),
 *   COMFORT_ACCESS_MODE (default onboarding; set beta to enforce username/password),
 *   COMFORT_REQUIRE_BETA_LOGIN (solo en access mode beta),
 *   COMFORT_LANDING_DEMO_MINUTES (default 10; visitantes sin sesión beta)
 *
 * Env (LemonSqueezy billing):
 *   LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID,
 *   LEMONSQUEEZY_VARIANT_MONTHLY, LEMONSQUEEZY_VARIANT_ANNUAL,
 *   LEMONSQUEEZY_WEBHOOK_SECRET,
 *   COMFORT_CHECKOUT_REDIRECT_URL (opcional; destino tras pago exitoso),
 *   COMFORT_PUBLIC_PURCHASE (true para mostrar botones de compra en el landing)
 *   COMFORT_PUBLIC_ORIGIN (opcional; p. ej. https://tudominio.com — si falta, se infiere del Host en cada petición)
 *
 * Opcional (#15 disco):
 *   COMFORT_DISABLE_FILE_LOCK — si es true / 1, no se usa proper-lockfile (solo cola en proceso — útil en FS raros; no recomendado con varios procesos Node.)
 */

const Fastify = require("fastify");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const OpenAI = require("openai");
const webpush = require("web-push");
const lemon = require("./lemonsqueezy");
const lockfile = require("proper-lockfile");

const PORT = Number(process.env.PORT || 8787);
/** Canonical site URL in static landing HTML (index.html); replaced per-request via publicOriginFromRequest(). */
const DEFAULT_PUBLIC_SITE_ORIGIN = "https://comfortledger.app";
const __ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.resolve(process.env.COMFORT_DATA_DIR || path.join(__dirname, "data"));
const BUNDLED_DATA_DIR = path.join(__dirname, "data");
const BUNDLED_BETA_USERS_FILE = path.join(BUNDLED_DATA_DIR, "beta-users.json");
const BETA_USERS_FILE = path.join(DATA_DIR, "beta-users.json");
const BETA_SESSIONS_FILE = path.join(DATA_DIR, "beta-sessions.json");
const WAITLIST_FILE = path.join(DATA_DIR, "waitlist.json");
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "subscriptions.json");
const PUSH_SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "push-subscriptions.json");
const IS_PRODUCTION = process.env.NODE_ENV === "production";
if (IS_PRODUCTION && !process.env.COMFORT_SESSION_SECRET) {
  console.error("FATAL: COMFORT_SESSION_SECRET is required when NODE_ENV=production.");
  process.exit(1);
}
if (
  IS_PRODUCTION &&
  String(process.env.LEMONSQUEEZY_API_KEY || "").trim() &&
  !String(process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "").trim()
) {
  console.error(
    "FATAL: LEMONSQUEEZY_WEBHOOK_SECRET is required in production when LEMONSQUEEZY_API_KEY is set."
  );
  process.exit(1);
}
const SESSION_SECRET = String(
  process.env.COMFORT_SESSION_SECRET || crypto.randomBytes(32).toString("hex")
);
const SESSION_COOKIE_NAME = "comfort_beta_session";
const LANDING_LOCALE_COOKIE = "comfort_landing_locale";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const LANDING_DEMO_MS = Math.max(0, Number(process.env.COMFORT_LANDING_DEMO_MINUTES || 10)) * 60 * 1000;
const SUBSCRIBE_URL = String(process.env.COMFORT_SUBSCRIBE_URL || "https://example.com/subscribe").trim();
const LOGIN_WINDOW_MS = 1000 * 60 * 15;
const LOGIN_ATTEMPT_LIMIT = 12;
const AI_HISTORY_LIMIT = 4;
const AI_MONTHLY_LIMIT = 80;
const PUSH_DISPATCH_INTERVAL_MS = 45 * 1000;
const PUSH_SENT_RETENTION_MS = 1000 * 60 * 60 * 24 * 45;
const PUSH_MAX_REMINDERS_PER_DEVICE = 128;
const PUSH_MAX_TITLE_CHARS = 120;
const PUSH_MAX_BODY_CHARS = 220;
function clampPositiveInt(raw, fallback, min, max) {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
/** Sliding window hourly limits (#7 audit): strict defaults, override via env for staging. */
const RATE_WAITLIST_WINDOW_MS = 60 * 60 * 1000;
const RATE_WAITLIST_MAX = clampPositiveInt(process.env.COMFORT_RATE_WAITLIST_MAX, 1, 1, 200);
const RATE_AI_COACH_HOURLY_WINDOW_MS = 60 * 60 * 1000;
const RATE_AI_COACH_HOURLY_MAX = clampPositiveInt(process.env.COMFORT_RATE_AI_COACH_HOURLY_MAX, 5, 1, 500);
/** OpenAI SDK request timeout (streaming + non-streaming). */
const OPENAI_TIMEOUT_MS = clampPositiveInt(process.env.OPENAI_TIMEOUT_MS, 30000, 5000, 120000);
/** Cap on completion tokens for /api/ai-coach (stream + JSON). */
const OPENAI_COACH_MAX_TOKENS = clampPositiveInt(process.env.OPENAI_COACH_MAX_TOKENS, 450, 80, 2000);

const ONBOARDING_CURRENCY_ALLOWED = new Set([
  "USD",
  "EUR",
  "GBP",
  "MXN",
  "ARS",
  "COP",
  "CLP",
  "BRL",
  "CAD",
  "AUD",
  "NZD",
  "CHF",
  "JPY",
  "CNY",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "INR",
  "PEN"
]);

const AI_COACH_SYSTEM_PROMPT = [
  "You are a financial coach for Comfort Ledger users (income, expenses, debt, savings, goals).",
  "Be clear, practical, and responsible. No investment advice as guarantees; encourage professional help for complex situations.",
  "Never ask for or store raw bank account numbers, card numbers, or passwords.",
  "",
  "LANGUAGE: Reply in the same language as the user's latest message in the USER_QUESTION block.",
  "If they write in English, answer in English; Spanish → Spanish; Chinese → Chinese.",
  "Earlier Q&A may be another language; only the latest USER_QUESTION decides your output language.",
  "",
  "Optional: the client sends a uiLanguage hint (es/en/zh); prefer the actual question language when it is clear."
].join("\n");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp"
};

const loginAttempts = new Map();
const waitlistHourly = new Map();
const aiCoachHourly = new Map();
let openaiClient = null;
/** @type {Map<string, Array<{question:string,answer:string}>>} */
const aiHistoryMemory = new Map();
const pushConfig = initPushConfig();
let pushDispatcherTimer = null;

ensureStorage();
startPushDispatcher();

if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: OPENAI_TIMEOUT_MS,
    maxRetries: 0
  });
} else {
  console.warn("OPENAI_API_KEY is not set. Coach API will return errors until configured.");
}

if (!process.env.COMFORT_SESSION_SECRET) {
  console.warn("COMFORT_SESSION_SECRET is not set. Sessions reset on server restart.");
}

async function handleComfortLedgerRequest(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(url.pathname);
  const method = String(req.method || "GET").toUpperCase();

  // Landing locale: ?lang= (explicit), cookie, then Accept-Language.
  // Without this, English browsers hitting "Español" (/ → /?lang=es) would loop back to /en.
  if (
    (pathname === "/" || pathname === "/en" || pathname === "/en/") &&
    (method === "GET" || method === "HEAD")
  ) {
    const langParam = String(url.searchParams.get("lang") || "").toLowerCase();
    const onEn = pathname === "/en" || pathname === "/en/";

    if (onEn && langParam === "es") {
      res.writeHead(
        302,
        createHeaders("text/plain; charset=utf-8", {
          Location: "/",
          "Cache-Control": "no-store",
          Vary: "Accept-Language",
          "Set-Cookie": buildLandingLocaleCookie("es")
        })
      );
      res.end("Redirecting");
      return;
    }
    if (onEn && langParam === "en") {
      res.writeHead(
        302,
        createHeaders("text/plain; charset=utf-8", {
          Location: "/en",
          "Cache-Control": "no-store",
          Vary: "Accept-Language",
          "Set-Cookie": buildLandingLocaleCookie("en")
        })
      );
      res.end("Redirecting");
      return;
    }

    if (pathname === "/" && langParam === "es") {
      res.writeHead(
        302,
        createHeaders("text/plain; charset=utf-8", {
          Location: "/",
          "Cache-Control": "no-store",
          Vary: "Accept-Language",
          "Set-Cookie": buildLandingLocaleCookie("es")
        })
      );
      res.end("Redirecting");
      return;
    }
    if (pathname === "/" && langParam === "en") {
      res.writeHead(
        302,
        createHeaders("text/plain; charset=utf-8", {
          Location: "/en",
          "Cache-Control": "no-store",
          Vary: "Accept-Language",
          "Set-Cookie": buildLandingLocaleCookie("en")
        })
      );
      res.end("Redirecting");
      return;
    }

    if (pathname === "/" && !langParam) {
      const pref = getLandingLocaleCookie(req);
      if (pref === "en") {
        res.writeHead(
          302,
          createHeaders("text/plain; charset=utf-8", {
            Location: "/en",
            "Cache-Control": "no-store",
            Vary: "Accept-Language"
          })
        );
        res.end("Redirecting to /en");
        return;
      }
      if (pref !== "es") {
        const acceptLanguage = String(req.headers["accept-language"] || "");
        const englishPreferred = /\ben(?:-[a-z]{2})?\b/i.test(acceptLanguage);
        if (englishPreferred) {
          res.writeHead(
            302,
            createHeaders("text/plain; charset=utf-8", {
              Location: "/en",
              "Cache-Control": "no-store",
              Vary: "Accept-Language"
            })
          );
          res.end("Redirecting to /en");
          return;
        }
      }
    }
  }

  try {
    if (pathname === "/api/health" && req.method === "GET") {
      const sessionOk = IS_PRODUCTION ? Boolean(process.env.COMFORT_SESSION_SECRET) : true;
      const lemonOk =
        !String(process.env.LEMONSQUEEZY_API_KEY || "").trim() ||
        Boolean(String(process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "").trim());
      let dataDirOk = false;
      let dataDirReadable = false;
      try {
        fs.accessSync(DATA_DIR, fs.constants.W_OK | fs.constants.R_OK);
        dataDirOk = true;
      } catch {
        dataDirOk = false;
      }
      try {
        fs.readdirSync(DATA_DIR);
        dataDirReadable = true;
      } catch {
        dataDirReadable = false;
      }

      const deepRequested = url.searchParams.get("deep") === "1";
      const allowDeep =
        !IS_PRODUCTION ||
        ["1", "true", "yes"].includes(String(process.env.COMFORT_HEALTH_DEEP || "").toLowerCase().trim());

      let openaiProbe = undefined;
      if (deepRequested) {
        if (!allowDeep) {
          openaiProbe = { skipped: true, reason: "set COMFORT_HEALTH_DEEP=true in production" };
        } else if (!openaiClient) {
          openaiProbe = { ok: false, error: "openai_not_configured" };
        } else {
          try {
            await Promise.race([
              openaiClient.models.list(),
              new Promise((_res, rej) => setTimeout(() => rej(Object.assign(new Error("timeout"), { name: "TimeoutError" })), 4000))
            ]);
            openaiProbe = { ok: true };
          } catch (e) {
            const name = e && e.name;
            openaiProbe = {
              ok: false,
              error: name === "TimeoutError" || name === "AbortError" ? "timeout_or_abort" : "request_failed"
            };
          }
        }
      }

      let healthy = sessionOk && lemonOk && dataDirOk && dataDirReadable;
      if (deepRequested && allowDeep && openaiProbe && openaiProbe.ok === false && !openaiProbe.skipped) {
        healthy = false;
      }

      const payload = {
        ok: healthy,
        service: "comfort-ledger-beta",
        betaUsers: readBetaUsers().length,
        openai: Boolean(openaiClient),
        sessionSecretConfigured: Boolean(process.env.COMFORT_SESSION_SECRET),
        lemonsqueezyWebhookConfigured: lemonOk,
        dataDirWritable: dataDirOk,
        dataDirReadable,
        uptimeSec: Math.round(process.uptime()),
        node: process.version,
        timeIso: new Date().toISOString()
      };
      if (openaiProbe !== undefined) {
        payload.openaiProbe = openaiProbe;
      }

      return sendJson(res, healthy ? 200 : 503, payload);
    }

    if (pathname === "/api/public-config" && req.method === "GET") {
      const users = readBetaUsers();
      const betaEnabled = users.length > 0;
      const accessMode = resolveAccessMode(betaEnabled);
      const requireBetaLogin =
        accessMode === "beta" &&
        String(process.env.COMFORT_REQUIRE_BETA_LOGIN || (betaEnabled ? "true" : "false"))
          .toLowerCase()
          .trim() !== "false";
      const landingDemoMs = accessMode === "beta" && !requireBetaLogin ? LANDING_DEMO_MS : 0;
      const lemonCfg = lemon.getConfig();
      return sendJson(res, 200, {
        ok: true,
        comfortHosted: true,
        accessMode,
        onboardingEnabled: accessMode === "onboarding",
        betaEnabled,
        requireBetaLogin: betaEnabled ? requireBetaLogin : false,
        subscribeUrl: SUBSCRIBE_URL,
        landingDemoMinutes: Math.round(landingDemoMs / 60000),
        landingDemoMs,
        aiCoachConfigured: Boolean(openaiClient),
        coachMaxTokens: OPENAI_COACH_MAX_TOKENS,
        publicPurchaseEnabled: lemonCfg.publicPurchaseEnabled && lemon.isConfigured(),
        pushConfigured: Boolean(pushConfig.configured),
        pushVapidPublicKey: pushConfig.configured ? pushConfig.publicKey : ""
      });
    }

    if (pathname === "/api/beta/session" && req.method === "GET") {
      const auth = await authenticateBetaRequestAsync(req);
      if (!auth) {
        return sendJson(res, 200, {
          ok: true,
          authenticated: false,
          betaEnabled: readBetaUsers().length > 0
        });
      }
      return sendJson(res, 200, {
        ok: true,
        authenticated: true,
        betaEnabled: true,
        user: publicBetaUser(auth.user)
      });
    }

    if (pathname === "/api/beta/login" && req.method === "POST") {
      const rateLimit = evaluateLoginRateLimit(req);
      if (!rateLimit.allowed) {
        return sendJson(
          res,
          429,
          { ok: false, error: "Demasiados intentos. Espera unos minutos." },
          { "Retry-After": String(rateLimit.retryAfterSeconds) }
        );
      }

      const users = readBetaUsers();
      if (!users.length) {
        return sendJson(res, 503, { ok: false, error: "Beta no configurada (sin usuarios)." });
      }

      const body = await readJsonBody(req);
      const username = normalizeUsername(body?.username);
      const password = String(body?.password || "");
      const user = users.find((entry) => normalizeUsername(entry.username) === username);

      if (!username || !password || !user || !verifyPassword(password, user)) {
        registerFailedLogin(req);
        return sendJson(res, 401, { ok: false, error: "Usuario o contraseña incorrectos." });
      }

      clearFailedLogins(req);
      const session = await createBetaSessionAsync(user.id);
      return sendJson(
        res,
        200,
        {
          ok: true,
          user: publicBetaUser(user)
        },
        { "Set-Cookie": createSessionCookie(session.token) }
      );
    }

    if (pathname === "/api/beta/logout" && req.method === "POST") {
      const cookies = parseCookies(req.headers.cookie || "");
      await destroyBetaSessionAsync(cookies[SESSION_COOKIE_NAME]);
      await readJsonBody(req).catch(() => ({}));
      return sendJson(res, 200, { ok: true }, { "Set-Cookie": clearSessionCookie() });
    }

    if (pathname === "/api/onboarding/session" && req.method === "GET") {
      const auth = await authenticateOnboardingRequestAsync(req);
      if (!auth) {
        return sendJson(res, 200, {
          ok: true,
          authenticated: false,
          profile: null
        });
      }
      return sendJson(res, 200, {
        ok: true,
        authenticated: true,
        profile: publicOnboardingProfile(auth.profile)
      });
    }

    if (pathname === "/api/onboarding/start" && req.method === "POST") {
      const body = await readJsonBody(req);
      const profile = normalizeOnboardingProfile(body?.profile || body);
      const validationError = validateOnboardingProfile(profile);
      if (validationError) {
        return sendJson(res, 400, { ok: false, error: validationError });
      }
      const session = await createOnboardingSessionAsync(profile);
      return sendJson(
        res,
        200,
        {
          ok: true,
          profile: publicOnboardingProfile(session.profile)
        },
        { "Set-Cookie": createSessionCookie(session.token) }
      );
    }

    if (pathname === "/api/onboarding/logout" && req.method === "POST") {
      const cookies = parseCookies(req.headers.cookie || "");
      await destroyBetaSessionAsync(cookies[SESSION_COOKIE_NAME]);
      await readJsonBody(req).catch(() => ({}));
      return sendJson(res, 200, { ok: true }, { "Set-Cookie": clearSessionCookie() });
    }

    if (pathname === "/api/ai-coach" && req.method === "POST") {
      const body = await readJsonBody(req);
      const accessMode = resolveAccessMode(readBetaUsers().length > 0);
      const auth =
        accessMode === "beta" ? await authenticateBetaRequestAsync(req) : await authenticateOnboardingRequestAsync(req);
      if (!auth) {
        return sendJson(
          res,
          401,
          {
            ok: false,
            error:
              accessMode === "beta"
                ? "Inicia sesión para usar el coach."
                : "Completa tu onboarding para usar el coach."
          }
        );
      }
      if (!openaiClient) {
        return sendJson(res, 503, { ok: false, error: "Coach no configurado (falta OPENAI_API_KEY en el servidor)." });
      }

      const question = sanitizeSensitiveText(String(body?.question || "").trim());
      if (!question) {
        return sendJson(res, 400, { ok: false, error: "Escribe una pregunta." });
      }

      const userId = accessMode === "beta" ? auth.user.id : auth.profile.id;
      const monthKey = currentMonthKey();
      const queriesThisMonth = countMonthlyQueries(userId, monthKey);
      if (queriesThisMonth >= AI_MONTHLY_LIMIT) {
        return sendJson(res, 429, {
          ok: false,
          error: "Límite mensual de consultas alcanzado.",
          remainingQueries: 0
        });
      }

      const hourlyKey = String(userId);
      const coachRetry = rateLimitConsume(
        aiCoachHourly,
        hourlyKey,
        RATE_AI_COACH_HOURLY_MAX,
        RATE_AI_COACH_HOURLY_WINDOW_MS
      );
      if (coachRetry !== null) {
        return sendJson(
          res,
          429,
          {
            ok: false,
            error: "Demasiadas consultas al coach en la última hora. Prueba más tarde.",
            retryAfterSec: coachRetry
          },
          { "Retry-After": String(coachRetry) }
        );
      }

      const history = getRecentAiHistory(userId, AI_HISTORY_LIMIT);
      const prompt = buildComfortCoachPrompt(body, history, question);
      const wantStream = body && body.stream === true;

      if (wantStream) {
        const sseHeaders = createHeaders("text/event-stream; charset=utf-8", {
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no"
        });
        res.writeHead(200, sseHeaders);
        if (typeof res.flushHeaders === "function") res.flushHeaders();
        try {
          await streamComfortCoachSse(req, res, prompt, body, {
            userId,
            monthKey,
            question,
            queriesThisMonth
          });
        } catch (err) {
          if (!res.writableEnded) {
            try {
              writeCoachSseEvent(res, {
                error: true,
                message:
                  err && typeof err.message === "string"
                    ? err.message
                    : "Coach error."
              });
              res.end();
            } catch {
              /* ignore */
            }
          }
        }
        return;
      }

      let answer;
      try {
        answer = await generateComfortCoachAnswer(prompt, body);
      } catch (err) {
        const msg = err && typeof err.message === "string" ? err.message : "Coach error";
        return sendJson(res, 502, { ok: false, error: msg });
      }
      const sanitizedAnswer = sanitizeSensitiveText(answer);
      saveAiInteraction(userId, monthKey, question, sanitizedAnswer);

      return sendJson(res, 200, {
        ok: true,
        answer: sanitizedAnswer,
        remainingQueries: Math.max(0, AI_MONTHLY_LIMIT - (queriesThisMonth + 1))
      });
    }

    if (pathname === "/api/waitlist" && req.method === "POST") {
      const wlRetry = rateLimitConsume(
        waitlistHourly,
        clientIp(req),
        RATE_WAITLIST_MAX,
        RATE_WAITLIST_WINDOW_MS
      );
      if (wlRetry !== null) {
        return sendJson(
          res,
          429,
          {
            ok: false,
            error: "Solo una inscripción por hora desde esta red. Vuelve a intentar más tarde.",
            retryAfterSec: wlRetry
          },
          { "Retry-After": String(wlRetry) }
        );
      }
      const body = await readJsonBody(req);
      const email = normalizeEmail(body?.email);
      if (!email) {
        return sendJson(res, 400, { ok: false, error: "Correo inválido." });
      }
      await addToWaitlist(email, body?.source || "landing");
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === "/api/checkout" && (req.method === "POST" || req.method === "GET")) {
      const body = req.method === "POST" ? await readJsonBody(req).catch(() => ({})) : {};
      const plan =
        body?.plan === "annual" || url.searchParams.get("plan") === "annual"
          ? lemon.PLAN_ANNUAL
          : lemon.PLAN_MONTHLY;
      const email = normalizeEmail(body?.email || url.searchParams.get("email") || "");
      const discount = String(body?.discount || url.searchParams.get("discount") || "").trim() || undefined;

      if (!lemon.isConfigured()) {
        return sendJson(res, 503, {
          ok: false,
          error: "Compra no disponible todavía. Déjanos tu email para avisarte al abrir."
        });
      }

      const result = await lemon.createCheckoutUrl({ plan, email, discountCode: discount });
      if (result.error) {
        console.error("Checkout error:", result.error);
        return sendJson(res, 502, { ok: false, error: "No pudimos iniciar el checkout. Intenta de nuevo." });
      }

      if (req.method === "GET") {
        res.writeHead(302, { Location: result.url });
        return res.end();
      }
      return sendJson(res, 200, { ok: true, url: result.url });
    }

    if (pathname === "/api/webhooks/lemonsqueezy" && req.method === "POST") {
      const raw = await readRawBody(req);
      const signature = req.headers["x-signature"] || req.headers["X-Signature"];
      if (!lemon.verifyWebhookSignature(raw, signature)) {
        return sendJson(res, 401, { ok: false, error: "Firma inválida." });
      }
      let payload;
      try {
        payload = JSON.parse(raw.toString("utf8"));
      } catch {
        return sendJson(res, 400, { ok: false, error: "JSON inválido." });
      }
      const event = lemon.parseWebhookEvent(payload);
      if (!event) {
        return sendJson(res, 202, { ok: true, ignored: true });
      }
      await applySubscriptionEvent(event);
      return sendJson(res, 200, { ok: true, event: event.eventName });
    }

    if (pathname === "/api/subscription/status" && req.method === "GET") {
      const email = normalizeEmail(url.searchParams.get("email") || "");
      if (!email) {
        return sendJson(res, 400, { ok: false, error: "Falta email." });
      }
      const record = findSubscription(email);
      return sendJson(res, 200, {
        ok: true,
        active: record ? lemon.isActiveStatus(record.status) : false,
        status: record ? record.status : "none",
        plan: record ? record.plan : null,
        renewsAt: record ? record.renewsAt : null
      });
    }

    if (pathname === "/api/customer-portal" && req.method === "GET") {
      const email = normalizeEmail(url.searchParams.get("email") || "");
      if (!email) {
        return sendJson(res, 400, { ok: false, error: "Falta email." });
      }
      const record = findSubscription(email);
      if (!record || !record.subscriptionId) {
        return sendJson(res, 404, { ok: false, error: "No encontramos una suscripción para este email." });
      }
      const result = await lemon.getCustomerPortalUrl(record.subscriptionId);
      if (result.error) {
        return sendJson(res, 502, { ok: false, error: "No pudimos abrir el portal. Intenta luego." });
      }
      res.writeHead(302, { Location: result.url });
      return res.end();
    }

    if (pathname === "/api/push/register" && req.method === "POST") {
      if (!pushConfig.configured) {
        return sendJson(res, 503, { ok: false, error: "Push no configurado en servidor." });
      }
      const owner = await resolvePushOwnerContextAsync(req);
      if (!owner) {
        return sendJson(res, 401, { ok: false, error: "Sesión requerida." });
      }
      const body = await readJsonBody(req);
      const subscription = normalizePushSubscription(body?.subscription);
      if (!subscription) {
        return sendJson(res, 400, { ok: false, error: "Suscripción inválida." });
      }
      const reminders = normalizePushReminders(body?.reminders);
      const userAgent = String(req.headers["user-agent"] || "").slice(0, 300);
      await upsertPushRegistration(owner, subscription, reminders, userAgent);
      return sendJson(res, 200, { ok: true, scheduled: reminders.length });
    }

    if (pathname === "/api/push/unregister" && req.method === "POST") {
      const owner = await resolvePushOwnerContextAsync(req);
      if (!owner) {
        return sendJson(res, 401, { ok: false, error: "Sesión requerida." });
      }
      const body = await readJsonBody(req).catch(() => ({}));
      const endpoint = String(body?.endpoint || "").trim();
      const removed = await removePushRegistration(owner.ownerKey, endpoint);
      return sendJson(res, 200, { ok: true, removed });
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return sendJson(res, 405, { ok: false, error: "Method not allowed" });
    }

    serveComfortStatic(pathname, res, req.method === "HEAD", req);
  } catch (error) {
    console.error(error);
    const message = error && typeof error.message === "string" ? error.message : "Server error";
    sendJson(res, 500, { ok: false, error: message });
  }
}

/** Fastify (auditoría #28): infra moderna manteniendo el handler HTTP único hasta migración granular. */
const fastify = Fastify({
  logger: false,
  requestTimeout: 0,
  disableRequestLogging: true
});

fastify.removeAllContentTypeParsers();

fastify.all("/*", async (request, reply) => {
  reply.hijack();
  try {
    await handleComfortLedgerRequest(request.raw, reply.raw);
  } catch (error) {
    console.error(error);
    const res = reply.raw;
    if (!res.writableEnded && !res.headersSent) {
      const message = error && typeof error.message === "string" ? error.message : "Server error";
      sendJson(res, 500, { ok: false, error: message });
    }
  }
});

fastify.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  const betaEnabled = readBetaUsers().length > 0;
  const lemonReady = lemon.isConfigured();
  const publicPurchase = lemon.getConfig().publicPurchaseEnabled;
  console.log(`Comfort Ledger hosted → ${address}`);
  console.log(
    `Access mode: ${resolveAccessMode(betaEnabled)} · Landing demo: ${LANDING_DEMO_MS / 60000} min · Subscribe: ${SUBSCRIBE_URL}`
  );
  console.log(
    `LemonSqueezy: ${lemonReady ? "configured" : "NOT configured"} · Public purchase: ${publicPurchase && lemonReady ? "ON" : "off"}`
  );
});

function ensureStorage() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BETA_SESSIONS_FILE)) {
    fs.writeFileSync(BETA_SESSIONS_FILE, "[]\n", "utf8");
  }
  if (!fs.existsSync(WAITLIST_FILE)) {
    fs.writeFileSync(WAITLIST_FILE, "[]\n", "utf8");
  }
  if (!fs.existsSync(SUBSCRIPTIONS_FILE)) {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, "[]\n", "utf8");
  }
  if (!fs.existsSync(PUSH_SUBSCRIPTIONS_FILE)) {
    fs.writeFileSync(PUSH_SUBSCRIPTIONS_FILE, "[]\n", "utf8");
  }
  if (BETA_USERS_FILE !== BUNDLED_BETA_USERS_FILE && fs.existsSync(BUNDLED_BETA_USERS_FILE)) {
    const bundledUsers = readJsonFile(BUNDLED_BETA_USERS_FILE, null);
    const storedUsers = readJsonFile(BETA_USERS_FILE, null);
    if (Array.isArray(bundledUsers) && JSON.stringify(bundledUsers) !== JSON.stringify(storedUsers)) {
      writeJsonFile(BETA_USERS_FILE, bundledUsers);
      writeJsonFile(BETA_SESSIONS_FILE, []);
      console.log("Synced versioned beta-users.json to data dir and cleared beta sessions.");
      return;
    }
  }
  if (!fs.existsSync(BETA_USERS_FILE)) {
    fs.writeFileSync(BETA_USERS_FILE, "[]\n", "utf8");
  }
}

function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, payload) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
  const tempFilePath = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tempFilePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.renameSync(tempFilePath, filePath);
}

/** Serialize read-modify-write per JSON store + lock en disco (#15 intra-proceso y multi-proceso). */
const __fileWriteChains = new Map();

function fileDiskLockDisabled() {
  const v = String(process.env.COMFORT_DISABLE_FILE_LOCK || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

const FILE_LOCK_OPTIONS = Object.freeze({
  stale: 30000,
  retries: Object.freeze({ retries: 40, minTimeout: 15, maxTimeout: 900 }),
  realpath: false
});

function runExclusiveFileTask(filePath, task) {
  const resolved = path.resolve(filePath);
  const prev = __fileWriteChains.get(resolved) || Promise.resolve();
  const run = prev.then(async () => {
    if (fileDiskLockDisabled()) {
      return task();
    }
    const release = await lockfile.lock(resolved, FILE_LOCK_OPTIONS);
    try {
      return await task();
    } finally {
      try {
        await release();
      } catch (releaseErr) {
        console.warn(
          `[Comfort] file lock release failed (${resolved}):`,
          releaseErr && releaseErr.message ? releaseErr.message : releaseErr
        );
      }
    }
  });
  __fileWriteChains.set(resolved, run.catch(() => {}));
  return run;
}

function readBetaUsers() {
  const parsed = readJsonFile(BETA_USERS_FILE, []);
  return Array.isArray(parsed)
    ? parsed.filter((user) => user && typeof user === "object" && user.active !== false && user.username)
    : [];
}

/** Read-modify-write beta-sessions.json under a single-file queue (#15). */
async function withBetaSessions(mutator) {
  return runExclusiveFileTask(BETA_SESSIONS_FILE, async () => {
    const parsed = readJsonFile(BETA_SESSIONS_FILE, []);
    const sessions = Array.isArray(parsed)
      ? parsed.filter((session) => session && typeof session === "object")
      : [];
    const now = Date.now();
    const active = sessions.filter((session) => {
      const expiresAt = new Date(session.expiresAt || 0).getTime();
      return Number.isFinite(expiresAt) && expiresAt > now;
    });
    sessions.length = 0;
    sessions.push(...active);
    const result = await mutator(sessions);
    writeJsonFile(BETA_SESSIONS_FILE, sessions);
    return result;
  });
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function verifyPassword(pin, user) {
  if (!user || !user.pinSalt || !user.pinHash) {
    return false;
  }
  const incoming = crypto.scryptSync(String(pin), String(user.pinSalt), 64).toString("hex");
  const expected = Buffer.from(String(user.pinHash), "hex");
  const provided = Buffer.from(incoming, "hex");
  if (expected.length !== provided.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, provided);
}

function resolveAccessMode(betaEnabled = readBetaUsers().length > 0) {
  const raw = String(process.env.COMFORT_ACCESS_MODE || (betaEnabled ? "beta" : "onboarding"))
    .trim()
    .toLowerCase();
  if (raw === "beta" && betaEnabled) {
    return "beta";
  }
  return "onboarding";
}

async function createHostedSessionAsync(payload = {}) {
  const kind = payload.kind === "beta" ? "beta" : "onboarding";
  const now = new Date();
  const token = crypto.randomBytes(32).toString("hex");
  return withBetaSessions((sessions) => {
    const session = {
      id: `session-${crypto.randomUUID()}`,
      kind,
      tokenHash: hashSessionToken(token),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString()
    };
    if (kind === "beta") {
      session.userId = String(payload.userId || "");
    } else {
      session.profile = normalizeOnboardingProfile(payload.profile);
    }
    sessions.unshift(session);
    return { ...session, token };
  });
}

function createBetaSessionAsync(userId) {
  return createHostedSessionAsync({ kind: "beta", userId });
}

function createOnboardingSessionAsync(profile) {
  return createHostedSessionAsync({ kind: "onboarding", profile });
}

async function destroyBetaSessionAsync(token) {
  if (!token) {
    return;
  }
  await withBetaSessions((sessions) => {
    const tokenHash = hashSessionToken(token);
    const filtered = sessions.filter((session) => !sessionMatchesToken(session, token, tokenHash));
    sessions.splice(0, sessions.length, ...filtered);
  });
}

async function readSessionFromRequestAsync(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) {
    return null;
  }
  return withBetaSessions((sessions) => {
    const tokenHash = hashSessionToken(token);
    const sessionIndex = sessions.findIndex((session) => sessionMatchesToken(session, token, tokenHash));
    if (sessionIndex < 0) {
      return null;
    }
    sessions[sessionIndex] = {
      ...sessions[sessionIndex],
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString()
    };
    return { token, session: sessions[sessionIndex] };
  });
}

async function authenticateBetaRequestAsync(req) {
  const users = readBetaUsers();
  if (!users.length) {
    return null;
  }
  const activeSession = await readSessionFromRequestAsync(req);
  if (!activeSession || activeSession.session.kind !== "beta") {
    return null;
  }
  const user = users.find((entry) => entry.id === activeSession.session.userId);
  if (!user) {
    await destroyBetaSessionAsync(activeSession.token);
    return null;
  }
  return { session: activeSession.session, user };
}

async function authenticateOnboardingRequestAsync(req) {
  const activeSession = await readSessionFromRequestAsync(req);
  if (!activeSession || activeSession.session.kind !== "onboarding") {
    return null;
  }
  const profile = normalizeOnboardingProfile(activeSession.session.profile);
  if (!profile) {
    await destroyBetaSessionAsync(activeSession.token);
    return null;
  }
  return { session: activeSession.session, profile };
}

function publicBetaUser(user) {
  return {
    id: user.id,
    displayName: user.displayName || "Beta",
    slot: user.slot || null,
    username: normalizeUsername(user.username)
  };
}

function normalizeOnboardingProfile(input) {
  if (!input || typeof input !== "object") {
    return null;
  }
  const displayName = String(input.displayName || input.name || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 60);
  if (!displayName) {
    return null;
  }
  const rawId = String(input.id || "").trim();
  const rawEmail = String(input.email || "").trim().toLowerCase();
  const focus = String(input.focus || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 180);
  const lifestyleRaw = String(input.lifestyle || "").trim().toLowerCase();
  const lifestyle = ["payroll", "freelance", "family", "student", "simple"].includes(lifestyleRaw)
    ? lifestyleRaw
    : "simple";
  const createdAt = String(input.createdAt || new Date().toISOString());
  const curRaw = String(input.currency || "")
    .trim()
    .toUpperCase();
  const currency =
    /^[A-Z]{3}$/.test(curRaw) && ONBOARDING_CURRENCY_ALLOWED.has(curRaw) ? curRaw : "";

  const base = {
    id: rawId || `visitor-${crypto.randomUUID()}`,
    displayName,
    email: rawEmail.slice(0, 120),
    focus,
    lifestyle,
    createdAt
  };
  if (currency) base.currency = currency;
  return base;
}

function validateOnboardingProfile(profile) {
  if (!profile || !profile.displayName) {
    return "Escribe tu nombre para continuar.";
  }
  if (profile.displayName.length < 2) {
    return "Tu nombre debe tener al menos 2 caracteres.";
  }
  if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
    return "Revisa el correo antes de continuar.";
  }
  return "";
}

function publicOnboardingProfile(profile) {
  const normalized = normalizeOnboardingProfile(profile);
  if (!normalized) {
    return null;
  }
  const out = {
    id: normalized.id,
    displayName: normalized.displayName,
    email: normalized.email,
    focus: normalized.focus,
    lifestyle: normalized.lifestyle,
    createdAt: normalized.createdAt
  };
  if (normalized.currency) out.currency = normalized.currency;
  return out;
}

function getLandingLocaleCookie(req) {
  const raw = String(req.headers.cookie || "");
  const match = raw.match(new RegExp(`(?:^|;\\s*)${LANDING_LOCALE_COOKIE}=(es|en)(?:;|$)`));
  return match ? match[1] : null;
}

function buildLandingLocaleCookie(locale) {
  const value = locale === "en" ? "en" : "es";
  const parts = [`${LANDING_LOCALE_COOKIE}=${value}`, "Path=/", "Max-Age=31536000", "SameSite=Lax"];
  if (IS_PRODUCTION) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function publicOriginFromRequest(req) {
  const explicit = String(process.env.COMFORT_PUBLIC_ORIGIN || "")
    .trim()
    .replace(/\/$/, "");
  if (explicit) {
    return explicit;
  }
  const forwardedHost = String(req.headers["x-forwarded-host"] || "")
    .split(",")[0]
    .trim();
  const host = forwardedHost || String(req.headers.host || "").split(",")[0].trim();
  if (!host) {
    return "";
  }
  let proto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (!proto) {
    proto = IS_PRODUCTION ? "https" : "http";
  }
  return `${proto}://${host}`;
}

function rewriteLandingHtmlAbsoluteUrls(buf, filePath, req) {
  const base = path.basename(filePath);
  if (base !== "index.html" && base !== "index-en.html") {
    return buf;
  }
  const origin = publicOriginFromRequest(req);
  if (!origin) {
    return buf;
  }
  let html = buf.toString("utf8");
  html = html.split(DEFAULT_PUBLIC_SITE_ORIGIN).join(origin);
  return Buffer.from(html, "utf8");
}

function createSessionCookie(token) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
  ];
  if (IS_PRODUCTION) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function clearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${IS_PRODUCTION ? "; Secure" : ""}`;
}

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(`${SESSION_SECRET}:${String(token || "")}`).digest("hex");
}

function sessionMatchesToken(session, token, tokenHash) {
  if (!session || typeof session !== "object") {
    return false;
  }
  if (typeof session.tokenHash === "string") {
    return timingSafeEqualHex(session.tokenHash, tokenHash);
  }
  if (typeof session.token === "string") {
    return timingSafeEqualText(session.token, token);
  }
  return false;
}

function timingSafeEqualHex(left, right) {
  if (typeof left !== "string" || typeof right !== "string") {
    return false;
  }
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length || !leftBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function timingSafeEqualText(left, right) {
  if (typeof left !== "string" || typeof right !== "string") {
    return false;
  }
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  if (leftBuffer.length !== rightBuffer.length || !leftBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function parseCookies(cookieHeader) {
  return String(cookieHeader || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((result, part) => {
      const separator = part.indexOf("=");
      if (separator < 0) {
        return result;
      }
      const key = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      result[key] = decodeURIComponent(value);
      return result;
    }, {});
}

function evaluateLoginRateLimit(req) {
  const key = getRequestFingerprint(req);
  const now = Date.now();
  const activeAttempts = (loginAttempts.get(key) || []).filter((timestamp) => now - timestamp < LOGIN_WINDOW_MS);
  loginAttempts.set(key, activeAttempts);
  if (activeAttempts.length < LOGIN_ATTEMPT_LIMIT) {
    return { allowed: true, retryAfterSeconds: 0 };
  }
  const oldestActive = activeAttempts[0];
  const retryAfterMs = Math.max(LOGIN_WINDOW_MS - (now - oldestActive), 1000);
  return { allowed: false, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
}

function registerFailedLogin(req) {
  const key = getRequestFingerprint(req);
  const now = Date.now();
  const activeAttempts = (loginAttempts.get(key) || []).filter((timestamp) => now - timestamp < LOGIN_WINDOW_MS);
  activeAttempts.push(now);
  loginAttempts.set(key, activeAttempts);
}

function clearFailedLogins(req) {
  loginAttempts.delete(getRequestFingerprint(req));
}

function getRequestFingerprint(req) {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  const remoteAddress = forwardedFor || req.socket.remoteAddress || "unknown";
  return `${remoteAddress}|${String(req.headers["user-agent"] || "unknown").slice(0, 120)}`;
}

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim()
    .replace(/^::ffff:/, "") || String(req.socket.remoteAddress || "").replace(/^::ffff:/, "") || "unknown";
}

/**
 * @returns {number|null} seconds until retry, or null if allowed
 */
function rateLimitConsume(map, key, max, windowMs) {
  const now = Date.now();
  let entry = map.get(key);
  if (!entry || now - entry.start >= windowMs) {
    map.set(key, { start: now, count: 1 });
    return null;
  }
  if (entry.count >= max) {
    return Math.max(1, Math.ceil((windowMs - (now - entry.start)) / 1000));
  }
  entry.count += 1;
  return null;
}

function sanitizeSensitiveText(input) {
  const merchantPattern = /\b(walmart|target|costco|starbucks|amazon|paypal|uber|lyft|7-eleven|mcdonalds|oxxo)\b/gi;
  return String(input || "")
    .replace(/\b(?:\d[ -]*?){12,19}\b/g, "[REDACTED_ACCOUNT]")
    .replace(/\b(account|cuenta)\s*(number|numero|no\.?|#)?\s*[:=-]?\s*\w+\b/gi, "[REDACTED_ACCOUNT]")
    .replace(merchantPattern, "[REDACTED_MERCHANT]")
    .slice(0, 2400);
}

function currentMonthKey() {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}-${month}`;
}

function getRecentAiHistory(userId, limit) {
  const rows = aiHistoryMemory.get(String(userId)) || [];
  return rows.slice(-Math.max(1, limit));
}

function saveAiInteraction(userId, monthKey, question, answer) {
  const key = String(userId);
  const list = aiHistoryMemory.get(key) || [];
  list.push({ question, answer, monthKey, createdAt: new Date().toISOString() });
  while (list.length > 40) {
    list.shift();
  }
  aiHistoryMemory.set(key, list);
}

function countMonthlyQueries(userId, monthKey) {
  const list = aiHistoryMemory.get(String(userId)) || [];
  return list.filter((entry) => entry.monthKey === monthKey).length;
}

function normalizeUiLanguage(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw.startsWith("zh")) {
    return "zh";
  }
  if (raw.startsWith("es")) {
    return "es";
  }
  if (raw.startsWith("en")) {
    return "en";
  }
  return "es";
}

function normalizeAiMetric(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function buildComfortCoachPrompt(body, history, question) {
  const freeCash = normalizeAiMetric(body?.freeCash);
  const totalDebt = normalizeAiMetric(body?.totalDebt);
  const expenseLoad = normalizeAiMetric(body?.expenseLoad);
  const income = normalizeAiMetric(body?.income);
  const savings = normalizeAiMetric(body?.savings);
  const monthlyExpenses = normalizeAiMetric(body?.monthlyExpenses);
  const monthlyDebtPay = normalizeAiMetric(body?.monthlyDebtPay);
  const goals = sanitizeSensitiveText(JSON.stringify(body?.goals || []));
  const priorityDebt = sanitizeSensitiveText(String(body?.priorityDebt || "N/A"));
  const narrative = sanitizeSensitiveText(String(body?.comfortNarrative || ""));
  const viewerName = sanitizeSensitiveText(String(body?.viewerName || "N/A"));
  const viewerFocus = sanitizeSensitiveText(String(body?.viewerFocus || "N/A"));
  const uiLanguage = normalizeUiLanguage(body?.language);
  const historyText = history.length
    ? history.map((entry, index) => `(${index + 1}) Q: ${entry.question} | A: ${entry.answer}`).join("\n")
    : "None.";

  return [
    `uiLanguage (hint): ${uiLanguage}`,
    "",
    "Comfort Ledger snapshot (numbers; labels in English):",
    `income_month ${income}, monthly_expenses ${monthlyExpenses}, monthly_debt_min ${monthlyDebtPay},`,
    `liquid_savings ${savings}, total_debt ${totalDebt}, free_cash_after_goals_hint ${freeCash}, expense_ratio_of_income ${expenseLoad}.`,
    `viewer_name: ${viewerName}. viewer_focus: ${viewerFocus}.`,
    `goals_json: ${goals}. priority_debt_label: ${priorityDebt}.`,
    `health_narrative: ${narrative}`,
    "",
    "Prior chat:",
    historyText,
    "",
    "USER_QUESTION (match this language):",
    question
  ].join("\n");
}

function writeCoachSseEvent(res, obj) {
  if (res.writableEnded) return;
  res.write(`data: ${JSON.stringify(obj)}\n\n`);
}

/**
 * Streams chat completion as SSE (`data:` JSON lines).
 * Sends incremental `{ delta }`, then `{ done: true, answer, remainingQueries }` with sanitized answer.
 */
async function streamComfortCoachSse(req, res, prompt, body, ctx) {
  if (!openaiClient) {
    writeCoachSseEvent(res, { error: true, message: "OpenAI not configured." });
    res.end();
    return;
  }
  let aborted = false;
  const onAbort = () => {
    aborted = true;
  };
  req.once("aborted", onAbort);
  req.once("close", onAbort);

  const uiLanguage = normalizeUiLanguage(body?.language);
  const systemContent = `${AI_COACH_SYSTEM_PROMPT}\nuiLanguage hint: ${uiLanguage}.`;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  let full = "";

  try {
    const stream = await openaiClient.chat.completions.create({
      model,
      temperature: 0.65,
      max_tokens: OPENAI_COACH_MAX_TOKENS,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: prompt }
      ],
      stream: true
    });

    for await (const chunk of stream) {
      if (aborted || res.writableEnded) break;
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        full += delta;
        writeCoachSseEvent(res, { delta });
      }
    }
  } catch (err) {
    if (!res.writableEnded) {
      const raw = err && typeof err.message === "string" ? err.message : "";
      const fallback =
        /timeout|timed out|ETIMEDOUT|abort/i.test(raw)
          ? "OpenAI tardó demasiado. Intenta de nuevo con una pregunta más corta."
          : raw || "Coach error.";
      writeCoachSseEvent(res, { error: true, message: fallback });
      res.end();
    }
    return;
  }

  if (aborted || res.writableEnded) {
    try {
      if (!res.writableEnded) res.end();
    } catch {
      /* ignore */
    }
    return;
  }

  const trimmed = full.trim();
  const sanitizedAnswer = sanitizeSensitiveText(
    trimmed || "No se pudo generar una respuesta ahora."
  );
  saveAiInteraction(ctx.userId, ctx.monthKey, ctx.question, sanitizedAnswer);
  writeCoachSseEvent(res, {
    done: true,
    answer: sanitizedAnswer,
    remainingQueries: Math.max(0, AI_MONTHLY_LIMIT - (ctx.queriesThisMonth + 1))
  });
  res.end();
}

async function generateComfortCoachAnswer(prompt, body = {}) {
  if (!openaiClient) {
    throw new Error("OpenAI not configured");
  }
  const uiLanguage = normalizeUiLanguage(body?.language);
  const systemContent = `${AI_COACH_SYSTEM_PROMPT}\nuiLanguage hint: ${uiLanguage}.`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.65,
      max_tokens: OPENAI_COACH_MAX_TOKENS,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: prompt }
      ]
    });
    const answer = response?.choices?.[0]?.message?.content;
    return String(answer || "No se pudo generar una respuesta ahora.").trim();
  } catch (err) {
    const msg = err && typeof err.message === "string" ? err.message : "";
    if (/timeout|timed out|ETIMEDOUT|abort/i.test(msg)) {
      return "OpenAI tardó demasiado. Intenta de nuevo con una pregunta más corta.";
    }
    throw err;
  }
}

async function readJsonBody(req) {
  const raw = await readRawBody(req);
  const text = raw.toString("utf8");
  return text ? JSON.parse(text) : {};
}

async function readRawBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024 * 2) {
      throw new Error("Payload too large");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!email) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  return email;
}

function addToWaitlist(email, source) {
  return runExclusiveFileTask(WAITLIST_FILE, () => {
    const list = readJsonFile(WAITLIST_FILE, []);
    const existing = Array.isArray(list) ? list : [];
    if (!existing.some((entry) => entry.email === email)) {
      existing.push({
        email,
        source: String(source || "landing"),
        at: new Date().toISOString()
      });
      writeJsonFile(WAITLIST_FILE, existing);
    }
  });
}

function readSubscriptions() {
  const list = readJsonFile(SUBSCRIPTIONS_FILE, []);
  return Array.isArray(list) ? list : [];
}

function writeSubscriptions(list) {
  writeJsonFile(SUBSCRIPTIONS_FILE, list);
}

function findSubscription(email) {
  if (!email) return null;
  return readSubscriptions().find((entry) => entry.email === email) || null;
}

function applySubscriptionEvent(event) {
  return runExclusiveFileTask(SUBSCRIPTIONS_FILE, () => {
    if (!event || !event.email) return;
    const list = readSubscriptions();
    const idx = list.findIndex((entry) => entry.email === event.email);
    const now = new Date().toISOString();
    const next = {
      email: event.email,
      subscriptionId: event.subscriptionId || (idx >= 0 ? list[idx].subscriptionId : ""),
      customerId: event.customerId || (idx >= 0 ? list[idx].customerId : ""),
      variantId: event.variantId || (idx >= 0 ? list[idx].variantId : ""),
      plan: event.plan || (idx >= 0 ? list[idx].plan : "monthly"),
      status: event.status || (idx >= 0 ? list[idx].status : "unknown"),
      renewsAt: event.renewsAt || null,
      lastEvent: event.eventName,
      updatedAt: now,
      createdAt: idx >= 0 ? list[idx].createdAt : now
    };
    if (idx >= 0) {
      list[idx] = next;
    } else {
      list.push(next);
    }
    writeSubscriptions(list);
    console.log(`LS webhook: ${event.eventName} · ${event.email} · status=${next.status}`);
  });
}

function sendJson(res, status, payload, extraHeaders = {}) {
  const body = `${JSON.stringify(payload)}\n`;
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
  });
  res.end(body);
}

function comfortCsp() {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data:",
    "connect-src 'self' https://api.openai.com",
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'"
  ].join("; ");
}

function createHeaders(contentType, extra = {}) {
  const headers = {
    "Content-Type": contentType,
    "Content-Security-Policy": comfortCsp(),
    "Cross-Origin-Opener-Policy": "same-origin",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    ...extra
  };
  if (IS_PRODUCTION) {
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  }
  return headers;
}

function isBlockedComfortPath(rel) {
  const blocked = [
    "/comfort-ledger-beta",
    "/.git",
    "/node_modules",
    "/blackledger-elite-app",
    "/blackledger-omega-beta-deploy",
    "/push-subscriptions.json"
  ];
  if (rel.includes("..")) {
    return true;
  }
  if (rel.startsWith("/.") || rel.includes("/.")) {
    return true;
  }
  const lower = rel.toLowerCase();
  if (
    lower.includes("beta-users") ||
    lower.includes("beta-sessions") ||
    lower.includes("subscriptions.json") ||
    lower.includes("waitlist.json")
  ) {
    return true;
  }
  return blocked.some((p) => rel === p || rel.startsWith(`${p}/`));
}

function safeStaticPath(pathname) {
  let rel;
  if (pathname === "/") {
    rel = "index.html";
  } else if (pathname === "/en" || pathname === "/en/") {
    rel = "index-en.html";
  } else if (pathname === "/app" || pathname === "/app/") {
    rel = "COMFORT-LEDGER-abrir-aqui.html";
  } else if (
    pathname === "/terms" ||
    pathname === "/terms/" ||
    pathname === "/terminos" ||
    pathname === "/terminos/" ||
    pathname === "/terminos.html"
  ) {
    rel = "terms.html";
  } else if (
    pathname === "/privacy" ||
    pathname === "/privacy/" ||
    pathname === "/privacidad" ||
    pathname === "/privacidad/" ||
    pathname === "/privacidad.html"
  ) {
    rel = "privacy.html";
  } else if (
    pathname === "/refund-policy" ||
    pathname === "/refund-policy/" ||
    pathname === "/refund" ||
    pathname === "/refund/" ||
    pathname === "/refund-policy.html" ||
    pathname === "/reembolsos" ||
    pathname === "/reembolsos/" ||
    pathname === "/reembolsos.html"
  ) {
    rel = "refund-policy.html";
  } else {
    rel = decodeURIComponent(pathname).replace(/^\/+/, "");
  }
  if (isBlockedComfortPath(`/${rel}`)) {
    return null;
  }
  const rootResolved = path.resolve(__ROOT);
  const candidate = path.resolve(path.join(__ROOT, rel));
  if (candidate !== rootResolved && !candidate.startsWith(`${rootResolved}${path.sep}`)) {
    return null;
  }
  return candidate;
}

function serveComfortStatic(pathname, res, isHead, req) {
  const filePath = safeStaticPath(pathname);
  if (!filePath) {
    res.writeHead(403, createHeaders("text/plain; charset=utf-8"));
    res.end("Forbidden");
    return;
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, createHeaders("text/plain; charset=utf-8"));
    res.end("Not found");
    return;
  }
  const extension = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath);
  let contentType = MIME_TYPES[extension] || "application/octet-stream";
  if (/^schema-org-.+\.json$/i.test(basename)) {
    contentType = "application/ld+json; charset=utf-8";
  }
  const cacheControl = extension === ".html" ? "no-store" : "public, max-age=120";
  let data = fs.readFileSync(filePath);
  if (extension === ".html" && req) {
    data = rewriteLandingHtmlAbsoluteUrls(data, filePath, req);
  }
  res.writeHead(200, createHeaders(contentType, { "Cache-Control": cacheControl }));
  if (isHead) {
    res.end();
    return;
  }
  res.end(data);
}

// ---------- Web Push (VAPID) ----------

function initPushConfig() {
  const publicKey = String(process.env.COMFORT_VAPID_PUBLIC_KEY || "").trim();
  const privateKey = String(process.env.COMFORT_VAPID_PRIVATE_KEY || "").trim();
  const subject = String(process.env.COMFORT_VAPID_SUBJECT || "mailto:support@comfortledger.app").trim();
  if (publicKey && privateKey) {
    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      return { configured: true, publicKey, privateKey, subject };
    } catch (err) {
      console.error("Push init error (VAPID):", err);
    }
  } else {
    console.warn("Push notifications disabled: missing COMFORT_VAPID_PUBLIC_KEY or COMFORT_VAPID_PRIVATE_KEY.");
  }
  return { configured: false, publicKey: "", privateKey: "", subject };
}

async function resolvePushOwnerContextAsync(req) {
  const betaEnabled = readBetaUsers().length > 0;
  const accessMode = resolveAccessMode(betaEnabled);
  if (accessMode === "beta") {
    const auth = await authenticateBetaRequestAsync(req);
    if (!auth) return null;
    return {
      ownerKey: `beta:${auth.user.id}`,
      sessionKind: "beta",
      betaUserId: auth.user.id,
      onboardingProfileId: ""
    };
  }
  const auth = await authenticateOnboardingRequestAsync(req);
  if (!auth) return null;
  return {
    ownerKey: `onboarding:${auth.profile.id}`,
    sessionKind: "onboarding",
    betaUserId: "",
    onboardingProfileId: auth.profile.id
  };
}

function readPushSubscriptions() {
  const list = readJsonFile(PUSH_SUBSCRIPTIONS_FILE, []);
  return Array.isArray(list) ? list.filter((x) => x && typeof x === "object") : [];
}

function writePushSubscriptions(list) {
  writeJsonFile(PUSH_SUBSCRIPTIONS_FILE, list);
}

function normalizePushSubscription(input) {
  if (!input || typeof input !== "object") return null;
  const endpoint = String(input.endpoint || "").trim();
  if (!endpoint || endpoint.length > 800) return null;
  const keys = input.keys && typeof input.keys === "object" ? input.keys : {};
  const p256dh = String(keys.p256dh || "").trim();
  const auth = String(keys.auth || "").trim();
  if (!p256dh || !auth) return null;
  return {
    endpoint,
    expirationTime: input.expirationTime ?? null,
    keys: { p256dh, auth }
  };
}

function normalizePushReminders(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  const now = Date.now();
  const maxFutureMs = 1000 * 60 * 60 * 24 * 95;
  for (const row of input) {
    if (!row || typeof row !== "object") continue;
    const key = String(row.key || "").trim();
    const title = String(row.title || "").trim();
    const body = String(row.body || "").trim();
    const url = (String(row.url || "/app").trim() || "/app").slice(0, 600);
    const sendAtMs = Number(row.sendAtMs);
    if (!key || !Number.isFinite(sendAtMs) || !title) continue;
    if (sendAtMs < now - 1000 * 60 * 60 * 24 || sendAtMs > now + maxFutureMs) continue;
    out.push({
      key: key.slice(0, 160),
      title: title.slice(0, PUSH_MAX_TITLE_CHARS),
      body: body.slice(0, PUSH_MAX_BODY_CHARS),
      url,
      sendAtMs: Math.floor(sendAtMs),
      tag: String(row.tag || key).slice(0, 180)
    });
    if (out.length >= PUSH_MAX_REMINDERS_PER_DEVICE) break;
  }
  return out;
}

function upsertPushRegistration(owner, subscription, reminders, userAgent) {
  return runExclusiveFileTask(PUSH_SUBSCRIPTIONS_FILE, () => {
    const list = readPushSubscriptions();
    const nowIso = new Date().toISOString();
    const idx = list.findIndex(
      (x) => x.ownerKey === owner.ownerKey && x.subscription?.endpoint === subscription.endpoint
    );
    const keepSent = new Set(reminders.map((r) => r.key));
    const prevSent = idx >= 0 && list[idx].sent ? list[idx].sent : {};
    const nextSent = {};
    for (const [key, value] of Object.entries(prevSent)) {
      const ts = Number(value);
      if (!keepSent.has(key) || !Number.isFinite(ts)) continue;
      if (Date.now() - ts > PUSH_SENT_RETENTION_MS) continue;
      nextSent[key] = ts;
    }
    const next = {
      id: idx >= 0 ? list[idx].id : `push-${crypto.randomUUID()}`,
      ownerKey: owner.ownerKey,
      sessionKind: owner.sessionKind,
      betaUserId: owner.betaUserId,
      onboardingProfileId: owner.onboardingProfileId,
      subscription,
      reminders,
      sent: nextSent,
      userAgent,
      updatedAt: nowIso,
      createdAt: idx >= 0 ? list[idx].createdAt : nowIso
    };
    if (idx >= 0) list[idx] = next;
    else list.push(next);
    writePushSubscriptions(list);
  });
}

function removePushRegistration(ownerKey, endpoint = "") {
  return runExclusiveFileTask(PUSH_SUBSCRIPTIONS_FILE, () => {
    const list = readPushSubscriptions();
    const next = list.filter((row) => {
      if (row.ownerKey !== ownerKey) return true;
      if (!endpoint) return false;
      return row.subscription?.endpoint !== endpoint;
    });
    if (next.length === list.length) return 0;
    writePushSubscriptions(next);
    return list.length - next.length;
  });
}

function startPushDispatcher() {
  if (!pushConfig.configured) return;
  if (pushDispatcherTimer) clearInterval(pushDispatcherTimer);
  pushDispatcherTimer = setInterval(() => {
    dispatchDuePushNotifications().catch((err) => {
      console.error("Push dispatch error:", err);
    });
  }, PUSH_DISPATCH_INTERVAL_MS);
  setTimeout(() => {
    dispatchDuePushNotifications().catch((err) => {
      console.error("Push dispatch warmup error:", err);
    });
  }, 2000);
}

async function dispatchDuePushNotifications() {
  if (!pushConfig.configured) return;
  await runExclusiveFileTask(PUSH_SUBSCRIPTIONS_FILE, async () => {
    const list = readPushSubscriptions();
    if (!list.length) return;
    const now = Date.now();
    let changed = false;

    for (let i = 0; i < list.length; i += 1) {
      const row = list[i];
      const reminders = Array.isArray(row.reminders) ? row.reminders : [];
      if (!row.sent || typeof row.sent !== "object") row.sent = {};

      for (const reminder of reminders) {
        if (!reminder || typeof reminder !== "object") continue;
        const sendAtMs = Number(reminder.sendAtMs);
        if (!Number.isFinite(sendAtMs) || sendAtMs > now) continue;
        if (row.sent[reminder.key]) continue;

        const payload = {
          title: String(reminder.title || "Comfort Ledger"),
          body: String(reminder.body || ""),
          url: String(reminder.url || "/app"),
          tag: String(reminder.tag || reminder.key || "comfort-reminder")
        };

        try {
          await webpush.sendNotification(row.subscription, JSON.stringify(payload), {
            TTL: 60 * 60 * 6,
            urgency: "high"
          });
          row.sent[reminder.key] = now;
          changed = true;
        } catch (err) {
          const statusCode = Number(err?.statusCode || err?.status || 0);
          if (statusCode === 404 || statusCode === 410) {
            list.splice(i, 1);
            i -= 1;
            changed = true;
            break;
          }
          console.warn("Push send failed:", statusCode || err?.message || err);
        }
      }
    }
    if (changed) writePushSubscriptions(list);
  });
}
