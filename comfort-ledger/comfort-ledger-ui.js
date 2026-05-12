/* Comfort Ledger extracted domain module (Hito D phase 3) */

function syncLiquidityFromState() {
  if (!els.liquidSavings) {
    return;
  }
  els.liquidSavings.value = state.liquidSavings ?? "";
}

function renderChartsAndHealth() {
  const snap = compute(state);
  renderHealth(snap);
  renderDonut(snap);
  renderBarCompare(snap);
  renderCadence(state, snap);
  renderCardDebtChart(snap);
  renderTacticalDash(snap);
  saveState(state);
  return snap;
}

function renderAll() {
  syncLiquidityFromState();
  sortSavingsGoalsNewestFirstInPlace(state.savingsGoals);
  renderChartsAndHealth();
  renderIncomeLines();
  renderExpenses();
  renderDebts();
  renderGoals();
  renderUtilityBills();
  renderSubscriptions();
  renderBudgets();
  updateRecurringNotifyUi();
  renderTodayBanner();
  renderWeeklyCheckIn();
  // Keep reminders fresh after state reloads/mutations, not only on interval ticks.
  processRecurringReminders();
  // Budget alerts piggy-back on current Notification permission + hosted push if configured.
  checkBudgetAlerts();
}
