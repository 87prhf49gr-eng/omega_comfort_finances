/* Comfort Ledger extracted domain module (Hito D phase 3) */

function comfortStripLedgerHashIfRowRemoved(kind, removedId) {
  if (!removedId) {
    return;
  }
  try {
    const h = String(location.hash || "");
    if (!h || h === "#") {
      return;
    }
    let rawId = "";
    if (kind === "utility") {
      if (h.startsWith("#utility-")) {
        rawId = h.slice("#utility-".length);
      } else if (h.startsWith("#recurring-")) {
        rawId = h.slice("#recurring-".length);
      } else {
        return;
      }
    } else if (h.startsWith("#sub-")) {
      rawId = h.slice("#sub-".length);
    } else {
      return;
    }
    let decoded = rawId;
    try {
      decoded = decodeURIComponent(rawId);
    } catch {
      decoded = rawId;
    }
    if (decoded !== removedId) {
      return;
    }
    const base = `${location.pathname}${location.search}`;
    if (history.replaceState) {
      history.replaceState(null, "", base || ".");
    } else {
      location.hash = "";
    }
  } catch {
    /* ignore */
  }
}

function handleRecurringHash() {
  const h = location.hash || "";
  let id;
  let prefix;
  if (h.startsWith("#utility-")) {
    prefix = "utility-";
    id = h.slice("#utility-".length);
  } else if (h.startsWith("#sub-")) {
    prefix = "sub-";
    id = h.slice("#sub-".length);
  } else if (h.startsWith("#recurring-")) {
    prefix = "utility-";
    id = h.slice("#recurring-".length);
  } else return;
  requestAnimationFrame(() => {
    const row = document.getElementById(`${prefix}${id}`);
    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      row.classList.add("post-dash-highlight");
      setTimeout(() => row.classList.remove("post-dash-highlight"), 2200);
    }
  });
}

function collectUpcomingRecurringRows(now = new Date()) {
  const due = [];
  const soon = [];
  const push = (row, prefix, label, url) => {
    if (!row || row.cancelled) return;
    const when = nextRecurringDueDate(row.dayOfMonth, now);
    const days = calendarDaysBetween(now, when);
    if (days === 0) due.push({ row, prefix, label, url, when, days });
    else if (days >= 1 && days <= 3) soon.push({ row, prefix, label, url, when, days });
  };
  for (const bill of state.utilityBills || []) {
    const label = `${utilityCategoryLabel(bill.categoryKey)}${bill.label ? ` — ${bill.label}` : ""}`;
    push(bill, "u:", label, resolveUtilityNotifyUrl(bill));
  }
  for (const s of state.subscriptions || []) {
    push(s, "s:", subscriptionDisplayName(s), resolveSubscriptionNotifyUrl(s));
  }
  const sortByDate = (a, b) => a.when - b.when;
  due.sort(sortByDate);
  soon.sort(sortByDate);
  return { due, soon };
}

function renderTodayBanner() {
  const host = els.postDashToday;
  if (!host) return;
  const { due, soon } = collectUpcomingRecurringRows(new Date());
  const active = due.length ? due : soon;
  if (!active.length) {
    host.hidden = true;
    host.removeAttribute("data-tone");
    host.innerHTML = "";
    return;
  }
  const isDue = due.length > 0;
  host.hidden = false;
  host.setAttribute("data-tone", isDue ? "due" : "soon");
  const title = t(isDue ? "today_banner_due_title" : "today_banner_soon_title");
  const maxVisible = 3;
  const items = active.slice(0, maxVisible);
  const extra = active.length - items.length;
  const itemsHtml = items
    .map((entry) => {
      const amt = entry.row.amount > 0 ? fmtMoney(entry.row.amount) : "";
      const dateStr = formatRecurringShortDate(entry.when);
      return `<li><strong>${escapeHtml(entry.label)}</strong><span>${escapeHtml(amt ? `${amt} · ${dateStr}` : dateStr)}</span></li>`;
    })
    .join("");
  const moreKey = isDue ? "today_banner_due_more" : "today_banner_soon_more";
  const more = extra > 0 ? `<li><span>${escapeHtml(tFill(moreKey, { n: String(extra) }))}</span></li>` : "";
  host.innerHTML = `<p class="post-dash-today-title">${escapeHtml(title)}</p><ul class="post-dash-today-list">${itemsHtml}${more}</ul>`;
}
