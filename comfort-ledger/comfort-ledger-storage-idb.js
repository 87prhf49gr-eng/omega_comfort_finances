/**
 * IndexedDB KV store for Comfort Ledger persistent data (audit #29).
 * Falls back to localStorage when IDB open fails / unavailable.
 */

(function comfortLedgerStorageIdb() {
  const DB_NAME = "comfort_ledger_app";
  const DB_VERSION = 1;
  const STORE = "kv";

  /** Must match STORAGE_KEY / NOTIFY_LOG_KEY in comfort-ledger-core.js and weekly key in comfort-ledger-modules.js */
  const KEYS = {
    STATE: "comfort_ledger_v1",
    NOTIFY: "comfort_ledger_notify_v1",
    WEEKLY: "comfort_weekly_dismiss_v1"
  };

  let dbPromise = null;
  let idbBroken = false;
  let saveStateTimer = null;
  let saveNotifyTimer = null;
  let saveWeeklyTimer = null;

  function openDb() {
    if (idbBroken || typeof indexedDB === "undefined") return Promise.resolve(null);
    if (!dbPromise) {
      dbPromise = new Promise((resolve) => {
        try {
          const req = indexedDB.open(DB_NAME, DB_VERSION);
          req.onerror = () => {
            idbBroken = true;
            dbPromise = Promise.resolve(null);
            resolve(null);
          };
          req.onsuccess = () => resolve(req.result);
          req.onupgradeneeded = () => {
            req.result.createObjectStore(STORE);
          };
        } catch {
          idbBroken = true;
          dbPromise = Promise.resolve(null);
          resolve(null);
        }
      });
    }
    return dbPromise;
  }

  async function idbGet(db, key) {
    if (!db) return undefined;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, "readonly");
        const q = tx.objectStore(STORE).get(key);
        q.onsuccess = () => resolve(q.result === undefined ? undefined : q.result);
        q.onerror = () => resolve(undefined);
      } catch {
        resolve(undefined);
      }
    });
  }

  async function idbPut(db, key, value) {
    if (!db || idbBroken) throw new Error("idb_unavailable");
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error("idb_write"));
        tx.objectStore(STORE).put(value, key);
      } catch (e) {
        reject(e);
      }
    });
  }

  function lsGet(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function lsSet(key, val) {
    try {
      localStorage.setItem(key, val);
    } catch {
      /* ignore */
    }
  }

  function lsRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  /** In-memory authoritative copies after init — core/modules read these. */
  window.__COMFORT_NOTIFY_LOG_CACHE = {};
  window.__COMFORT_WEEKLY_DISMISS_CACHE = {};
  /** Raw JSON string last persisted for migration / export logic (optional use). */
  window.__COMFORT_STATE_RAW_PENDING = "";

  window.comfortIndexedDbBootstrapKeys = KEYS;

  async function readOrMigrateString(db, key) {
    const fromIdb = await idbGet(db, key);
    if (typeof fromIdb === "string" && fromIdb.length) return fromIdb;
    const fromLs = lsGet(key);
    if (fromLs !== null && fromLs !== "") {
      if (db && !idbBroken) {
        try {
          await idbPut(db, key, fromLs);
        } catch {
          /* keep LS until next save */
        }
      }
      return fromLs;
    }
    return null;
  }

  /** Call once at app start — before reading state / notify weekly. */
  window.comfortStorageInit = async function comfortStorageInit() {
    const db = await openDb();

    let rawState = await readOrMigrateString(db, KEYS.STATE);
    window.__COMFORT_STATE_RAW_PENDING = rawState || "";

    const notifyRaw = await readOrMigrateString(db, KEYS.NOTIFY);
    try {
      window.__COMFORT_NOTIFY_LOG_CACHE =
        notifyRaw && notifyRaw.trim() ? JSON.parse(notifyRaw) : {};
      if (!window.__COMFORT_NOTIFY_LOG_CACHE || typeof window.__COMFORT_NOTIFY_LOG_CACHE !== "object") {
        window.__COMFORT_NOTIFY_LOG_CACHE = {};
      }
    } catch {
      window.__COMFORT_NOTIFY_LOG_CACHE = {};
    }

    const weeklyRaw = await readOrMigrateString(db, KEYS.WEEKLY);
    try {
      window.__COMFORT_WEEKLY_DISMISS_CACHE =
        weeklyRaw && weeklyRaw.trim() ? JSON.parse(weeklyRaw) : {};
      if (
        !window.__COMFORT_WEEKLY_DISMISS_CACHE ||
        typeof window.__COMFORT_WEEKLY_DISMISS_CACHE !== "object"
      ) {
        window.__COMFORT_WEEKLY_DISMISS_CACHE = {};
      }
    } catch {
      window.__COMFORT_WEEKLY_DISMISS_CACHE = {};
    }

    afterMigrateStripLsDuplicates(db);

    /** Debounced persistence for main ledger JSON */
    window.comfortPersistStateJsonDebounced = function comfortPersistStateJsonDebounced(json) {
      if (typeof json !== "string") return;
      window.__COMFORT_STATE_RAW_PENDING = json;
      if (idbBroken && !db) {
        lsSet(KEYS.STATE, json);
        return;
      }
      if (saveStateTimer) clearTimeout(saveStateTimer);
      saveStateTimer = setTimeout(() => {
        saveStateTimer = null;
        const payload = json;
        void persistStateNow(db, payload);
      }, 280);
    };

    /** Immediate write (purge / destructive). */
    window.comfortPersistStateJsonImmediate = async function comfortPersistStateJsonImmediate(json) {
      window.__COMFORT_STATE_RAW_PENDING = typeof json === "string" ? json : "";
      return persistStateNow(await openDb(), json);
    };

    /** Notify weekly mirrors */
    window.comfortPersistNotifyLogDebounced = function () {
      const j = JSON.stringify(window.__COMFORT_NOTIFY_LOG_CACHE || {});
      if (idbBroken) {
        lsSet(KEYS.NOTIFY, j);
        return;
      }
      if (saveNotifyTimer) clearTimeout(saveNotifyTimer);
      saveNotifyTimer = setTimeout(() => {
        saveNotifyTimer = null;
        void persistStringKey(KEYS.NOTIFY, j);
      }, 280);
    };

    window.comfortPersistWeeklyDismissDebounced = function () {
      const j = JSON.stringify(window.__COMFORT_WEEKLY_DISMISS_CACHE || {});
      if (idbBroken) {
        lsSet(KEYS.WEEKLY, j);
        return;
      }
      if (saveWeeklyTimer) clearTimeout(saveWeeklyTimer);
      saveWeeklyTimer = setTimeout(() => {
        saveWeeklyTimer = null;
        void persistStringKey(KEYS.WEEKLY, j);
      }, 280);
    };
  };

  function afterMigrateStripLsDuplicates(db) {
    /** Once IDB has a canonical copy we can drop LS keys that were migrated to reduce quota pressure. */
    if (!db || idbBroken) return;
    void (async () => {
      try {
        const okState = typeof (await idbGet(db, KEYS.STATE)) === "string";
        const okN = typeof (await idbGet(db, KEYS.NOTIFY)) === "string";
        const okW = typeof (await idbGet(db, KEYS.WEEKLY)) === "string";
        if (okState) lsRemove(KEYS.STATE);
        if (okN) lsRemove(KEYS.NOTIFY);
        if (okW) lsRemove(KEYS.WEEKLY);
      } catch {
        /* ignore */
      }
    })();
  }

  async function persistStateNow(db, json) {
    const s = typeof json === "string" ? json : "";
    try {
      if (idbBroken || !db) {
        lsSet(KEYS.STATE, s);
        return true;
      }
      await idbPut(db, KEYS.STATE, s);
      lsRemove(KEYS.STATE);
      return true;
    } catch (e) {
      console.warn("Comfort Ledger: state persist fallback to localStorage", e);
      idbBroken = true;
      lsSet(KEYS.STATE, s);
      return false;
    }
  }

  async function persistStringKey(key, value) {
    const db = await openDb();
    try {
      if (idbBroken || !db) {
        lsSet(key, value);
        return;
      }
      await idbPut(db, key, value);
      lsRemove(key);
    } catch (e) {
      console.warn("Comfort Ledger: KV fallback to localStorage", key, e);
      lsSet(key, value);
    }
  }

  /** Clear IndexedDB database + mirrored LS keys (#29 / privacy flush). Used by purgeComfortLocalData. */
  window.comfortStorageWipePersistedLedger = async function comfortStorageWipePersistedLedger() {
    lsRemove(KEYS.STATE);
    lsRemove(KEYS.NOTIFY);
    lsRemove(KEYS.WEEKLY);
    window.__COMFORT_NOTIFY_LOG_CACHE = {};
    window.__COMFORT_WEEKLY_DISMISS_CACHE = {};
    window.__COMFORT_STATE_RAW_PENDING = "";
    if (saveStateTimer) clearTimeout(saveStateTimer);
    saveStateTimer = null;
    if (saveNotifyTimer) clearTimeout(saveNotifyTimer);
    saveNotifyTimer = null;
    if (saveWeeklyTimer) clearTimeout(saveWeeklyTimer);
    saveWeeklyTimer = null;
    if (idbBroken) return true;
    const db = await openDb();
    if (!db) return true;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, "readwrite");
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.objectStore(STORE).clear();
      } catch {
        resolve(false);
      }
    });
  };
})();
