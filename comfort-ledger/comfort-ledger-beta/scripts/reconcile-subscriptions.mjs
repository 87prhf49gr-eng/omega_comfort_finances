#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const lemon = require("../lemonsqueezy.js");

const args = new Set(process.argv.slice(2));
const isApply = args.has("--apply");
const isDryRun = !isApply;

const cwd = process.cwd();
const DATA_DIR = path.resolve(process.env.COMFORT_DATA_DIR || path.join(cwd, "data"));
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "subscriptions.json");
const LOG_DIR = path.join(cwd, "logs");

function readSubscriptions() {
  try {
    const rows = JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, "utf8"));
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function writeSubscriptions(rows) {
  fs.mkdirSync(path.dirname(SUBSCRIPTIONS_FILE), { recursive: true });
  fs.writeFileSync(SUBSCRIPTIONS_FILE, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
}

async function main() {
  if (!lemon.isConfigured()) {
    console.error("[reconcile:subscriptions] LemonSqueezy is not configured.");
    process.exit(1);
  }

  const rows = readSubscriptions();
  const report = {
    dryRun: isDryRun,
    startedAt: new Date().toISOString(),
    totalRows: rows.length,
    checked: 0,
    skippedNoSubscriptionId: 0,
    updated: 0,
    unchanged: 0,
    failed: 0,
    changes: [],
    errors: []
  };

  for (const row of rows) {
    const subscriptionId = String(row?.subscriptionId || "").trim();
    if (!subscriptionId) {
      report.skippedNoSubscriptionId += 1;
      continue;
    }

    report.checked += 1;
    const snapshot = await lemon.getSubscriptionSnapshot(subscriptionId);
    if (!snapshot || snapshot.error) {
      report.failed += 1;
      report.errors.push({
        subscriptionId,
        email: String(row?.email || ""),
        error: snapshot && snapshot.error ? String(snapshot.error) : "Unknown error"
      });
      continue;
    }

    const next = {
      ...row,
      subscriptionId: snapshot.subscriptionId || subscriptionId,
      customerId: snapshot.customerId || row.customerId || "",
      variantId: snapshot.variantId || row.variantId || "",
      plan: snapshot.plan || row.plan || "monthly",
      status: snapshot.status || row.status || "unknown",
      renewsAt:
        snapshot.renewsAt !== undefined ? snapshot.renewsAt : row.renewsAt || null,
      updatedAt: new Date().toISOString()
    };

    const changed =
      next.subscriptionId !== row.subscriptionId ||
      next.customerId !== row.customerId ||
      next.variantId !== row.variantId ||
      next.plan !== row.plan ||
      next.status !== row.status ||
      String(next.renewsAt || "") !== String(row.renewsAt || "");

    if (!changed) {
      report.unchanged += 1;
      continue;
    }

    report.updated += 1;
    report.changes.push({
      email: String(row?.email || ""),
      subscriptionId,
      before: {
        status: row.status,
        plan: row.plan,
        renewsAt: row.renewsAt
      },
      after: {
        status: next.status,
        plan: next.plan,
        renewsAt: next.renewsAt
      }
    });

    if (isApply) {
      Object.assign(row, next);
    }
  }

  if (isApply) {
    writeSubscriptions(rows);
  }

  report.finishedAt = new Date().toISOString();
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(LOG_DIR, `subscription-reconcile-${stamp}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    `[reconcile:subscriptions] ${isDryRun ? "DRY RUN" : "APPLY"} complete. checked=${report.checked} updated=${report.updated} unchanged=${report.unchanged} failed=${report.failed}`
  );
  console.log(`[reconcile:subscriptions] Report: ${reportPath}`);
}

main().catch((error) => {
  console.error("[reconcile:subscriptions] Fatal error:", error && error.message ? error.message : error);
  process.exit(1);
});
