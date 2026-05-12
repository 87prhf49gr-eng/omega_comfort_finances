/* Comfort Ledger extracted modules (Hito D) */

function lifestyleLabel(key) {
  const k = `onboarding_lifestyle_${key}`;
  const out = t(k);
  return out === k ? t("onboarding_lifestyle_simple") : out;
}

function hasMeaningfulFinanceData() {
  if (!state || typeof state !== "object") return false;
  if ((state.incomeLines || []).some((x) => Math.abs(Number(x.amount) || 0) > 0.0001 || String(x.label || "").trim())) return true;
  if ((state.expenses || []).some((x) => Math.abs(Number(x.amount) || 0) > 0.0001 || String(x.label || "").trim())) return true;
  if ((state.debts || []).some((x) => Math.abs(Number(x.balance) || 0) > 0.0001 || Math.abs(Number(x.minPayment) || 0) > 0.0001 || String(x.label || "").trim())) return true;
  if ((state.utilityBills || []).length || (state.subscriptions || []).length || (state.budgets || []).length || (state.savingsGoals || []).length) return true;
  if (Math.abs(Number(state.liquidSavings) || 0) > 0.0001) return true;
  return false;
}

/**
 * Lifestyle starter rows. User-visible labels use labelKey (resolved via t() in normalize* and on locale change).
 * Budget/expense category values stay as canonical Spanish keys (EXPENSE_CATEGORIES); UI shows categoryDisplayLabel.
 */
function buildLifestyleTemplates() {
  return {
    payroll: {
      incomeLines: [{ labelKey: "lifestyle_income_payroll_main", amount: 0, cadence: "monthly" }],
      utilityBills: [
        { categoryKey: "rent", labelKey: "lifestyle_utility_rent", amount: 0, dayOfMonth: 1 },
        { categoryKey: "electric", labelKey: "lifestyle_utility_electric", amount: 0, dayOfMonth: 8 },
        { categoryKey: "internet", labelKey: "lifestyle_utility_internet", amount: 0, dayOfMonth: 12 }
      ],
      budgets: [
        { category: "Supermercado", monthly: 0 },
        { category: "Comida fuera", monthly: 0 },
        { category: "Transporte publico", monthly: 0 }
      ]
    },
    freelance: {
      incomeLines: [
        { labelKey: "lifestyle_income_client_a", amount: 0, cadence: "monthly" },
        { labelKey: "lifestyle_income_client_b", amount: 0, cadence: "monthly" }
      ],
      expenses: [
        { category: "Impuestos y honorarios", labelKey: "lifestyle_expense_taxes", amount: 0, cadence: "monthly" }
      ],
      budgets: [
        { category: "Trabajo y oficina", monthly: 0 },
        { category: "Impuestos y honorarios", monthly: 0 },
        { category: "Internet y telefono", monthly: 0 }
      ]
    },
    family: {
      incomeLines: [{ labelKey: "lifestyle_income_household", amount: 0, cadence: "monthly" }],
      expenses: [
        { category: "Ninos y familia", labelKey: "lifestyle_expense_family", amount: 0, cadence: "monthly" },
        { category: "Supermercado", labelKey: "lifestyle_expense_grocery_weekly", amount: 0, cadence: "weekly" }
      ],
      utilityBills: [
        { categoryKey: "rent", labelKey: "lifestyle_utility_mortgage", amount: 0, dayOfMonth: 1 },
        { categoryKey: "insurance", labelKey: "lifestyle_utility_insurance", amount: 0, dayOfMonth: 5 }
      ],
      budgets: [
        { category: "Ninos y familia", monthly: 0 },
        { category: "Supermercado", monthly: 0 },
        { category: "Luz gas agua", monthly: 0 }
      ]
    },
    student: {
      incomeLines: [{ labelKey: "lifestyle_income_student_base", amount: 0, cadence: "monthly" }],
      expenses: [
        { category: "Educacion y cursos", labelKey: "lifestyle_expense_school", amount: 0, cadence: "monthly" },
        { category: "Transporte publico", labelKey: "lifestyle_expense_transport", amount: 0, cadence: "monthly" }
      ],
      budgets: [
        { category: "Supermercado", monthly: 0 },
        { category: "Transporte publico", monthly: 0 },
        { category: "Cafe y snacks", monthly: 0 }
      ]
    },
    simple: {
      incomeLines: [{ labelKey: "lifestyle_income_simple_main", amount: 0, cadence: "monthly" }],
      budgets: [
        { category: "Supermercado", monthly: 0 },
        { category: "Comida fuera", monthly: 0 }
      ]
    }
  };
}

function applyLifestyleTemplateIfEmpty(lifestyleKey) {
  if (hasMeaningfulFinanceData()) return false;
  const templates = buildLifestyleTemplates();
  const tpl = templates[lifestyleKey] || templates.simple;
  const mkIncome = (x) => normalizeIncomeLine({ id: createId("inc"), date: formatDateInput(), ...x });
  const mkExpense = (x) => normalizeExpense({ id: createId("e"), ...x });
  const mkUtility = (x) =>
    normalizeUtilityBill({
      id: createId("util"),
      date: formatDateInput(),
      payUrl: "",
      cancelled: false,
      ...x
    });
  const mkBudget = (x) => normalizeBudget({ id: createId("bg"), ...x });
  state.incomeLines = (tpl.incomeLines || []).map(mkIncome);
  state.expenses = (tpl.expenses || []).map(mkExpense);
  state.utilityBills = (tpl.utilityBills || []).map(mkUtility);
  state.subscriptions = [];
  state.budgets = (tpl.budgets || []).map(mkBudget);
  saveState(state);
  return true;
}

function expenseMonthlyByCategory() {
  const map = new Map();
  for (const e of state.expenses || []) {
    const cat = EXPENSE_CATEGORY_SET.has(e.category) ? e.category : "Otros";
    map.set(cat, (map.get(cat) || 0) + monthlyFromExpense(e));
  }
  return map;
}

function renderBudgets() {
  const list = els.budgetsList;
  const summary = els.budgetsSummary;
  if (!list || !summary) return;
  if (!Array.isArray(state.budgets)) state.budgets = [];
  state.budgets = state.budgets.map(normalizeBudget);
  const byCat = expenseMonthlyByCategory();
  if (!state.budgets.length) {
    list.innerHTML = `<div class="post-dash-budget-empty">${escapeHtml(t("budgets_empty"))}</div>`;
    summary.textContent = t("budgets_summary_empty");
    return;
  }
  let totalBudget = 0;
  let totalSpent = 0;
  let overCount = 0;
  const rows = state.budgets
    .map((b) => {
      const spent = Math.max(0, Number(byCat.get(b.category) || 0));
      const budget = Math.max(0, Number(b.monthly) || 0);
      totalBudget += budget;
      totalSpent += spent;
      const ratio = budget > 0 ? spent / budget : 0;
      const pct = budget > 0 ? Math.min(180, Math.round(ratio * 100)) : 0;
      const tone = ratio >= 1 ? "over" : ratio >= 0.8 ? "warn" : "ok";
      if (ratio >= 1) overCount += 1;
      return `
        <article class="post-dash-budget-row" id="budget-${escapeHtml(b.id)}">
          <div class="post-dash-budget-head">
            <select data-field="category">
              ${EXPENSE_CATEGORIES.map(
                (cat) =>
                  `<option value="${escapeHtml(cat)}" ${cat === b.category ? "selected" : ""}>${escapeHtml(
                    categoryLabel(cat)
                  )}</option>`
              ).join("")}
            </select>
            <div class="post-dash-budget-amt">
              <span>${escapeHtml(t("budgets_monthly"))}</span>
              <input type="number" step="0.01" min="0" data-field="monthly" value="${Number(b.monthly) || 0}" />
            </div>
          </div>
          <button type="button" class="post-dash-row-delete" data-remove-budget="${escapeHtml(b.id)}">x</button>
          <div class="post-dash-budget-meta">
            <span>${escapeHtml(tFill("budgets_meta_spent", { spent: fmtMoney(spent) }))}</span>
            <strong>${escapeHtml(tFill("budgets_meta_ratio", { n: String(pct) }))}</strong>
          </div>
          <div class="post-dash-budget-bar" data-tone="${tone}"><i style="width:${Math.min(100, pct)}%"></i></div>
        </article>
      `;
    })
    .join("");
  list.innerHTML = rows;
  const ratio = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const summaryText =
    totalBudget > 0
      ? tFill("budgets_summary_main", {
          spent: fmtMoney(totalSpent),
          budget: fmtMoney(totalBudget),
          ratio: String(ratio),
          over: String(overCount)
        })
      : t("budgets_summary_empty");
  summary.textContent = summaryText;
}

function syncBudgetRowFromDom(rowEl, b) {
  const cat = rowEl.querySelector('[data-field="category"]');
  if (cat && EXPENSE_CATEGORY_SET.has(cat.value)) b.category = cat.value;
  const monthly = rowEl.querySelector('[data-field="monthly"]');
  if (monthly) b.monthly = Math.max(0, coerceParsedNumber(monthly.value));
}

function budgetAlertKey(monthKey, budgetId, level) {
  return `budget:${monthKey}:${budgetId}:${level}`;
}

function checkBudgetAlerts(now = new Date()) {
  if (!Array.isArray(state.budgets) || !state.budgets.length) return;
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const byCat = expenseMonthlyByCategory();
  const log = loadNotifyLog();
  let touched = false;
  for (const b of state.budgets) {
    const budget = Math.max(0, Number(b.monthly) || 0);
    if (budget <= 0) continue;
    const spent = Math.max(0, Number(byCat.get(b.category) || 0));
    const ratio = spent / budget;
    const openUrl = `${appPageUrlForDeepLink()}#budget-${b.id}`;
    const label = categoryLabel(b.category);
    if (ratio >= 1) {
      const key = budgetAlertKey(monthKey, b.id, "100");
      if (!log[key]) {
        showRecurringSystemNotification(
          t("budget_alert_over_title"),
          tFill("budget_alert_over_body", { label, spent: fmtMoney(spent), budget: fmtMoney(budget) }),
          openUrl,
          `comfort-budget-over-${b.id}-${monthKey}`
        );
        log[key] = 1;
        touched = true;
      }
    } else if (ratio >= 0.8) {
      const key = budgetAlertKey(monthKey, b.id, "80");
      if (!log[key]) {
        showRecurringSystemNotification(
          t("budget_alert_warn_title"),
          tFill("budget_alert_warn_body", { label, spent: fmtMoney(spent), budget: fmtMoney(budget) }),
          openUrl,
          `comfort-budget-warn-${b.id}-${monthKey}`
        );
        log[key] = 1;
        touched = true;
      }
    }
  }
  if (touched) saveNotifyLog(log);
}

function weekKeyFromDate(now = new Date()) {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function loadWeeklyDismiss() {
  try {
    const c =
      typeof window !== "undefined" && window.__COMFORT_WEEKLY_DISMISS_CACHE && typeof window.__COMFORT_WEEKLY_DISMISS_CACHE === "object"
        ? window.__COMFORT_WEEKLY_DISMISS_CACHE
        : null;
    if (c) return { ...c };
    return JSON.parse(localStorage.getItem("comfort_weekly_dismiss_v1") || "{}") || {};
  } catch {
    return {};
  }
}

function saveWeeklyDismiss(obj) {
  try {
    const next = obj && typeof obj === "object" ? obj : {};
    if (typeof window !== "undefined") {
      window.__COMFORT_WEEKLY_DISMISS_CACHE = { ...next };
      if (typeof window.comfortPersistWeeklyDismissDebounced === "function") {
        window.comfortPersistWeeklyDismissDebounced();
        return;
      }
    }
    localStorage.setItem("comfort_weekly_dismiss_v1", JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/* ── Monthly history + sparklines (Hito D phase 4) ──────── */

function currentMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function saveMonthlySnapshot(now = new Date()) {
  if (!Array.isArray(state.monthlyHistory)) state.monthlyHistory = [];
  const monthKey = currentMonthKey(now);
  const snap = compute(state);
  const entry = {
    month: monthKey,
    income: snap.income,
    expenses: snap.monthlyExpenses,
    debt: snap.totalDebt,
    savings: snap.savings,
    netWorth: snap.netWorth,
    freeAfter: snap.freeAfter
  };
  const idx = state.monthlyHistory.findIndex((h) => h.month === monthKey);
  if (idx >= 0) {
    state.monthlyHistory[idx] = entry;
  } else {
    state.monthlyHistory.push(entry);
  }
  state.monthlyHistory.sort((a, b) => a.month.localeCompare(b.month));
  if (state.monthlyHistory.length > 13) {
    state.monthlyHistory = state.monthlyHistory.slice(-13);
  }
  saveState(state);
}

function buildSparklineSvg(values, color) {
  if (!values || values.length < 2) return `<svg width="80" height="28" viewBox="0 0 80 28" xmlns="http://www.w3.org/2000/svg"></svg>`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 80, h = 28, pad = 3;
  const pts = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
      const y = (h - pad) - ((v - min) / range) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return `<svg width="80" height="28" viewBox="0 0 80 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

function renderMonthlySparklines() {
  const host = document.getElementById("monthlySparklinesPanel");
  if (!host) return;
  if (!Array.isArray(state.monthlyHistory)) state.monthlyHistory = [];
  const history = state.monthlyHistory.slice(-6);
  if (history.length < 2) {
    host.hidden = true;
    return;
  }
  host.hidden = false;

  const nwValues = history.map((h) => Number(h.netWorth) || 0);
  const freeValues = history.map((h) => Number(h.freeAfter) || 0);
  const months = history.map((h) => h.month.slice(5)); // MM

  const nwLast = nwValues[nwValues.length - 1];
  const nwFirst = nwValues[0];
  const nwDelta = nwLast - nwFirst;
  const nwDeltaSign = nwDelta >= 0 ? "+" : "";
  const nwColor = nwDelta >= 0 ? "#2dd4bf" : "#f87171";
  const freeLast = freeValues[freeValues.length - 1];
  const freeColor = "#60a5fa";

  const title =
    UI_LOCALE === "en" ? "Monthly trend" : UI_LOCALE === "zh" ? "月度趋势" : "Tendencia mensual";
  const nwLabel =
    UI_LOCALE === "en" ? "Net worth" : UI_LOCALE === "zh" ? "净资产" : "Patrimonio neto";
  const freeLabel =
    UI_LOCALE === "en" ? "Free cash" : UI_LOCALE === "zh" ? "自由现金" : "Efectivo libre";
  const rangeLabel = `${months[0]} → ${months[months.length - 1]}`;

  host.innerHTML = `
    <h3 class="sparklines-title">${escapeHtml(title)}</h3>
    <div class="sparklines-grid">
      <div class="sparkline-item">
        <span class="sparkline-label">${escapeHtml(nwLabel)}</span>
        ${buildSparklineSvg(nwValues, nwColor)}
        <span class="sparkline-delta ${nwDelta >= 0 ? "sp-pos" : "sp-neg"}">${nwDeltaSign}${escapeHtml(fmtMoney(nwDelta))}</span>
      </div>
      <div class="sparkline-item">
        <span class="sparkline-label">${escapeHtml(freeLabel)}</span>
        ${buildSparklineSvg(freeValues, freeColor)}
        <span class="sparkline-delta">${escapeHtml(fmtMoney(freeLast))}</span>
      </div>
    </div>
    <p class="sparklines-range">${escapeHtml(rangeLabel)}</p>
  `;
}

function renderWeeklyCheckIn(now = new Date()) {
  const host = els.postDashWeekly;
  if (!host) return;
  const dismiss = loadWeeklyDismiss();
  const wk = weekKeyFromDate(now);
  if (dismiss[wk]) {
    host.hidden = true;
    host.innerHTML = "";
    return;
  }
  const snap = compute(state);
  const top = (snap.expenseTop || []).slice(0, 3);
  const topHtml = top
    .map((x) => `<li><strong>${escapeHtml(categoryLabel(x.category))}</strong> ${escapeHtml(fmtMoney(x.amount))}</li>`)
    .join("");
  host.hidden = false;
  host.innerHTML = `
    <div class="post-dash-weekly-head">
      <p class="post-dash-weekly-title">${escapeHtml(t("weekly_title"))}</p>
      <button type="button" class="post-dash-weekly-dismiss" data-weekly-dismiss>${escapeHtml(t("weekly_dismiss"))}</button>
    </div>
    <dl class="post-dash-weekly-grid">
      <div><dt>${escapeHtml(t("weekly_income"))}</dt><dd>${escapeHtml(fmtMoney(snap.income))}</dd></div>
      <div><dt>${escapeHtml(t("weekly_expenses"))}</dt><dd>${escapeHtml(fmtMoney(snap.monthlyExpenses))}</dd></div>
      <div><dt>${escapeHtml(t("weekly_free"))}</dt><dd>${escapeHtml(fmtMoney(snap.freeAfterGoals))}</dd></div>
    </dl>
    <ul class="post-dash-weekly-top">${topHtml || `<li>${escapeHtml(t("weekly_top_empty"))}</li>`}</ul>
  `;
}
