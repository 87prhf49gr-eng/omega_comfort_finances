const fs = require("fs");
const path = require("path");
const lockfile = require("proper-lockfile");

function createJsonRepository(config) {
  const DATA_DIR = path.resolve(config.dataDir);
  const FILES = {
    betaUsers: path.join(DATA_DIR, "beta-users.json"),
    sessions: path.join(DATA_DIR, "beta-sessions.json"),
    waitlist: path.join(DATA_DIR, "waitlist.json"),
    subscriptions: path.join(DATA_DIR, "subscriptions.json"),
    pushSubscriptions: path.join(DATA_DIR, "push-subscriptions.json"),
    webhookEvents: path.join(DATA_DIR, "webhook-events.json")
  };

  const writeChains = new Map();
  const FILE_LOCK_OPTIONS = Object.freeze({
    stale: 30000,
    retries: Object.freeze({ retries: 40, minTimeout: 15, maxTimeout: 900 }),
    realpath: false
  });

  function fileDiskLockDisabled() {
    const v = String(process.env.COMFORT_DISABLE_FILE_LOCK || "")
      .trim()
      .toLowerCase();
    return v === "1" || v === "true" || v === "yes";
  }

  function readJsonFile(filePath, fallback) {
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
      return fallback;
    }
  }

  function writeJsonFile(filePath, payload) {
    const directory = path.dirname(filePath);
    fs.mkdirSync(directory, { recursive: true });
    const tempFilePath = path.join(
      directory,
      `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`
    );
    fs.writeFileSync(tempFilePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    fs.renameSync(tempFilePath, filePath);
  }

  function runExclusiveFileTask(filePath, task) {
    const resolved = path.resolve(filePath);
    const prev = writeChains.get(resolved) || Promise.resolve();
    const run = prev.then(async () => {
      if (fileDiskLockDisabled()) {
        return task();
      }
      const release = await lockfile.lock(resolved, FILE_LOCK_OPTIONS);
      try {
        return await task();
      } finally {
        try {
          await release();
        } catch (releaseErr) {
          console.warn(
            `[Comfort] file lock release failed (${resolved}):`,
            releaseErr && releaseErr.message ? releaseErr.message : releaseErr
          );
        }
      }
    });
    writeChains.set(resolved, run.catch(() => {}));
    return run;
  }

  function listBetaUsers() {
    const parsed = readJsonFile(FILES.betaUsers, []);
    return Array.isArray(parsed)
      ? parsed.filter(
          (user) =>
            user &&
            typeof user === "object" &&
            user.active !== false &&
            user.username
        )
      : [];
  }

  function withSessions(mutator) {
    return runExclusiveFileTask(FILES.sessions, async () => {
      const parsed = readJsonFile(FILES.sessions, []);
      const sessions = Array.isArray(parsed)
        ? parsed.filter((session) => session && typeof session === "object")
        : [];
      const now = Date.now();
      const active = sessions.filter((session) => {
        const expiresAt = new Date(session.expiresAt || 0).getTime();
        return Number.isFinite(expiresAt) && expiresAt > now;
      });
      sessions.length = 0;
      sessions.push(...active);
      const result = await mutator(sessions);
      writeJsonFile(FILES.sessions, sessions);
      return result;
    });
  }

  function addWaitlist(email, source) {
    return runExclusiveFileTask(FILES.waitlist, () => {
      const list = readJsonFile(FILES.waitlist, []);
      const existing = Array.isArray(list) ? list : [];
      if (!existing.some((entry) => entry.email === email)) {
        existing.push({
          email,
          source: String(source || "landing"),
          at: new Date().toISOString()
        });
        writeJsonFile(FILES.waitlist, existing);
      }
    });
  }

  function listSubscriptions() {
    const list = readJsonFile(FILES.subscriptions, []);
    return Array.isArray(list) ? list : [];
  }

  function writeSubscriptions(list) {
    return runExclusiveFileTask(FILES.subscriptions, () => {
      writeJsonFile(FILES.subscriptions, list);
    });
  }

  function withSubscriptions(mutator) {
    return runExclusiveFileTask(FILES.subscriptions, async () => {
      const list = listSubscriptions();
      const result = await mutator(list);
      writeJsonFile(FILES.subscriptions, list);
      return result;
    });
  }

  function listPushRegistrations() {
    const list = readJsonFile(FILES.pushSubscriptions, []);
    return Array.isArray(list)
      ? list.filter((entry) => entry && typeof entry === "object")
      : [];
  }

  function withPushRegistrations(mutator) {
    return runExclusiveFileTask(FILES.pushSubscriptions, async () => {
      const list = listPushRegistrations();
      const result = await mutator(list);
      writeJsonFile(FILES.pushSubscriptions, list);
      return result;
    });
  }

  function listWebhookEvents() {
    const list = readJsonFile(FILES.webhookEvents, []);
    return Array.isArray(list)
      ? list.filter((entry) => entry && typeof entry === "object")
      : [];
  }

  function withWebhookEvents(mutator) {
    return runExclusiveFileTask(FILES.webhookEvents, async () => {
      const list = listWebhookEvents();
      const result = await mutator(list);
      writeJsonFile(FILES.webhookEvents, list);
      return result;
    });
  }

  return {
    files: FILES,
    listBetaUsers,
    withSessions,
    addWaitlist,
    listSubscriptions,
    writeSubscriptions,
    withSubscriptions,
    listPushRegistrations,
    withPushRegistrations,
    listWebhookEvents,
    withWebhookEvents
  };
}

module.exports = {
  createJsonRepository
};
