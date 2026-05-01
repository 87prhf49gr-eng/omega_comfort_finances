/* Comfort Ledger coach module (Hito D phase 4) */

const COACH_PREFS_KEY = "comfort_coach_prefs_v1";
const COACH_OPENAI_KEY_SESSION = "comfort_coach_openai_key_v1";
let coachKeyLegacyMigrated = false;

function migrateCoachKeyFromLegacy() {
  if (coachKeyLegacyMigrated) return;
  coachKeyLegacyMigrated = true;
  try {
    const raw = localStorage.getItem(COACH_PREFS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const key = typeof parsed.apiKey === "string" ? parsed.apiKey.trim() : "";
    if (!key) return;
    sessionStorage.setItem(COACH_OPENAI_KEY_SESSION, key);
    localStorage.setItem(
      COACH_PREFS_KEY,
      JSON.stringify({
        mode: parsed.mode === "openai" ? "openai" : "local",
        model:
          typeof parsed.model === "string" && parsed.model.length < 80 ? parsed.model : "gpt-4o-mini"
      })
    );
  } catch {
    /* noop */
  }
}
const COACH_OPENAI_SYSTEM =
  "You are Comfort Ledger's personal finance coach. You talk to someone stressed about money. Use the numbers they share (income, expenses, debt, cash, goals) to answer precisely — no platitudes. Be practical, short, and kind. Never ask for card numbers or passwords. Reply in the same language as the latest USER_QUESTION block; if ambiguous, follow the uiLanguage hint (es/en/zh).";

/** Effective max_tokens for BYOK calls; synced from server via `window.__COMFORT_COACH_MAX_TOKENS` (#19). */
function coachOpenAiMaxTokens() {
  try {
    if (typeof window === "undefined") return 450;
    const n = Number(window.__COMFORT_COACH_MAX_TOKENS);
    if (Number.isFinite(n)) return Math.min(2000, Math.max(80, Math.floor(n)));
  } catch {
    /* noop */
  }
  return 450;
}

function setupCoachSettingsModal() {
  const runVt =
    typeof window !== "undefined" && typeof window.comfortRunViewTransition === "function"
      ? window.comfortRunViewTransition
      : (fn) => fn();
  const btn = document.getElementById("coachSettingsBtn");
  const overlay = document.getElementById("comfortCoachSettings");
  if (!btn || !overlay) return;
  const form = document.getElementById("coachSettingsForm");
  const cancel = document.getElementById("coachSettingsCancel");
  const setupBox = document.getElementById("coachOpenAISetup");
  const keyInput = document.getElementById("coachOpenAIKey");
  const modelSelect = document.getElementById("coachOpenAIModel");
  const errEl = document.getElementById("coachSettingsErr");

  const applyModeVisibility = () => {
    const mode = form?.elements?.coachMode?.value || "local";
    if (setupBox) setupBox.hidden = mode !== "openai";
  };

  const openModal = () => {
    const prefs = loadCoachPrefs();
    if (form) {
      form.elements.coachMode.value = prefs.mode;
    }
    if (keyInput) keyInput.value = prefs.apiKey;
    if (modelSelect) modelSelect.value = prefs.model;
    if (errEl) errEl.hidden = true;
    applyModeVisibility();
    runVt(() => {
      if (typeof comfortOverlayReveal === "function") {
        comfortOverlayReveal(overlay);
      } else {
        overlay.classList.remove("comfort-beta-overlay--hidden");
        overlay.setAttribute("aria-hidden", "false");
      }
    });
    setTimeout(() => (form?.elements?.coachMode?.focus?.() ?? null), 30);
  };
  const closeModal = () => {
    runVt(() => {
      if (typeof comfortOverlayDismiss === "function") {
        comfortOverlayDismiss(overlay);
      } else {
        overlay.classList.add("comfort-beta-overlay--hidden");
        overlay.setAttribute("aria-hidden", "true");
      }
    });
  };

  btn.addEventListener("click", openModal);
  cancel?.addEventListener("click", closeModal);
  form?.addEventListener("change", (ev) => {
    if (ev.target?.name === "coachMode") applyModeVisibility();
  });
  form?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const mode = form.elements.coachMode.value === "openai" ? "openai" : "local";
    const apiKey = keyInput ? String(keyInput.value || "").trim() : "";
    const model = modelSelect ? modelSelect.value : "gpt-4o-mini";

    if (mode === "openai" && !apiKey) {
      if (errEl) {
        errEl.textContent = t("coach_openai_key_missing");
        errEl.hidden = false;
      }
      keyInput?.focus();
      return;
    }
    if (mode === "openai" && apiKey && !/^sk-[A-Za-z0-9_\-]{20,}$/.test(apiKey)) {
      if (errEl) {
        errEl.textContent = t("coach_openai_key_format");
        errEl.hidden = false;
      }
      keyInput?.focus();
      return;
    }

    saveCoachPrefs({ mode, apiKey, model });
    applyCoachBadge();
    closeModal();
    flashSavedIndicator();
  });
}

function applyCoachBadge() {
  const badge = document.querySelector(".coach-badge");
  const status = document.getElementById("coachStatus");
  if (!badge) return;
  const prefs = loadCoachPrefs();
  if (prefs.mode === "openai" && prefs.apiKey) {
    badge.textContent = t("coach_badge_cloud");
    if (status && !status.textContent) status.textContent = t("coach_status_direct");
    return;
  }
  if (window.__COMFORT_HOSTED && window.__COMFORT_AI_COACH) {
    badge.textContent = t("coach_badge_cloud");
    if (status && !status.textContent) status.textContent = t("coach_status_cloud");
    return;
  }
  badge.textContent = t("coach_badge");
  if (status && !status.textContent) status.textContent = t("coach_status");
}

function loadCoachPrefs() {
  migrateCoachKeyFromLegacy();
  try {
    const raw = localStorage.getItem(COACH_PREFS_KEY);
    let mode = "local";
    let model = "gpt-4o-mini";
    if (raw) {
      const parsed = JSON.parse(raw);
      mode = parsed.mode === "openai" ? "openai" : "local";
      model =
        typeof parsed.model === "string" && parsed.model.length < 80 ? parsed.model : "gpt-4o-mini";
    }
    let apiKey = "";
    try {
      apiKey = sessionStorage.getItem(COACH_OPENAI_KEY_SESSION) || "";
    } catch {
      apiKey = "";
    }
    return { mode, apiKey, model };
  } catch {
    return { mode: "local", apiKey: "", model: "gpt-4o-mini" };
  }
}

function saveCoachPrefs(prefs) {
  try {
    const mode = prefs.mode === "openai" ? "openai" : "local";
    const apiKey = String(prefs.apiKey || "").trim();
    localStorage.setItem(
      COACH_PREFS_KEY,
      JSON.stringify({
        mode,
        model: String(prefs.model || "gpt-4o-mini")
      })
    );
    try {
      if (mode === "openai" && apiKey) sessionStorage.setItem(COACH_OPENAI_KEY_SESSION, apiKey);
      else sessionStorage.removeItem(COACH_OPENAI_KEY_SESSION);
    } catch {
      /* noop */
    }
  } catch {
    /* noop */
  }
}

function buildCoachContextPayload(text, snap) {
  const incomeRef = Math.max(snap.income, 1);
  const goals = (state.savingsGoals || []).map((g) => ({
    label: String(g.label || "").slice(0, 48),
    target: Number(g.targetAmount) || 0,
    months: Number(g.months) || 0
  }));
  const cardRow = (state.debts || []).find((d) => d && d.debtType === "card");
  const profile = getStoredProfile();
  return {
    question: text,
    language: UI_LOCALE,
    income: snap.income,
    monthlyExpenses: snap.monthlyExpenses,
    monthlyDebtPay: snap.monthlyDebtPay,
    savings: snap.savings,
    totalDebt: snap.totalDebt,
    freeCash: snap.freeAfterGoals,
    expenseLoad: snap.monthlyExpenses / incomeRef,
    goals,
    priorityDebt: cardRow ? String(cardRow.label || "").slice(0, 80) : "",
    comfortNarrative: String(snap.narrative || "").slice(0, 500),
    viewerName: profile?.displayName || "",
    viewerFocus: profile?.focus || ""
  };
}

/**
 * Reads OpenAI chat completions SSE (`stream: true`) from fetch(); calls onDelta(fullTextSoFar) per chunk.
 */
async function consumeOpenAiChatCompletionsSse(response, onDelta) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    while (true) {
      const sep = buf.indexOf("\n\n");
      if (sep === -1) break;
      const rawBlock = buf.slice(0, sep);
      buf = buf.slice(sep + 2);
      const block = rawBlock.trimEnd();
      let merged = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("data:")) {
          const piece = line.slice(5).replace(/^\s/, "");
          merged = merged ? `${merged}\n${piece}` : piece;
        }
      }
      if (!merged) continue;
      if (merged.trim() === "[DONE]") continue;
      let json;
      try {
        json = JSON.parse(merged);
      } catch {
        continue;
      }
      const errObj = json && json.error;
      if (errObj && typeof errObj.message === "string") {
        throw new Error(errObj.message);
      }
      const piece = json?.choices?.[0]?.delta?.content;
      if (piece) {
        full += piece;
        if (typeof onDelta === "function") onDelta(full);
      }
    }
  }
  return full.trim();
}

async function comfortCoachAskOpenAIDirect(text, snap, prefs, streamOpts = {}) {
  const onDelta = typeof streamOpts.onDelta === "function" ? streamOpts.onDelta : null;
  const apiKey = String(prefs?.apiKey || "").trim();
  if (!apiKey) throw new Error(t("coach_openai_key_missing"));
  const model = prefs?.model || "gpt-4o-mini";
  const ctx = buildCoachContextPayload(text, snap);

  const contextBlock = [
    `uiLanguage: ${ctx.language}`,
    `income_month: ${ctx.income}`,
    `monthly_expenses: ${ctx.monthlyExpenses}`,
    `monthly_debt_minimums: ${ctx.monthlyDebtPay}`,
    `liquid_savings: ${ctx.savings}`,
    `total_debt: ${ctx.totalDebt}`,
    `free_after_everything: ${ctx.freeCash}`,
    `expense_load_ratio: ${ctx.expenseLoad.toFixed(2)}`,
    ctx.priorityDebt ? `priority_debt_label: ${ctx.priorityDebt}` : "",
    ctx.goals.length
      ? `goals: ${ctx.goals.map((g) => `${g.label} (${g.target} in ${g.months} months)`).join(" | ")}`
      : "",
    ctx.viewerName ? `viewer_name: ${ctx.viewerName}` : "",
    ctx.viewerFocus ? `viewer_focus: ${ctx.viewerFocus}` : "",
    ctx.comfortNarrative ? `local_snapshot: ${ctx.comfortNarrative}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  const body = {
    model,
    temperature: 0.4,
    max_tokens: coachOpenAiMaxTokens(),
    stream: Boolean(onDelta),
    messages: [
      { role: "system", content: COACH_OPENAI_SYSTEM },
      { role: "user", content: `CONTEXT:\n${contextBlock}\n\nUSER_QUESTION:\n${text}` }
    ]
  };

  const ac = new AbortController();
  const timeoutMs = 30000;
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  let response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: ac.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "text/event-stream, application/json"
      },
      body: JSON.stringify(body)
    });
  } catch (err) {
    if (err && err.name === "AbortError") throw new Error(t("coach_openai_timeout"));
    throw new Error(t("coach_openai_network_err"));
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    if (response.status === 401) throw new Error(t("coach_openai_key_invalid"));
    if (response.status === 429) throw new Error(t("coach_openai_rate_limit"));
    if (response.status >= 500) throw new Error(t("coach_openai_server_err"));
    throw new Error(`OpenAI ${response.status}`);
  }
  const ct = (response.headers.get("Content-Type") || "").toLowerCase();
  if (
    onDelta &&
    ct.includes("text/event-stream") &&
    response.body &&
    typeof response.body.getReader === "function"
  ) {
    return consumeOpenAiChatCompletionsSse(response, onDelta);
  }
  const json = await response.json().catch(() => ({}));
  const answer = json?.choices?.[0]?.message?.content;
  if (!answer) throw new Error(t("coach_openai_empty"));
  return String(answer).trim();
}

/**
 * Parses POST /api/ai-coach when Content-Type is text/event-stream.
 * Sends incremental `delta`; final event has done + sanitized `answer`.
 */
async function consumeHostedCoachSse(res, onDelta) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let carry = "";
  let accumulated = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    carry += decoder.decode(value, { stream: true });
    while (true) {
      const sep = carry.indexOf("\n\n");
      if (sep === -1) break;
      const block = carry.slice(0, sep).trimEnd();
      carry = carry.slice(sep + 2);
      let dataPayload = "";
      for (const line of block.split("\n")) {
        if (!line.startsWith("data")) continue;
        const rest = /^data\s*:\s*(.*)$/i.exec(line);
        if (rest) dataPayload = rest[1];
      }
      if (!dataPayload) continue;
      let ev = null;
      try {
        ev = JSON.parse(dataPayload);
      } catch {
        continue;
      }
      if (ev.delta) {
        accumulated += ev.delta;
        if (typeof onDelta === "function") onDelta(accumulated);
      }
      if (ev.error) {
        throw new Error(String(ev.message || "Coach error."));
      }
      if (ev.done === true) {
        const finalTrim =
          typeof ev.answer === "string" && ev.answer.trim() ? ev.answer.trim() : accumulated.trim();
        if (typeof onDelta === "function") onDelta(finalTrim);
        return finalTrim;
      }
    }
  }
  return accumulated.trim();
}

async function comfortCoachAskOpenAI(text, snap, streamOpts = {}) {
  const incomeRef = Math.max(snap.income, 1);
  const goals = (state.savingsGoals || []).map((g) => ({
    label: String(g.label || "").slice(0, 48),
    target: Number(g.targetAmount) || 0,
    months: Number(g.months) || 0
  }));
  const cardRow = (state.debts || []).find((d) => d && d.debtType === "card");
  const profile = getStoredProfile();
  const onDelta = typeof streamOpts.onDelta === "function" ? streamOpts.onDelta : null;
  const payload = {
    question: text,
    language: UI_LOCALE,
    income: snap.income,
    monthlyExpenses: snap.monthlyExpenses,
    monthlyDebtPay: snap.monthlyDebtPay,
    savings: snap.savings,
    totalDebt: snap.totalDebt,
    freeCash: snap.freeAfterGoals,
    expenseLoad: snap.monthlyExpenses / incomeRef,
    collectionRate: 0,
    goals,
    priorityDebt: cardRow ? String(cardRow.label || "").slice(0, 80) : "",
    comfortNarrative: String(snap.narrative || "").slice(0, 500),
    viewerName: profile?.displayName || "",
    viewerFocus: profile?.focus || "",
    stream: Boolean(onDelta)
  };
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 30000);
  let res;
  try {
    res = await fetch("/api/ai-coach", {
      method: "POST",
      credentials: "include",
      signal: ac.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream, application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    if (err && err.name === "AbortError") throw new Error(t("coach_openai_timeout"));
    throw new Error(t("coach_openai_network_err"));
  } finally {
    clearTimeout(timer);
  }
  const ct = (res.headers.get("Content-Type") || "").toLowerCase();
  if (res.ok && ct.includes("text/event-stream") && payload.stream && res.body && typeof res.body.getReader === "function") {
    try {
      return await consumeHostedCoachSse(res, onDelta);
    } catch (err) {
      throw err && err.message ? err : new Error(t("coach_error_generic"));
    }
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || t("coach_error_generic"));
  }
  return String(data.answer || "").trim();
}
