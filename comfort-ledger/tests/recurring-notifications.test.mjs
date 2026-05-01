import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");

function makeStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    key: (index) => Array.from(data.keys())[index] || null,
    get length() {
      return data.size;
    }
  };
}

function makeHost() {
  return {
    hidden: true,
    innerHTML: "",
    attrs: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    setAttribute(name, value) {
      this.attrs[name] = String(value);
    },
    removeAttribute(name) {
      delete this.attrs[name];
    }
  };
}

async function makeHarness() {
  const localStorage = makeStorage();
  const host = makeHost();
  const saved = makeHost();
  const document = {
    readyState: "loading",
    documentElement: { lang: "" },
    body: { classList: { toggle() {} } },
    title: "",
    hidden: false,
    addEventListener() {},
    querySelector() {
      return null;
    },
    getElementById(id) {
      if (id === "postDashToday") return host;
      if (id === "comfortSavedIndicator") return saved;
      return null;
    }
  };
  const context = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    requestAnimationFrame: (fn) => fn(),
    location: {
      href: "https://comfort.test/app",
      origin: "https://comfort.test",
      pathname: "/app",
      search: "",
      protocol: "https:",
      hash: ""
    },
    history: { replaceState() {} },
    localStorage,
    sessionStorage: makeStorage(),
    document,
    navigator: {
      language: "es-MX",
      serviceWorker: {
        ready: Promise.resolve({
          showNotification() {}
        })
      }
    },
    window: null,
    URL
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);

  for (const file of [
    "comfort-ledger-core.js",
    "comfort-ledger-reminders.js",
    "comfort-ledger-notifications.js"
  ]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  }
  vm.runInContext(
    `
      globalThis.__comfortTest = {
        setState(next) { state = next; },
        getState() { return state; },
        setEls(next) { els = next; },
        getNotifyLog() { return loadNotifyLog(); },
        saveState,
        renderTodayBanner,
        processRecurringReminders,
        buildHostedPushReminders,
        nextRecurringDueDate,
        toISODateLocal
      };
    `,
    context
  );
  context.__comfortTest.setEls({ postDashToday: host });
  return { context, api: context.__comfortTest, host, localStorage };
}

function setSystemNotifications(context, { permission = "granted", fail = false } = {}) {
  const delivered = [];
  function Notification(title, opts) {
    if (fail) throw new Error("notification failed");
    delivered.push({ title, opts, fallback: true });
    return { close() {}, onclick: null };
  }
  Notification.permission = permission;
  Notification.requestPermission = async () => permission;
  context.Notification = Notification;
  context.navigator.serviceWorker.ready = Promise.resolve({
    showNotification(title, opts) {
      if (fail) throw new Error("service worker notification failed");
      delivered.push({ title, opts, fallback: false });
    }
  });
  return delivered;
}

const today = new Date();
const todayDay = today.getDate();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

{
  const { api, host } = await makeHarness();
  api.setState({
    utilityBills: [
      {
        id: "rent",
        categoryKey: "rent",
        label: "Apartamento",
        amount: 1200,
        dayOfMonth: todayDay,
        payUrl: "",
        cancelled: false
      }
    ],
    subscriptions: []
  });

  api.renderTodayBanner();
  assert.equal(host.hidden, false);
  assert.equal(host.attrs["data-tone"], "due");
  assert.match(host.innerHTML, /Hoy toca pagar/);
  assert.match(host.innerHTML, /Apartamento/);
  assert.match(host.innerHTML, /\$1,200/);
}

{
  const { api, host } = await makeHarness();
  api.setState({
    utilityBills: [
      {
        id: "rent",
        categoryKey: "rent",
        label: "Apartamento",
        amount: 1200,
        dayOfMonth: tomorrow.getDate(),
        payUrl: "",
        cancelled: false
      }
    ],
    subscriptions: []
  });

  api.renderTodayBanner();
  assert.equal(host.attrs["data-tone"], "soon");

  api.getState().utilityBills[0].dayOfMonth = todayDay;
  api.saveState(api.getState());
  assert.equal(host.attrs["data-tone"], "due");
  assert.match(host.innerHTML, /Hoy toca pagar/);
}

{
  const { context, api } = await makeHarness();
  const delivered = setSystemNotifications(context);
  api.setState({
    utilityBills: [
      {
        id: "rent",
        categoryKey: "rent",
        label: "Apartamento",
        amount: 1200,
        dayOfMonth: todayDay,
        payUrl: "",
        cancelled: false
      }
    ],
    subscriptions: []
  });

  await api.processRecurringReminders();
  assert.equal(delivered.length, 1);
  assert.equal(Object.keys(api.getNotifyLog()).length, 1);

  await api.processRecurringReminders();
  assert.equal(delivered.length, 1, "the same due reminder should not be sent twice");
}

{
  const { context, api } = await makeHarness();
  setSystemNotifications(context, { fail: true });
  api.setState({
    utilityBills: [
      {
        id: "rent",
        categoryKey: "rent",
        label: "Apartamento",
        amount: 1200,
        dayOfMonth: todayDay,
        payUrl: "",
        cancelled: false
      }
    ],
    subscriptions: []
  });

  await api.processRecurringReminders();
  assert.equal(Object.keys(api.getNotifyLog()).length, 0, "failed delivery must stay retryable");
}

{
  const { api } = await makeHarness();
  api.setState({
    utilityBills: [
      {
        id: "rent",
        categoryKey: "rent",
        label: "Apartamento",
        amount: 1200,
        dayOfMonth: todayDay,
        payUrl: "https://pay.example/rent",
        cancelled: false
      }
    ],
    subscriptions: [
      {
        id: "stream",
        serviceKey: "netflix",
        customLabel: "",
        customUnsubUrl: "",
        cadence: "monthly",
        amount: 19.99,
        dayOfMonth: todayDay,
        cancelled: false
      }
    ]
  });
  const reminders = api.buildHostedPushReminders(new Date());
  assert.ok(reminders.some((r) => r.key.startsWith("u:rent:due:")));
  assert.ok(reminders.some((r) => r.key.startsWith("s:stream:due:")));
  assert.ok(reminders.every((r) => Number.isFinite(r.sendAtMs)));
}

console.log("Recurring notification tests passed");
