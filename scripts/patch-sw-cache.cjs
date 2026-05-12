#!/usr/bin/env node
"use strict";

/**
 * Replaces CACHE_NAME in comfort-ledger-sw.js before deploy (#23 auditoría).
 * Prefer RELEASE_HASH or GIT_COMMIT / COMMIT_SHA; otherwise uses a timestamp.
 *
 *   RELEASE_HASH=abc123 node comfort-ledger/scripts/patch-sw-cache.cjs
 *   # from comfort-ledger-beta/
 *   npm run patch-sw-cache
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SW = path.join(ROOT, "comfort-ledger-sw.js");

function cacheSuffix() {
  const raw = String(
    process.env.RELEASE_HASH || process.env.GIT_COMMIT || process.env.COMMIT_SHA || ""
  ).trim();
  if (raw) return raw.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 40);
  return `t${Date.now()}`;
}

const suffix = cacheSuffix();
const CACHE_NAME = `comfort-ledger-${suffix}`;

let src = fs.readFileSync(SW, "utf8");
const patched = src.replace(/^const CACHE_NAME = "comfort-ledger-[^"]+";$/m, `const CACHE_NAME = "${CACHE_NAME}";`);

if (patched === src) {
  console.error("patch-sw-cache: expected line const CACHE_NAME = \"comfort-ledger-…\" not found.");
  process.exit(1);
}

fs.writeFileSync(SW, patched, "utf8");
console.log(`patch-sw-cache: ${CACHE_NAME}`);
