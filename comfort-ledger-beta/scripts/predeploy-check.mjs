#!/usr/bin/env node

function getEnv(name) {
  return String(process.env[name] || "").trim();
}

function isTruthy(value) {
  const raw = String(value || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

const errors = [];
const warnings = [];

const nodeEnv = getEnv("NODE_ENV");
const sessionSecret = getEnv("COMFORT_SESSION_SECRET");
const publicPurchase = isTruthy(getEnv("COMFORT_PUBLIC_PURCHASE"));
const lemonApiKey = getEnv("LEMONSQUEEZY_API_KEY");
const lemonStoreId = getEnv("LEMONSQUEEZY_STORE_ID");
const lemonVariantMonthly = getEnv("LEMONSQUEEZY_VARIANT_MONTHLY");
const lemonVariantAnnual = getEnv("LEMONSQUEEZY_VARIANT_ANNUAL");
const lemonWebhookSecret = getEnv("LEMONSQUEEZY_WEBHOOK_SECRET");

if (nodeEnv === "production" && !sessionSecret) {
  errors.push("COMFORT_SESSION_SECRET is required when NODE_ENV=production.");
}

const lemonEnabled = Boolean(lemonApiKey) || publicPurchase;
if (lemonEnabled) {
  if (!lemonApiKey) errors.push("LEMONSQUEEZY_API_KEY is required when Lemon checkout is enabled.");
  if (!lemonStoreId) errors.push("LEMONSQUEEZY_STORE_ID is required when Lemon checkout is enabled.");
  if (!lemonVariantMonthly) {
    errors.push("LEMONSQUEEZY_VARIANT_MONTHLY is required when Lemon checkout is enabled.");
  }
  if (!lemonVariantAnnual) {
    errors.push("LEMONSQUEEZY_VARIANT_ANNUAL is required when Lemon checkout is enabled.");
  }
  if (!lemonWebhookSecret) {
    errors.push("LEMONSQUEEZY_WEBHOOK_SECRET is required when Lemon checkout is enabled.");
  }
}

if (!getEnv("OPENAI_API_KEY")) {
  warnings.push("OPENAI_API_KEY is not set; /api/ai-coach will return configuration errors.");
}

if (!getEnv("RELEASE_HASH") && !getEnv("GIT_COMMIT")) {
  warnings.push(
    "RELEASE_HASH/GIT_COMMIT is not set; patch-sw-cache will fallback to a timestamp instead of a stable release id."
  );
}

if (errors.length) {
  console.error("[predeploy:check] Failed with configuration errors:");
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log("[predeploy:check] OK");
if (warnings.length) {
  console.log("[predeploy:check] Warnings:");
  for (const warn of warnings) console.log(`- ${warn}`);
}
