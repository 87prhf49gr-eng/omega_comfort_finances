"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const lockfile = require("proper-lockfile");

process.env.LEMONSQUEEZY_WEBHOOK_SECRET = "test-wh-secret";
const lemon = require("../lemonsqueezy.js");

test("verifyWebhookSignature accepts valid HMAC hex", () => {
  const body = Buffer.from('{"meta":{"event_name":"test"}}', "utf8");
  const sig = crypto.createHmac("sha256", "test-wh-secret").update(body).digest("hex");
  assert.strictEqual(lemon.verifyWebhookSignature(body, sig), true);
});

test("verifyWebhookSignature rejects tampered body", () => {
  const body = Buffer.from("{}", "utf8");
  const sig = crypto.createHmac("sha256", "other-secret").update(body).digest("hex");
  assert.strictEqual(lemon.verifyWebhookSignature(body, sig), false);
});

test("verifyWebhookSignature rejects malformed hex", () => {
  assert.strictEqual(lemon.verifyWebhookSignature(Buffer.from("{}"), "not-hex"), false);
});

/** Mirrors server normalizeEmail (keep in sync). */
function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!email) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  return email;
}

test("normalizeEmail lowercases and validates", () => {
  assert.strictEqual(normalizeEmail("  Test@Example.com "), "test@example.com");
  assert.strictEqual(normalizeEmail("bad"), "");
  assert.strictEqual(normalizeEmail(""), "");
});

/** Mirrors server sanitizeSensitiveText (keep in sync). */
function sanitizeSensitiveText(input) {
  const merchantPattern = /\b(walmart|target|costco|starbucks|amazon|paypal|uber|lyft|7-eleven|mcdonalds|oxxo)\b/gi;
  return String(input || "")
    .replace(/\b(?:\d[ -]*?){12,19}\b/g, "[REDACTED_ACCOUNT]")
    .replace(/\b(account|cuenta)\s*(number|numero|no\.?|#)?\s*[:=-]?\s*\w+\b/gi, "[REDACTED_ACCOUNT]")
    .replace(merchantPattern, "[REDACTED_MERCHANT]")
    .slice(0, 2400);
}

test("sanitizeSensitiveText redacts card-like digit runs", () => {
  const out = sanitizeSensitiveText("pay 4532012345678901 now");
  assert.ok(out.includes("[REDACTED_ACCOUNT]"));
  assert.ok(!out.includes("4532012345678901"));
});

test("sanitizeSensitiveText redacts merchant names", () => {
  const out = sanitizeSensitiveText("charge at Walmart");
  assert.ok(out.includes("[REDACTED_MERCHANT]"));
});

/** Mirrors server hashSessionToken (keep in sync). */
function hashSessionToken(token, sessionSecret) {
  return crypto.createHash("sha256").update(`${sessionSecret}:${String(token || "")}`).digest("hex");
}

test("hashSessionToken is deterministic and salt-sensitive", () => {
  const secret = "test-session-secret";
  const tok = "abc123";
  const h1 = hashSessionToken(tok, secret);
  const h2 = hashSessionToken(tok, secret);
  const hOther = hashSessionToken(tok, "other-secret");
  assert.strictEqual(h1, h2);
  assert.strictEqual(h1.length, 64);
  assert.notStrictEqual(h1, hOther);
  assert.notStrictEqual(hashSessionToken("other", secret), h1);
});

/** Same options shape as FILE_LOCK_OPTIONS in server.js (#15 smoke test). */
const LOCK_TEST_OPTS = { stale: 30000, retries: { retries: 40, minTimeout: 15, maxTimeout: 900 }, realpath: false };

test("proper-lockfile serializes two concurrent mutations (audit #15 dependency)", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "comfort-ledger-lock-"));
  const fp = path.join(dir, "store.json");
  fs.writeFileSync(fp, "[0]", "utf8");
  async function bump(label) {
    const release = await lockfile.lock(fp, LOCK_TEST_OPTS);
    try {
      const raw = fs.readFileSync(fp, "utf8");
      const arr = JSON.parse(raw);
      assert.ok(Array.isArray(arr));
      arr.push(label);
      const next = `.${path.basename(fp)}.tmp`;
      fs.writeFileSync(path.join(dir, next), `${JSON.stringify(arr)}\n`);
      fs.renameSync(path.join(dir, next), fp);
    } finally {
      await release();
    }
  }
  await Promise.all([bump("a"), bump("b")]);
  const out = JSON.parse(fs.readFileSync(fp, "utf8"));
  assert.strictEqual(out.length, 3);
  assert.strictEqual(out[0], 0);
  assert.ok(new Set(["a", "b"]).has(out[1]));
  assert.ok(new Set(["a", "b"]).has(out[2]));
  fs.rmSync(dir, { recursive: true, force: true });
});
