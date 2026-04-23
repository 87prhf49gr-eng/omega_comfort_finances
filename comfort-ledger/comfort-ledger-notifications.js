/* Comfort Ledger notifications + hosted push sync (Hito D phase 2) */

function updateRecurringNotifyUi() {
  const el = els.recurringNotifyStatus;
  const btn = els.recurringNotifyBtn;
  if (!el || !btn) return;
  if (!("Notification" in window)) {
    el.textContent = "";
    btn.disabled = true;
    return;
  }
  const p = Notification.permission;
  if (p === "granted") {
    el.textContent = t("recurring_notify_active");
    btn.textContent = t("recurring_notify_btn_granted");
    btn.disabled = true;
  } else if (p === "denied") {
    el.textContent = t("recurring_notify_denied");
    btn.disabled = true;
  } else {
    el.textContent = t("recurring_notify_default");
    btn.disabled = false;
  }
}

async function showRecurringSystemNotification(title, body, openUrl, tag) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  let iconUrl = "pwa-icons/icon-192.png";
  try {
    iconUrl = new URL("pwa-icons/icon-192.png", location.href).href;
  } catch {
    /* keep relative */
  }
  const opts = { body, tag, data: { url: openUrl }, icon: iconUrl, badge: iconUrl };
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, opts);
  } catch {
    try {
      const n = new Notification(title, opts);
      n.onclick = () => {
        window.focus();
        location.href = openUrl;
        n.close();
      };
    } catch {
      /* ignore */
    }
  }
}

function processRecurringReminders() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const log = loadNotifyLog();
  const now = new Date();
  let touched = false;
  const fireFor = (row, prefix, label, openUrl) => {
    const due = nextRecurringDueDate(row.dayOfMonth, now);
    const dueIso = toISODateLocal(due);
    const days = calendarDaysBetween(now, due);
    const amtStr = row.amount > 0 ? ` ${fmtMoney(row.amount)}` : "";
    const dateStr = formatRecurringShortDate(due);
    const beforeKey = `${prefix}${row.id}:before:${dueIso}`;
    const dueKey = `${prefix}${row.id}:due:${dueIso}`;
    // Aviso "faltan X días": ventana flexible 1..3 para no perderlo si el usuario no abre la app el día exacto.
    if (days >= 1 && days <= 3 && !log[beforeKey]) {
      const body = tFill("recurring_notif_before_body", { label, date: dateStr, amt: amtStr });
      showRecurringSystemNotification(
        t("recurring_notif_before_title"),
        body,
        openUrl,
        `comfort-${prefix}${row.id}-b-${dueIso}`
      );
      log[beforeKey] = 1;
      touched = true;
    }
    // Aviso del día de pago: dispara en cuanto se abre la app ese día, sin importar la hora.
    if (days === 0 && !log[dueKey]) {
      const body = tFill("recurring_notif_due_body", { label, date: dateStr, amt: amtStr });
      showRecurringSystemNotification(
        t("recurring_notif_due_title"),
        body,
        openUrl,
        `comfort-${prefix}${row.id}-d-${dueIso}`
      );
      log[dueKey] = 1;
      touched = true;
    }
  };
  for (const bill of (state.utilityBills || []).filter((b) => !b.cancelled)) {
    const lab = `${utilityCategoryLabel(bill.categoryKey)}${bill.label ? ` — ${bill.label}` : ""}`;
    fireFor(bill, "u:", lab, resolveUtilityNotifyUrl(bill));
  }
  for (const s of (state.subscriptions || []).filter((x) => !x.cancelled)) {
    const lab = subscriptionDisplayName(s);
    fireFor(s, "s:", lab, resolveSubscriptionNotifyUrl(s));
  }
  if (touched) saveNotifyLog(log);
}

function startRecurringReminders() {
  if (window.__comfortRecurringIv) clearInterval(window.__comfortRecurringIv);
  processRecurringReminders();
  window.__comfortRecurringIv = setInterval(processRecurringReminders, 45 * 60 * 1000);
  if (!window.__comfortRecurringVisBound) {
    window.__comfortRecurringVisBound = true;
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) processRecurringReminders();
    });
    // Extra wake/resume hooks: some browsers skip visibilitychange after sleep.
    window.addEventListener("focus", () => processRecurringReminders());
    window.addEventListener("pageshow", () => processRecurringReminders());
  }
  scheduleHostedPushSync();
}

// ---------- Web Push (cliente) ----------

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function buildHostedPushReminders(now = new Date()) {
  const out = [];
  const setAt9am = (d) => {
    const x = new Date(d);
    x.setHours(9, 0, 0, 0);
    return x.getTime();
  };
  const addOne = (row, prefix, label, openUrl) => {
    if (!row || row.cancelled) return;
    const due = nextRecurringDueDate(row.dayOfMonth, now);
    const dueIso = toISODateLocal(due);
    const amtStr = row.amount > 0 ? ` ${fmtMoney(row.amount)}` : "";
    const dateStr = formatRecurringShortDate(due);
    const before = new Date(due);
    before.setDate(before.getDate() - 3);
    const beforeMs = setAt9am(before);
    if (beforeMs > now.getTime() - 1000 * 60 * 60 * 24) {
      out.push({
        key: `${prefix}${row.id}:before:${dueIso}`,
        title: t("recurring_notif_before_title"),
        body: tFill("recurring_notif_before_body", { label, date: dateStr, amt: amtStr }),
        url: openUrl,
        tag: `comfort-${prefix}${row.id}-b-${dueIso}`,
        sendAtMs: beforeMs
      });
    }
    const dueMs = setAt9am(due);
    if (dueMs > now.getTime() - 1000 * 60 * 60 * 24) {
      out.push({
        key: `${prefix}${row.id}:due:${dueIso}`,
        title: t("recurring_notif_due_title"),
        body: tFill("recurring_notif_due_body", { label, date: dateStr, amt: amtStr }),
        url: openUrl,
        tag: `comfort-${prefix}${row.id}-d-${dueIso}`,
        sendAtMs: dueMs
      });
    }
  };
  for (const bill of state.utilityBills || []) {
    const label = `${utilityCategoryLabel(bill.categoryKey)}${bill.label ? ` — ${bill.label}` : ""}`;
    addOne(bill, "u:", label, resolveUtilityNotifyUrl(bill));
  }
  for (const s of state.subscriptions || []) {
    addOne(s, "s:", subscriptionDisplayName(s), resolveSubscriptionNotifyUrl(s));
  }
  return out;
}

async function syncHostedPushReminders() {
  if (!window.__COMFORT_HOSTED) return;
  if (!window.__COMFORT_PUSH_CONFIGURED) return;
  if (!window.__COMFORT_PUSH_VAPID_PUBLIC_KEY) return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  try {
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(window.__COMFORT_PUSH_VAPID_PUBLIC_KEY)
      });
    }
    const reminders = buildHostedPushReminders(new Date());
    const payload = {
      subscription: subscription.toJSON(),
      reminders
    };
    await fetch("/api/push/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn("Hosted push sync failed:", err);
  }
}

function scheduleHostedPushSync() {
  if (!window.__COMFORT_HOSTED || !window.__COMFORT_PUSH_CONFIGURED) return;
  if (window.__comfortPushSyncTimer) clearTimeout(window.__comfortPushSyncTimer);
  window.__comfortPushSyncTimer = setTimeout(() => {
    syncHostedPushReminders();
  }, 1200);
}
