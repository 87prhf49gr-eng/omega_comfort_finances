#!/usr/bin/env node

import fs from "fs";
import path from "path";
import crypto from "crypto";

const cwd = process.cwd();
const DATA_DIR = path.resolve(process.env.COMFORT_DATA_DIR || path.join(cwd, "data"));
const OUT_DIR = path.join(cwd, "logs");

const ARGS = new Set(process.argv.slice(2));
const isDryRun = ARGS.has("--dry-run") || !ARGS.has("--apply");

const files = {
  betaUsers: path.join(DATA_DIR, "beta-users.json"),
  sessions: path.join(DATA_DIR, "beta-sessions.json"),
  waitlist: path.join(DATA_DIR, "waitlist.json"),
  subscriptions: path.join(DATA_DIR, "subscriptions.json"),
  pushSubscriptions: path.join(DATA_DIR, "push-subscriptions.json")
};

function readJson(filePath, fallback = []) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function toId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function esc(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeUsers(input) {
  const seen = new Set();
  const rows = [];
  for (const row of Array.isArray(input) ? input : []) {
    if (!row || typeof row !== "object") continue;
    const username = String(row.username || "").trim().toLowerCase();
    if (!username || seen.has(username)) continue;
    seen.add(username);
    rows.push({
      id: String(row.id || toId("user")),
      username_normalized: username,
      display_name: String(row.displayName || "Beta"),
      slot: row.slot ? String(row.slot) : null,
      pin_salt: String(row.pinSalt || ""),
      pin_hash: String(row.pinHash || ""),
      active: row.active === false ? 0 : 1,
      created_at: String(row.createdAt || nowIso()),
      updated_at: String(row.updatedAt || nowIso())
    });
  }
  return rows;
}

function normalizeSessions(input) {
  const seen = new Set();
  const rows = [];
  for (const row of Array.isArray(input) ? input : []) {
    if (!row || typeof row !== "object") continue;
    const tokenHash = String(row.tokenHash || "").trim();
    if (!tokenHash || seen.has(tokenHash)) continue;
    seen.add(tokenHash);
    rows.push({
      id: String(row.id || toId("session")),
      kind: row.kind === "onboarding" ? "onboarding" : "beta",
      token_hash: tokenHash,
      user_id: row.userId ? String(row.userId) : null,
      onboarding_profile_json:
        row.profile && typeof row.profile === "object"
          ? JSON.stringify(row.profile)
          : null,
      created_at: String(row.createdAt || nowIso()),
      updated_at: String(row.updatedAt || nowIso()),
      expires_at: String(row.expiresAt || nowIso())
    });
  }
  return rows;
}

function normalizeWaitlist(input) {
  const seen = new Set();
  const rows = [];
  for (const row of Array.isArray(input) ? input : []) {
    const email = String(row?.email || "").trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    rows.push({
      id: toId("waitlist"),
      email_normalized: email,
      source: String(row?.source || "landing"),
      created_at: String(row?.at || nowIso())
    });
  }
  return rows;
}

function normalizeSubscriptions(input) {
  const seen = new Set();
  const rows = [];
  for (const row of Array.isArray(input) ? input : []) {
    const email = String(row?.email || "").trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    rows.push({
      id: toId("sub"),
      email_normalized: email,
      subscription_id: row.subscriptionId ? String(row.subscriptionId) : null,
      customer_id: row.customerId ? String(row.customerId) : null,
      variant_id: row.variantId ? String(row.variantId) : null,
      plan: row.plan ? String(row.plan) : null,
      status: String(row.status || "unknown"),
      renews_at: row.renewsAt ? String(row.renewsAt) : null,
      last_event_name: row.lastEvent ? String(row.lastEvent) : null,
      created_at: String(row.createdAt || nowIso()),
      updated_at: String(row.updatedAt || nowIso())
    });
  }
  return rows;
}

function normalizePush(input) {
  const seen = new Set();
  const rows = [];
  for (const row of Array.isArray(input) ? input : []) {
    const ownerKey = String(row?.ownerKey || "").trim();
    const endpoint = String(row?.subscription?.endpoint || "").trim();
    if (!ownerKey || !endpoint) continue;
    const dedupe = `${ownerKey}::${endpoint}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    rows.push({
      id: String(row.id || toId("push")),
      owner_key: ownerKey,
      session_kind: row.sessionKind === "onboarding" ? "onboarding" : "beta",
      beta_user_id: row.betaUserId ? String(row.betaUserId) : null,
      onboarding_profile_id: row.onboardingProfileId
        ? String(row.onboardingProfileId)
        : null,
      endpoint,
      subscription_json: JSON.stringify(row.subscription || {}),
      reminders_json: JSON.stringify(
        Array.isArray(row.reminders) ? row.reminders : []
      ),
      sent_json: JSON.stringify(row.sent && typeof row.sent === "object" ? row.sent : {}),
      user_agent: row.userAgent ? String(row.userAgent) : null,
      created_at: String(row.createdAt || nowIso()),
      updated_at: String(row.updatedAt || nowIso())
    });
  }
  return rows;
}

function toInsertSql(table, rows) {
  if (!rows.length) return [];
  return rows.map((row) => {
    const cols = Object.keys(row);
    const values = cols.map((c) => esc(row[c]));
    return `INSERT OR IGNORE INTO ${table} (${cols.join(", ")}) VALUES (${values.join(", ")});`;
  });
}

const users = normalizeUsers(readJson(files.betaUsers, []));
const sessions = normalizeSessions(readJson(files.sessions, []));
const waitlist = normalizeWaitlist(readJson(files.waitlist, []));
const subscriptions = normalizeSubscriptions(readJson(files.subscriptions, []));
const pushRegs = normalizePush(readJson(files.pushSubscriptions, []));

const sql = [
  "-- Generated by migrate-json-to-db.mjs",
  "-- Idempotent import statements (SQLite syntax)",
  ...toInsertSql("users", users),
  ...toInsertSql("sessions", sessions),
  ...toInsertSql("waitlist_entries", waitlist),
  ...toInsertSql("subscriptions", subscriptions),
  ...toInsertSql("push_registrations", pushRegs),
  ""
].join("\n");

fs.mkdirSync(OUT_DIR, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const sqlPath = path.join(OUT_DIR, `migration-import-${timestamp}.sql`);
const reportPath = path.join(OUT_DIR, `migration-report-${timestamp}.json`);
fs.writeFileSync(sqlPath, sql, "utf8");

const report = {
  dryRun: isDryRun,
  dataDir: DATA_DIR,
  generatedAt: new Date().toISOString(),
  files,
  counts: {
    users: users.length,
    sessions: sessions.length,
    waitlist: waitlist.length,
    subscriptions: subscriptions.length,
    pushRegistrations: pushRegs.length
  },
  sqlPath
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (isDryRun) {
  console.log("[migrate:json-to-db] DRY RUN complete.");
  console.log(`[migrate:json-to-db] Report: ${reportPath}`);
  console.log(`[migrate:json-to-db] SQL: ${sqlPath}`);
  process.exit(0);
}

console.log("[migrate:json-to-db] Apply mode selected.");
console.log(
  "This script currently generates idempotent SQL + report. Execute SQL against your DB in deployment pipeline."
);
console.log(`[migrate:json-to-db] Report: ${reportPath}`);
console.log(`[migrate:json-to-db] SQL: ${sqlPath}`);
