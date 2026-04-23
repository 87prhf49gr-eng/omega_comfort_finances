/* Comfort Ledger coach module (Hito D phase 4) */

const COACH_PREFS_KEY = "comfort_coach_prefs_v1";
const COACH_OPENAI_SYSTEM =
  "You are Comfort Ledger's personal finance coach. You talk to someone stressed about money. Use the numbers they share (income, expenses, debt, cash, goals) to answer precisely — no platitudes. Be practical, short, and kind. Never ask for card numbers or passwords. Reply in the same language as the latest USER_QUESTION block; if ambiguous, follow the uiLanguage hint (es/en/zh).";

function setupCoachSettingsModal() {
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
    overlay.classList.remove("comfort-beta-overlay--hidden");
    overlay.setAttribute("aria-hidden", "false");
    setTimeout(() => (form?.elements?.coachMode?.focus?.() ?? null), 30);
  };
  const closeModal = () => {
    overlay.classList.add("comfort-beta-overlay--hidden");
    overlay.setAttribute("aria-hidden", "true");
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
  try {
    const raw = localStorage.getItem(COACH_PREFS_KEY);
    if (!raw) return { mode: "local", apiKey: "", model: "gpt-4o-mini" };
    const parsed = JSON.parse(raw);
    return {
      mode: parsed.mode === "openai" ? "openai" : "local",
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      model: typeof parsed.model === "string" && parsed.model.length < 80 ? parsed.model : "gpt-4o-mini"
    };
  } catch {
    return { mode: "local", apiKey: "", model: "gpt-4o-mini" };
  }
}

function saveCoachPrefs(prefs) {
  try {
    localStorage.setItem(
      COACH_PREFS_KEY,
      JSON.stringify({
        mode: prefs.mode === "openai" ? "openai" : "local",
        apiKey: String(prefs.apiKey || "").trim(),
        model: String(prefs.model || "gpt-4o-mini")
      })
    );
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

async function comfortCoachAskOpenAIDirect(text, snap, prefs) {
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
    messages: [
      { role: "system", content: COACH_OPENAI_SYSTEM },
      { role: "user", content: `CONTEXT:\n${contextBlock}\n\nUSER_QUESTION:\n${text}` }
    ]
  };

  let response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });
  } catch (err) {
    throw new Error(t("coach_openai_network_err"));
  }
  if (!response.ok) {
    if (response.status === 401) throw new Error(t("coach_openai_key_invalid"));
    if (response.status === 429) throw new Error(t("coach_openai_rate_limit"));
    if (response.status >= 500) throw new Error(t("coach_openai_server_err"));
    throw new Error(`OpenAI ${response.status}`);
  }
  const json = await response.json().catch(() => ({}));
  const answer = json?.choices?.[0]?.message?.content;
  if (!answer) throw new Error(t("coach_openai_empty"));
  return String(answer).trim();
}

async function comfortCoachAskOpenAI(text, snap) {
  const incomeRef = Math.max(snap.income, 1);
  const goals = (state.savingsGoals || []).map((g) => ({
    label: String(g.label || "").slice(0, 48),
    target: Number(g.targetAmount) || 0,
    months: Number(g.months) || 0
  }));
  const cardRow = (state.debts || []).find((d) => d && d.debtType === "card");
  const profile = getStoredProfile();
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
    viewerFocus: profile?.focus || ""
  };
  const res = await fetch("/api/ai-coach", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || t("coach_error_generic"));
  }
  return String(data.answer || "").trim();
}
