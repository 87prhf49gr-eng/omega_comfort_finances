/**
 * Comfort Ledger beta server: static parent folder + beta login + OpenAI coach.
 * Run from repo: cd comfort-ledger/comfort-ledger-beta && npm install && npm start
 * Env: OPENAI_API_KEY, COMFORT_SESSION_SECRET (optional), COMFORT_SUBSCRIBE_URL,
 * COMFORT_REQUIRE_BETA_LOGIN (default true if hay usuarios beta),
 * COMFORT_LANDING_DEMO_MINUTES (default 10; solo visitantes sin sesión beta, p. ej. desde el landing)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const OpenAI = require("openai");

const PORT = Number(process.env.PORT || 8787);
const __ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.resolve(process.env.COMFORT_DATA_DIR || path.join(__dirname, "data"));
const BUNDLED_DATA_DIR = path.join(__dirname, "data");
const BUNDLED_BETA_USERS_FILE = path.join(BUNDLED_DATA_DIR, "beta-users.json");
const BETA_USERS_FILE = path.join(DATA_DIR, "beta-users.json");
const BETA_SESSIONS_FILE = path.join(DATA_DIR, "beta-sessions.json");
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const SESSION_SECRET = String(process.env.COMFORT_SESSION_SECRET || crypto.randomBytes(32).toString("hex"));
const SESSION_COOKIE_NAME = "comfort_beta_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const LANDING_DEMO_MS = Math.max(0, Number(process.env.COMFORT_LANDING_DEMO_MINUTES || 10)) * 60 * 1000;
const SUBSCRIBE_URL = String(process.env.COMFORT_SUBSCRIBE_URL || "https://example.com/subscribe").trim();
const LOGIN_WINDOW_MS = 1000 * 60 * 15;
const LOGIN_ATTEMPT_LIMIT = 12;
const AI_HISTORY_LIMIT = 4;
const AI_MONTHLY_LIMIT = 80;

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
let openaiClient = null;
/** @type {Map<string, Array<{question:string,answer:string}>>} */
const aiHistoryMemory = new Map();

ensureStorage();

if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
  console.warn("OPENAI_API_KEY is not set. Coach API will return errors until configured.");
}

if (!process.env.COMFORT_SESSION_SECRET) {
  console.warn("COMFORT_SESSION_SECRET is not set. Sessions reset on server restart.");
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    if (pathname === "/api/health" && req.method === "GET") {
      return sendJson(res, 200, {
        ok: true,
        service: "comfort-ledger-beta",
        betaUsers: readBetaUsers().length,
        openai: Boolean(openaiClient)
      });
    }

    if (pathname === "/api/public-config" && req.method === "GET") {
      const users = readBetaUsers();
      const betaEnabled = users.length > 0;
      const requireBetaLogin =
        String(process.env.COMFORT_REQUIRE_BETA_LOGIN || (betaEnabled ? "true" : "false"))
          .toLowerCase()
          .trim() !== "false";
      return sendJson(res, 200, {
        ok: true,
        comfortHosted: true,
        betaEnabled,
        requireBetaLogin: betaEnabled ? requireBetaLogin : false,
        subscribeUrl: SUBSCRIBE_URL,
        landingDemoMinutes: Math.round(LANDING_DEMO_MS / 60000),
        landingDemoMs: LANDING_DEMO_MS,
        aiCoachConfigured: Boolean(openaiClient)
      });
    }

    if (pathname === "/api/beta/session" && req.method === "GET") {
      const auth = authenticateBetaRequest(req);
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
      const session = createBetaSession(user.id);
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
      destroyBetaSession(cookies[SESSION_COOKIE_NAME]);
      await readJsonBody(req).catch(() => ({}));
      return sendJson(res, 200, { ok: true }, { "Set-Cookie": clearSessionCookie() });
    }

    if (pathname === "/api/ai-coach" && req.method === "POST") {
      const body = await readJsonBody(req);
      const auth = authenticateBetaRequest(req);
      if (!auth) {
        return sendJson(res, 401, { ok: false, error: "Inicia sesión para usar el coach." });
      }
      if (!openaiClient) {
        return sendJson(res, 503, { ok: false, error: "Coach no configurado (falta OPENAI_API_KEY en el servidor)." });
      }

      const question = sanitizeSensitiveText(String(body?.question || "").trim());
      if (!question) {
        return sendJson(res, 400, { ok: false, error: "Escribe una pregunta." });
      }

      const userId = auth.user.id;
      const monthKey = currentMonthKey();
      const queriesThisMonth = countMonthlyQueries(userId, monthKey);
      if (queriesThisMonth >= AI_MONTHLY_LIMIT) {
        return sendJson(res, 429, {
          ok: false,
          error: "Límite mensual de consultas alcanzado.",
          remainingQueries: 0
        });
      }

      const history = getRecentAiHistory(userId, AI_HISTORY_LIMIT);
      const prompt = buildComfortCoachPrompt(body, history, question);
      const answer = await generateComfortCoachAnswer(prompt, body);
      const sanitizedAnswer = sanitizeSensitiveText(answer);
      saveAiInteraction(userId, monthKey, question, sanitizedAnswer);

      return sendJson(res, 200, {
        ok: true,
        answer: sanitizedAnswer,
        remainingQueries: Math.max(0, AI_MONTHLY_LIMIT - (queriesThisMonth + 1))
      });
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return sendJson(res, 405, { ok: false, error: "Method not allowed" });
    }

    serveComfortStatic(pathname, res, req.method === "HEAD");
  } catch (error) {
    console.error(error);
    const message = error && typeof error.message === "string" ? error.message : "Server error";
    sendJson(res, 500, { ok: false, error: message });
  }
});

server.listen(PORT, () => {
  console.log(`Comfort Ledger beta → http://127.0.0.1:${PORT}/`);
  console.log(
    `Landing demo: ${LANDING_DEMO_MS / 60000} min (sin sesión) · Subscribe: ${SUBSCRIBE_URL} · COMFORT_REQUIRE_BETA_LOGIN=${String(
      process.env.COMFORT_REQUIRE_BETA_LOGIN || "(default if beta users)"
    )}`
  );
});

function ensureStorage() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BETA_SESSIONS_FILE)) {
    fs.writeFileSync(BETA_SESSIONS_FILE, "[]\n", "utf8");
  }
  if (!fs.existsSync(BETA_USERS_FILE)) {
    if (BETA_USERS_FILE !== BUNDLED_BETA_USERS_FILE && fs.existsSync(BUNDLED_BETA_USERS_FILE)) {
      fs.copyFileSync(BUNDLED_BETA_USERS_FILE, BETA_USERS_FILE);
    } else {
      fs.writeFileSync(BETA_USERS_FILE, "[]\n", "utf8");
    }
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

function readBetaUsers() {
  const parsed = readJsonFile(BETA_USERS_FILE, []);
  return Array.isArray(parsed)
    ? parsed.filter((user) => user && typeof user === "object" && user.active !== false && user.username)
    : [];
}

function readBetaSessions() {
  const parsed = readJsonFile(BETA_SESSIONS_FILE, []);
  return Array.isArray(parsed) ? parsed.filter((session) => session && typeof session === "object") : [];
}

function writeBetaSessions(sessions) {
  writeJsonFile(BETA_SESSIONS_FILE, sessions);
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

function pruneExpiredSessions() {
  const now = Date.now();
  const sessions = readBetaSessions();
  const activeSessions = sessions.filter((session) => {
    const expiresAt = new Date(session.expiresAt || 0).getTime();
    return Number.isFinite(expiresAt) && expiresAt > now;
  });
  if (activeSessions.length !== sessions.length) {
    writeBetaSessions(activeSessions);
  }
  return activeSessions;
}

function createBetaSession(userId) {
  const sessions = pruneExpiredSessions();
  const now = new Date();
  const token = crypto.randomBytes(32).toString("hex");
  const session = {
    id: `session-${crypto.randomUUID()}`,
    tokenHash: hashSessionToken(token),
    userId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString()
  };
  sessions.unshift(session);
  writeBetaSessions(sessions);
  return { ...session, token };
}

function destroyBetaSession(token) {
  if (!token) {
    return;
  }
  const tokenHash = hashSessionToken(token);
  const sessions = readBetaSessions().filter((session) => !sessionMatchesToken(session, token, tokenHash));
  writeBetaSessions(sessions);
}

function authenticateBetaRequest(req) {
  const users = readBetaUsers();
  if (!users.length) {
    return null;
  }
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) {
    return null;
  }
  const sessions = pruneExpiredSessions();
  const tokenHash = hashSessionToken(token);
  const sessionIndex = sessions.findIndex((session) => sessionMatchesToken(session, token, tokenHash));
  if (sessionIndex < 0) {
    return null;
  }
  const user = users.find((entry) => entry.id === sessions[sessionIndex].userId);
  if (!user) {
    destroyBetaSession(token);
    return null;
  }
  sessions[sessionIndex] = {
    ...sessions[sessionIndex],
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString()
  };
  writeBetaSessions(sessions);
  return { session: sessions[sessionIndex], user };
}

function publicBetaUser(user) {
  return {
    id: user.id,
    displayName: user.displayName || "Beta",
    slot: user.slot || null,
    username: normalizeUsername(user.username)
  };
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

async function generateComfortCoachAnswer(prompt, body = {}) {
  if (!openaiClient) {
    throw new Error("OpenAI not configured");
  }
  const uiLanguage = normalizeUiLanguage(body?.language);
  const systemContent = `${AI_COACH_SYSTEM_PROMPT}\nuiLanguage hint: ${uiLanguage}.`;

  const response = await openaiClient.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.65,
    max_tokens: 450,
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: prompt }
    ]
  });
  const answer = response?.choices?.[0]?.message?.content;
  return String(answer || "No se pudo generar una respuesta ahora.").trim();
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024 * 2) {
      throw new Error("Payload too large");
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
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
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data:",
    "connect-src 'self'",
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
    "/blackledger-omega-beta-deploy"
  ];
  if (rel.includes("..")) {
    return true;
  }
  if (rel.startsWith("/.") || rel.includes("/.")) {
    return true;
  }
  const lower = rel.toLowerCase();
  if (lower.includes("beta-users") || lower.includes("beta-sessions")) {
    return true;
  }
  return blocked.some((p) => rel === p || rel.startsWith(`${p}/`));
}

function safeStaticPath(pathname) {
  const rel = pathname === "/" ? "COMFORT-LEDGER-abrir-aqui.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
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

function serveComfortStatic(pathname, res, isHead) {
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
  const contentType = MIME_TYPES[extension] || "application/octet-stream";
  const cacheControl = extension === ".html" ? "no-store" : "public, max-age=120";
  const data = fs.readFileSync(filePath);
  res.writeHead(200, createHeaders(contentType, { "Cache-Control": cacheControl }));
  if (isHead) {
    res.end();
    return;
  }
  res.end(data);
}
