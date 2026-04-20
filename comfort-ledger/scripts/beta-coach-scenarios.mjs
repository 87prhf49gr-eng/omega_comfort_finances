#!/usr/bin/env node
/**
 * Cinco escenarios de prueba contra comfort-ledger-beta (sesión beta + coach OpenAI).
 *
 * Uso:
 *   cd comfort-ledger/comfort-ledger-beta && npm start
 *   BETA01_PIN=tu_pin OPENAI_API_KEY=... node ../scripts/beta-coach-scenarios.mjs
 *
 * Variables:
 *   COMFORT_BASE_URL (default http://127.0.0.1:8787)
 *   BETA01_PIN — contraseña del usuario beta01
 */

const BASE = String(process.env.COMFORT_BASE_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const BETA_PIN = String(process.env.BETA01_PIN || process.env.BETA01_PASSWORD || "").trim();
const SESSION_COOKIE_NAME = "comfort_beta_session";

function coachSnapshot(overrides) {
  const base = {
    language: "es",
    income: 0,
    monthlyExpenses: 0,
    monthlyDebtPay: 0,
    savings: 0,
    totalDebt: 0,
    freeCash: 0,
    expenseLoad: 0,
    collectionRate: 0,
    goals: [],
    priorityDebt: "",
    comfortNarrative: "",
    viewerName: "beta01",
    viewerFocus: "prueba automatizada"
  };
  return { ...base, ...overrides };
}

const SCENARIOS = [
  {
    name: "1 — Ingreso mínimo (orden de magnitud salario bajo) + gasto típico",
    question:
      "Gano muy poco al mes. Con estos números, ¿crees que llego o me falta aire? Dame 3 ideas concretas para recortar sin sonar condescendiente.",
    snapshot: coachSnapshot({
      income: 520,
      monthlyExpenses: 485,
      monthlyDebtPay: 45,
      savings: 80,
      totalDebt: 2100,
      freeCash: -10,
      expenseLoad: 0.93,
      priorityDebt: "Tarjeta tienda",
      comfortNarrative:
        "Perfil: ingreso bajo. Gastos fijos altos vs ingreso. Deuda pequeña pero pagos mínimos aprietan.",
      goals: [{ label: "Colchón", target: 500, months: 10 }]
    })
  },
  {
    name: "2 — Sueldo intermedio, gastos regulares",
    question: "¿Mi ratio gasto/ingreso se ve razonable para un hogar con gastos corrientes típicos?",
    snapshot: coachSnapshot({
      income: 4200,
      monthlyExpenses: 3100,
      monthlyDebtPay: 380,
      savings: 4200,
      totalDebt: 18500,
      freeCash: 520,
      expenseLoad: 0.74,
      priorityDebt: "Auto + tarjeta",
      comfortNarrative:
        "Hogar clase media: renta moderada, seguro, comida, transporte. Algo de margen pero metas de colchón.",
      goals: [
        { label: "Vacaciones", target: 3500, months: 8 },
        { label: "Fondo emergencia", target: 8000, months: 14 }
      ]
    })
  },
  {
    name: "3 — Ingreso alto, deuda y metas fuertes",
    question:
      "Si quiero mantener estilo de vida y bajar deuda de tarjeta en 18 meses, ¿por dónde empezarías?",
    snapshot: coachSnapshot({
      income: 18500,
      monthlyExpenses: 9200,
      monthlyDebtPay: 2100,
      savings: 55000,
      totalDebt: 78000,
      freeCash: 6100,
      expenseLoad: 0.5,
      priorityDebt: "Amex + Visa",
      comfortNarrative:
        "Alto ingreso, gasto elevado pero sostenible; deuda agregada significativa; metas de vivienda y ahorro.",
      goals: [
        { label: "Enganche vivienda", target: 120000, months: 36 },
        { label: "Ahorro anual", target: 30000, months: 12 }
      ]
    })
  },
  {
    name: "4 — Estrés: muchas metas y magnitudes extremas (API)",
    question: "Resume en una frase si esto es sostenible o no.",
    snapshot: coachSnapshot({
      income: 999999.99,
      monthlyExpenses: 999998,
      monthlyDebtPay: 400000,
      savings: 1,
      totalDebt: 1e12,
      freeCash: -500000,
      expenseLoad: 0.999999,
      priorityDebt: "Deuda gigante sintética",
      comfortNarrative: "Prueba de estrés numérica; valores no reales.",
      goals: Array.from({ length: 40 }, (_, i) => ({
        label: `Meta stress ${i + 1}`,
        target: 1000 + i * 17,
        months: 3 + (i % 24)
      }))
    })
  },
  {
    name: "5 — Estrés: ingreso cero en snapshot + pregunta larga y caracteres especiales",
    question:
      "¿Qué pasa si income=0 pero tengo ahorros? ñáéíóú ¿Debo priorizar deuda o comer? 🔍" + " x".repeat(120),
    snapshot: coachSnapshot({
      income: 0,
      monthlyExpenses: 1200,
      monthlyDebtPay: 200,
      savings: 8000,
      totalDebt: 15000,
      freeCash: 7000,
      expenseLoad: 0,
      priorityDebt: "Préstamo personal",
      comfortNarrative: "Edge case: sin ingreso reportado este mes; hay colchón líquido.",
      goals: []
    })
  }
];

async function fetchJson(path, opts = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {})
    }
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  return { res, data };
}

function extractSessionCookie(res) {
  let cookieVal = "";
  const getSet = res.headers.getSetCookie?.();
  if (getSet && getSet.length) {
    const line = getSet.find((c) => c.startsWith(SESSION_COOKIE_NAME + "="));
    if (line) cookieVal = line.split(";")[0];
  }
  if (!cookieVal) {
    const sc = res.headers.get("set-cookie");
    if (sc) {
      const first = sc.split(/,(?=[^;]+?=)/)[0];
      if (first && first.trim().startsWith(SESSION_COOKIE_NAME + "=")) {
        cookieVal = first.trim().split(";")[0];
      }
    }
  }
  return cookieVal;
}

async function loginBeta() {
  const res = await fetch(`${BASE}/api/beta/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "beta01", password: BETA_PIN })
  });
  const data = await res.json().catch(() => ({}));
  return { res, data, cookieVal: extractSessionCookie(res) };
}

async function coachRequest(cookieVal, question, snapshot) {
  const headers = { "Content-Type": "application/json" };
  if (cookieVal) headers.Cookie = cookieVal;
  const res = await fetch(`${BASE}/api/ai-coach`, {
    method: "POST",
    headers,
    body: JSON.stringify({ question, ...snapshot })
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function main() {
  console.log("Comfort Ledger — escenarios de prueba\nBase:", BASE, "\n");

  const health = await fetchJson("/api/health");
  console.log("GET /api/health", health.res.status, health.data);

  const cfg = await fetchJson("/api/public-config");
  console.log("GET /api/public-config", cfg.res.status, {
    accessMode: cfg.data.accessMode,
    aiCoachConfigured: cfg.data.aiCoachConfigured,
    requireBetaLogin: cfg.data.requireBetaLogin
  });

  if (!BETA_PIN) {
    console.error("\nFalta BETA01_PIN. Ejemplo: BETA01_PIN='tu_pin' node comfort-ledger/scripts/beta-coach-scenarios.mjs");
    process.exit(2);
  }

  const login = await loginBeta();
  if (!login.res.ok || !login.data.ok || !login.cookieVal) {
    console.error("Login beta01 falló:", login.res.status, login.data);
    process.exit(1);
  }
  console.log("Login beta01 OK\n");

  if (!cfg.data.aiCoachConfigured) {
    console.warn("⚠ OPENAI_API_KEY no está en el servidor: las llamadas al coach devolverán 503.\n");
  }

  for (const sc of SCENARIOS) {
    console.log("---");
    console.log(sc.name);
    const { res, data } = await coachRequest(login.cookieVal, sc.question, sc.snapshot);
    console.log("POST /api/ai-coach", res.status);
    if (data.answer) {
      const a = String(data.answer);
      console.log("Respuesta (recorte):", a.slice(0, 700) + (a.length > 700 ? "…" : ""));
    } else {
      console.log("Cuerpo:", JSON.stringify(data).slice(0, 900));
    }
    if (typeof data.remainingQueries === "number") {
      console.log("Consultas restantes (mes):", data.remainingQueries);
    }
    console.log("");
  }

  console.log("Listo — 5 escenarios ejecutados.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
