/* Comfort Ledger post-dash bindings module (Hito D phase 4) */

function comfortWirePostDashOnce() {
  if (window.__comfortPostDashWireRan) {
    return;
  }
  window.__comfortPostDashWireRan = true;

  const utilPanel = document.getElementById("utilityBillsPanel");
  const subPanel = document.getElementById("subscriptionsPanel");
  const budgetPanel = document.getElementById("budgetsPanel");

  const safeRenderAfterPostDashMutation = () => {
    try {
      renderAll();
    } catch {
      try {
        renderUtilityBills();
        renderSubscriptions();
        renderBudgets();
        renderWeeklyCheckIn();
        updatePostDashSummaries();
        saveState(state);
      } catch {
        /* ignore */
      }
    }
  };

  const clickTarget = (ev) => {
    const raw = ev.target;
    return raw && raw.nodeType === 1 ? raw : raw?.parentElement;
  };

  utilPanel?.addEventListener(
    "click",
    (ev) => {
      const t = clickTarget(ev);
      if (!t || typeof t.closest !== "function" || !utilPanel.contains(t)) {
        return;
      }
      const utilList = utilPanel.querySelector("#utilityBillsList");
      const inList = utilList && utilList.contains(t);

      if (inList) {
        const cancelBtn = t.closest("[data-cancel-utility]");
        if (cancelBtn) {
          ev.preventDefault();
          ev.stopPropagation();
          const cancelId = cancelBtn.getAttribute("data-cancel-utility");
          const bill = (state.utilityBills || []).find((x) => x.id === cancelId);
          if (bill) bill.cancelled = true;
          safeRenderAfterPostDashMutation();
          return;
        }
        const uncancelBtn = t.closest("[data-uncancel-utility]");
        if (uncancelBtn) {
          ev.preventDefault();
          ev.stopPropagation();
          const uncancelId = uncancelBtn.getAttribute("data-uncancel-utility");
          const bill = (state.utilityBills || []).find((x) => x.id === uncancelId);
          if (bill) bill.cancelled = false;
          safeRenderAfterPostDashMutation();
          return;
        }
        const remBtn = t.closest("[data-remove-utility]");
        if (remBtn) {
          ev.preventDefault();
          ev.stopPropagation();
          const rem = remBtn.getAttribute("data-remove-utility");
          if (!rem || !(state.utilityBills || []).some((x) => x.id === rem)) {
            return;
          }
          comfortStripLedgerHashIfRowRemoved("utility", rem);
          state.utilityBills = (state.utilityBills || []).filter((x) => x.id !== rem);
          safeRenderAfterPostDashMutation();
        }
        return;
      }

      const add = t.closest("[data-comfort-add='utility']");
      if (!add || !utilPanel.contains(add)) {
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      if (!Array.isArray(state.utilityBills)) {
        state.utilityBills = [];
      }
      state.utilityBills.unshift(
        normalizeUtilityBill({
          id: createId("util"),
          categoryKey: "rent",
          label: "",
          amount: 0,
          date: formatDateInput(),
          dayOfMonth: 1,
          payUrl: "",
          cancelled: false
        })
      );
      safeRenderAfterPostDashMutation();
    },
    true
  );

  subPanel?.addEventListener(
    "click",
    (ev) => {
      const t = clickTarget(ev);
      if (!t || typeof t.closest !== "function" || !subPanel.contains(t)) {
        return;
      }
      const subList = subPanel.querySelector("#subscriptionsList");
      const inList = subList && subList.contains(t);

      if (inList) {
        const cancelBtn = t.closest("[data-cancel-sub]");
        if (cancelBtn) {
          ev.preventDefault();
          ev.stopPropagation();
          const cancelId = cancelBtn.getAttribute("data-cancel-sub");
          const s = (state.subscriptions || []).find((x) => x.id === cancelId);
          if (s) s.cancelled = true;
          safeRenderAfterPostDashMutation();
          return;
        }
        const uncancelBtn = t.closest("[data-uncancel-sub]");
        if (uncancelBtn) {
          ev.preventDefault();
          ev.stopPropagation();
          const uncancelId = uncancelBtn.getAttribute("data-uncancel-sub");
          const s = (state.subscriptions || []).find((x) => x.id === uncancelId);
          if (s) s.cancelled = false;
          safeRenderAfterPostDashMutation();
          return;
        }
        const remBtn = t.closest("[data-remove-sub]");
        if (remBtn) {
          ev.preventDefault();
          ev.stopPropagation();
          const rem = remBtn.getAttribute("data-remove-sub");
          if (!rem || !(state.subscriptions || []).some((x) => x.id === rem)) {
            return;
          }
          comfortStripLedgerHashIfRowRemoved("subscription", rem);
          state.subscriptions = (state.subscriptions || []).filter((x) => x.id !== rem);
          safeRenderAfterPostDashMutation();
        }
        return;
      }

      const add = t.closest("[data-comfort-add='subscription']");
      if (!add || !subPanel.contains(add)) {
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      if (!Array.isArray(state.subscriptions)) {
        state.subscriptions = [];
      }
      state.subscriptions.unshift(
        normalizeSubscription({
          id: createId("subp"),
          serviceKey: "netflix",
          customLabel: "",
          customUnsubUrl: "",
          cadence: "monthly",
          amount: 0,
          dayOfMonth: 1,
          cancelled: false
        })
      );
      safeRenderAfterPostDashMutation();
    },
    true
  );

  budgetPanel?.addEventListener(
    "click",
    (ev) => {
      const t = clickTarget(ev);
      if (!t || typeof t.closest !== "function" || !budgetPanel.contains(t)) {
        return;
      }
      const budgetList = budgetPanel.querySelector("#budgetsList");
      const inList = budgetList && budgetList.contains(t);
      if (inList) {
        const remBtn = t.closest("[data-remove-budget]");
        if (remBtn) {
          ev.preventDefault();
          ev.stopPropagation();
          const rem = remBtn.getAttribute("data-remove-budget");
          if (!rem || !(state.budgets || []).some((x) => x.id === rem)) return;
          state.budgets = (state.budgets || []).filter((x) => x.id !== rem);
          safeRenderAfterPostDashMutation();
        }
        return;
      }
      const add = t.closest("[data-comfort-add='budget']");
      if (!add || !budgetPanel.contains(add)) {
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      if (!Array.isArray(state.budgets)) state.budgets = [];
      state.budgets.unshift(
        normalizeBudget({
          id: createId("bg"),
          category: "Otros",
          monthly: 0
        })
      );
      safeRenderAfterPostDashMutation();
    },
    true
  );
}

