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

const LIFESTYLE_TEMPLATES = {
  payroll: {
    incomeLines: [{ label: "Nomina principal", amount: 0, cadence: "monthly" }],
    utilityBills: [
      { categoryKey: "rent", label: "Renta", amount: 0, dayOfMonth: 1 },
      { categoryKey: "electric", label: "Luz", amount: 0, dayOfMonth: 8 },
      { categoryKey: "internet", label: "Internet", amount: 0, dayOfMonth: 12 }
    ],
    budgets: [
      { category: "Supermercado", monthly: 0 },
      { category: "Comida fuera", monthly: 0 },
      { category: "Transporte publico", monthly: 0 }
    ]
  },
  freelance: {
    incomeLines: [
      { label: "Cliente A", amount: 0, cadence: "monthly" },
      { label: "Cliente B", amount: 0, cadence: "monthly" }
    ],
    expenses: [{ category: "Impuestos y honorarios", label: "Impuestos", amount: 0, cadence: "monthly" }],
    budgets: [
      { category: "Trabajo y oficina", monthly: 0 },
      { category: "Impuestos y honorarios", monthly: 0 },
      { category: "Internet y telefono", monthly: 0 }
    ]
  },
  family: {
    incomeLines: [{ label: "Ingreso hogar", amount: 0, cadence: "monthly" }],
    expenses: [
      { category: "Ninos y familia", label: "Gastos familiares", amount: 0, cadence: "monthly" },
      { category: "Supermercado", label: "Despensa", amount: 0, cadence: "weekly" }
    ],
    utilityBills: [
      { categoryKey: "rent", label: "Hipoteca / renta", amount: 0, dayOfMonth: 1 },
      { categoryKey: "insurance", label: "Seguro", amount: 0, dayOfMonth: 5 }
    ],
    budgets: [
      { category: "Ninos y familia", monthly: 0 },
      { category: "Supermercado", monthly: 0 },
      { category: "Luz gas agua", monthly: 0 }
    ]
  },
  student: {
    incomeLines: [{ label: "Ingreso base", amount: 0, cadence: "monthly" }],
    expenses: [
      { category: "Educacion y cursos", label: "Escuela / cursos", amount: 0, cadence: "monthly" },
      { category: "Transporte publico", label: "Transporte", amount: 0, cadence: "monthly" }
    ],
    budgets: [
      { category: "Supermercado", monthly: 0 },
      { category: "Transporte publico", monthly: 0 },
      { category: "Cafe y snacks", monthly: 0 }
    ]
  },
  simple: {
    incomeLines: [{ label: "Ingreso principal", amount: 0, cadence: "monthly" }],
    budgets: [
      { category: "Supermercado", monthly: 0 },
      { category: "Comida fuera", monthly: 0 }
    ]
  }
};

function applyLifestyleTemplateIfEmpty(lifestyleKey) {
  if (hasMeaningfulFinanceData()) return false;
  const tpl = LIFESTYLE_TEMPLATES[lifestyleKey] || LIFESTYLE_TEMPLATES.simple;
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
    const cat = EXPENSE_CATEGORIES.includes(e.category) ? e.category : "Otros";
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
  if (cat && EXPENSE_CATEGORIES.includes(cat.value)) b.category = cat.value;
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
    return JSON.parse(localStorage.getItem("comfort_weekly_dismiss_v1") || "{}") || {};
  } catch {
    return {};
  }
}

function saveWeeklyDismiss(obj) {
  try {
    localStorage.setItem("comfort_weekly_dismiss_v1", JSON.stringify(obj));
  } catch {
    /* ignore */
  }
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
