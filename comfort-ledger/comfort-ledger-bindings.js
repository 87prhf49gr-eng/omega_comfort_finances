/* Comfort Ledger core bindings module (next plan step) */

function bind() {
  if (!els.liquidSavings || !els.addExpenseBtn || !els.donutFlow || !els.utilityBillsList || !els.subscriptionsList) {
    return;
  }
  const onSavings = () => {
    const v = parseNum(els.liquidSavings.value);
    state.liquidSavings = Number.isFinite(v) ? v : 0;
    renderChartsAndHealth();
  };
  els.liquidSavings?.addEventListener("input", onSavings);
  els.liquidSavings?.addEventListener("blur", onSavings);

  const addIncomeRow = () => {
    state.incomeLines.unshift({
      id: createId("inc"),
      label: t("new_income_label"),
      amount: 0,
      date: formatDateInput(),
      cadence: "monthly"
    });
    renderAll();
    saveState();
    setTimeout(() => {
      const firstLabel = document.querySelector('.income-row input[data-field="label"]');
      firstLabel?.focus();
      firstLabel?.select?.();
    }, 40);
  };
  els.addIncomeBtn?.addEventListener("click", addIncomeRow);

  els.incomeList?.addEventListener("input", (ev) => {
    const row = ev.target.closest(".income-row");
    if (!row) return;
    const line = state.incomeLines.find((x) => x.id === row.dataset.id);
    if (!line) return;
    const field = ev.target.dataset.field;
    if (!field) return;
    if (field === "amount") line.amount = coerceParsedNumber(ev.target.value);
    else if (field === "label") line.label = ev.target.value;
    renderChartsAndHealth();
  });
  els.incomeList?.addEventListener("change", (ev) => {
    if (ev.target.dataset.field !== "date") return;
    const row = ev.target.closest(".income-row");
    if (!row) return;
    const line = state.incomeLines.find((x) => x.id === row.dataset.id);
    if (!line) return;
    line.date = sanitizeISODate(ev.target.value);
    renderChartsAndHealth();
  });
  els.incomeList?.addEventListener("click", (ev) => {
    const id = ev.target.getAttribute?.("data-remove-income");
    if (!id) return;
    const removed = state.incomeLines.find((x) => x.id === id);
    state.incomeLines = state.incomeLines.filter((x) => x.id !== id);
    renderAll();
    saveState();
    if (removed) scheduleUndo({ kind: "income", item: removed });
  });
  els.incomeList?.addEventListener("change", (ev) => {
    if (ev.target.dataset.field !== "cadence") return;
    const row = ev.target.closest(".income-row");
    if (!row) return;
    const line = state.incomeLines.find((x) => x.id === row.dataset.id);
    if (!line) return;
    line.cadence = ev.target.value;
    renderChartsAndHealth();
    saveState();
  });

  const addExpenseRow = () => {
    state.expenses.unshift({
      id: createId("e"),
      category: "Otros",
      label: t("new_expense_label"),
      amount: 0,
      cadence: "monthly"
    });
    renderAll();
    saveState();
    setTimeout(() => {
      const firstLabel = document.querySelector('.expense-row input[data-field="label"]');
      firstLabel?.focus();
      firstLabel?.select?.();
    }, 40);
  };
  els.addExpenseBtn?.addEventListener("click", addExpenseRow);

  const addDebtRow = () => {
    state.debts.unshift({
      id: createId("d"),
      debtType: "other",
      label: t("new_debt_label"),
      balance: 0,
      minPayment: 0
    });
    renderAll();
    saveState();
    setTimeout(() => {
      const firstLabel = document.querySelector('.debt-row input[data-field="label"]');
      firstLabel?.focus();
      firstLabel?.select?.();
    }, 40);
  };
  els.addDebtBtn?.addEventListener("click", addDebtRow);

  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest?.("[data-empty-add]");
    if (!btn) return;
    const kind = btn.getAttribute("data-empty-add");
    if (kind === "income") addIncomeRow();
    else if (kind === "expense") addExpenseRow();
    else if (kind === "debt") addDebtRow();
  });

  if (!state.savingsGoals) state.savingsGoals = [];
  els.addGoalBtn?.addEventListener("click", () => {
    const arr = state.savingsGoals;
    const mx = arr.reduce((m, x) => Math.max(m, typeof x.createdAt === "number" && Number.isFinite(x.createdAt) ? x.createdAt : 0), 0);
    arr.unshift({
      id: createId("goal"),
      label: t("new_goal_label"),
      targetAmount: 0,
      months: 12,
      createdAt: Math.max(Date.now(), mx + 1)
    });
    renderAll();
    requestAnimationFrame(() => {
      if (els.goalsScrollWrap) els.goalsScrollWrap.scrollTop = 0;
    });
  });
  els.goalsList?.addEventListener("input", (ev) => {
    const row = ev.target.closest(".goal-row");
    if (!row) return;
    const g = state.savingsGoals.find((x) => x.id === row.dataset.id);
    if (!g) return;
    const field = ev.target.dataset.field;
    if (!field) return;
    if (field === "label") g.label = ev.target.value;
    else if (field === "targetAmount") g.targetAmount = coerceParsedNumber(ev.target.value);
    else if (field === "months") {
      const raw = ev.target.value.trim();
      if (raw !== "") {
        const m = Math.floor(Number(raw) || 1);
        g.months = Math.max(1, Math.min(600, m));
      }
    }
    renderChartsAndHealth();
    const apartEl = row.querySelector(".goal-apart strong");
    if (apartEl) apartEl.textContent = fmtMoney(goalMonthlyApartado(g));
    const first = state.savingsGoals[0];
    if (first && g.id === first.id) updateGoalsSummary();
  });
  els.goalsList?.addEventListener("change", (ev) => {
    const row = ev.target.closest?.(".goal-row");
    if (!row || !ev.target.matches?.("input[data-field]")) return;
    const first = state.savingsGoals[0];
    if (first && row.dataset.id === first.id) updateGoalsSummary();
  });
  els.goalsList?.addEventListener("click", (ev) => {
    const id = ev.target.getAttribute?.("data-remove-goal");
    if (!id) return;
    state.savingsGoals = state.savingsGoals.filter((x) => x.id !== id);
    renderAll();
  });

  els.expenseList?.addEventListener("input", (ev) => {
    const row = ev.target.closest(".expense-row");
    if (!row) return;
    const exp = state.expenses.find((x) => x.id === row.dataset.id);
    if (!exp) return;
    const field = ev.target.dataset.field;
    if (!field) return;
    if (field === "amount") exp.amount = coerceParsedNumber(ev.target.value);
    else if (field === "label") exp.label = ev.target.value;
    renderChartsAndHealth();
  });
  els.expenseList?.addEventListener("change", (ev) => {
    const row = ev.target.closest(".expense-row");
    if (!row) return;
    const exp = state.expenses.find((x) => x.id === row.dataset.id);
    if (!exp) return;
    const field = ev.target.dataset.field;
    if (field === "cadence") exp.cadence = normalizeCadence(ev.target.value);
    if (field === "category") exp.category = EXPENSE_CATEGORIES.includes(ev.target.value) ? ev.target.value : "Otros";
    renderChartsAndHealth();
  });
  els.expenseList?.addEventListener("click", (ev) => {
    const id = ev.target.getAttribute?.("data-remove-expense");
    if (!id) return;
    const removed = state.expenses.find((x) => x.id === id);
    state.expenses = state.expenses.filter((x) => x.id !== id);
    renderAll();
    saveState();
    if (removed) scheduleUndo({ kind: "expense", item: removed });
  });

  els.debtList?.addEventListener("input", (ev) => {
    const row = ev.target.closest(".debt-row");
    if (!row) return;
    const d = state.debts.find((x) => x.id === row.dataset.id);
    if (!d) return;
    const field = ev.target.dataset.field;
    if (!field) return;
    if (field === "balance" || field === "minPayment") d[field] = coerceParsedNumber(ev.target.value);
    else if (field === "label") d.label = ev.target.value;
    renderChartsAndHealth();
  });
  els.debtList?.addEventListener("change", (ev) => {
    const row = ev.target.closest(".debt-row");
    if (!row) return;
    const d = state.debts.find((x) => x.id === row.dataset.id);
    if (!d) return;
    if (ev.target.dataset.field === "debtType") {
      d.debtType = ev.target.value === "card" ? "card" : "other";
      renderChartsAndHealth();
    }
  });
  els.debtList?.addEventListener("click", (ev) => {
    const id = ev.target.getAttribute?.("data-remove-debt");
    if (!id) return;
    const removed = state.debts.find((x) => x.id === id);
    state.debts = state.debts.filter((x) => x.id !== id);
    renderAll();
    saveState();
    if (removed) scheduleUndo({ kind: "debt", item: removed });
  });

  if (!state.utilityBills) state.utilityBills = [];
  if (!state.subscriptions) state.subscriptions = [];
  if (!state.budgets) state.budgets = [];
  els.recurringNotifyBtn?.addEventListener("click", async () => {
    if (!("Notification" in window)) return;
    await Notification.requestPermission();
    updateRecurringNotifyUi();
    processRecurringReminders();
    scheduleHostedPushSync();
  });

  els.utilityBillsList?.addEventListener("input", (ev) => {
    const row = ev.target.closest(".post-dash-utility-row");
    if (!row) return;
    const bill = state.utilityBills.find((x) => x.id === row.dataset.id);
    if (!bill) return;
    syncUtilityRowFromDom(row, bill);
    saveState(state);
    patchUtilityRowMeta(row, bill);
    updatePostDashSummaries();
  });
  els.utilityBillsList?.addEventListener("change", (ev) => {
    const row = ev.target.closest(".post-dash-utility-row");
    if (!row) return;
    const bill = state.utilityBills.find((x) => x.id === row.dataset.id);
    if (!bill) return;
    syncUtilityRowFromDom(row, bill);
    saveState(state);
    renderUtilityBills();
  });

  els.subscriptionsList?.addEventListener("input", (ev) => {
    const row = ev.target.closest(".post-dash-sub-row");
    if (!row) return;
    const s = state.subscriptions.find((x) => x.id === row.dataset.id);
    if (!s) return;
    syncSubRowFromDom(row, s);
    saveState(state);
    patchSubRowMeta(row, s);
    updatePostDashSummaries();
  });
  els.subscriptionsList?.addEventListener("change", (ev) => {
    const row = ev.target.closest(".post-dash-sub-row");
    if (!row) return;
    const s = state.subscriptions.find((x) => x.id === row.dataset.id);
    if (!s) return;
    syncSubRowFromDom(row, s);
    saveState(state);
    renderSubscriptions();
  });

  els.budgetsList?.addEventListener("input", (ev) => {
    const row = ev.target.closest(".post-dash-budget-row");
    if (!row) return;
    const b = state.budgets.find((x) => x.id === String(row.id || "").replace(/^budget-/, ""));
    if (!b) return;
    syncBudgetRowFromDom(row, b);
    renderBudgets();
    saveState(state);
  });
  els.budgetsList?.addEventListener("change", (ev) => {
    const row = ev.target.closest(".post-dash-budget-row");
    if (!row) return;
    const b = state.budgets.find((x) => x.id === String(row.id || "").replace(/^budget-/, ""));
    if (!b) return;
    syncBudgetRowFromDom(row, b);
    renderBudgets();
    saveState(state);
  });

  els.postDashWeekly?.addEventListener("click", (ev) => {
    const btn = ev.target.closest?.("[data-weekly-dismiss]");
    if (!btn) return;
    const now = new Date();
    const wk = weekKeyFromDate(now);
    const dismiss = loadWeeklyDismiss();
    dismiss[wk] = Date.now();
    saveWeeklyDismiss(dismiss);
    renderWeeklyCheckIn(now);
  });

  els.coachForm?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const text = els.coachInput.value.trim();
    if (!text) return;
    const snap = renderChartsAndHealth();
    const userDiv = document.createElement("div");
    userDiv.className = "coach-msg user";
    userDiv.textContent = text;
    const botDiv = document.createElement("div");
    botDiv.className = "coach-msg bot";
    botDiv.textContent = "";
    els.coachThread.append(userDiv, botDiv);
    els.coachThread.scrollTop = els.coachThread.scrollHeight;
    els.coachInput.value = "";

    const prefs = loadCoachPrefs();
    const userWantsOpenAI = prefs.mode === "openai" && prefs.apiKey;
    const hostedOpenAI = window.__COMFORT_HOSTED && window.__COMFORT_AI_COACH;

    if (userWantsOpenAI) {
      els.coachStatus.textContent = t("coach_loading");
      void comfortCoachAskOpenAIDirect(text, snap, prefs)
        .then((answer) => {
          botDiv.textContent = answer;
          els.coachStatus.textContent = t("coach_status_direct");
        })
        .catch((err) => {
          botDiv.textContent = coachReply(text, snap);
          els.coachStatus.textContent = `${String(err?.message || t("coach_error_generic"))} · ${t("coach_status")}`;
        })
        .finally(() => {
          els.coachThread.scrollTop = els.coachThread.scrollHeight;
        });
      return;
    }

    if (hostedOpenAI) {
      els.coachStatus.textContent = t("coach_loading");
      void comfortCoachAskOpenAI(text, snap)
        .then((answer) => {
          botDiv.textContent = answer;
          els.coachStatus.textContent = t("coach_status_cloud");
        })
        .catch((err) => {
          botDiv.textContent = coachReply(text, snap);
          els.coachStatus.textContent = String(err?.message || t("coach_error_generic"));
        })
        .finally(() => {
          els.coachThread.scrollTop = els.coachThread.scrollHeight;
        });
      return;
    }

    botDiv.textContent = coachReply(text, snap);
    els.coachStatus.textContent = t("coach_status");
  });

  setupCoachSettingsModal();

  document.querySelectorAll("[data-set-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const loc = btn.getAttribute("data-set-lang");
      setLocale(loc);
    });
  });

  els.profileEditBtn?.addEventListener("click", () => {
    void showOnboardingUntilDone(getStoredProfile());
  });

  els.comfortExportBtn?.addEventListener("click", () => {
    comfortSetBackupStatus("", null);
    try {
      comfortExportBackup();
    } catch {
      comfortSetBackupStatus(t("backup_import_err_read"), "err");
    }
  });

  els.comfortImportBtn?.addEventListener("click", () => {
    comfortSetBackupStatus("", null);
    els.comfortImportFile?.click();
  });

  els.comfortImportFile?.addEventListener("change", (ev) => {
    const input = ev.target;
    const file = input.files && input.files[0];
    input.value = "";
    if (!file) return;
    if (!window.confirm(t("backup_import_confirm"))) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const next = comfortParseBackupText(text);
        if (!next) {
          comfortSetBackupStatus(t("backup_import_err_invalid"), "err");
          return;
        }
        Object.assign(state, next);
        saveState(state);
        syncLiquidityFromState();
        renderAll();
        comfortSetBackupStatus(t("backup_import_ok"), "ok");
      } catch {
        comfortSetBackupStatus(t("backup_import_err_invalid"), "err");
      }
    };
    reader.onerror = () => comfortSetBackupStatus(t("backup_import_err_read"), "err");
    reader.readAsText(file, "utf-8");
  });
}

