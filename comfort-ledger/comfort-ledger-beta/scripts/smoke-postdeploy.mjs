#!/usr/bin/env node

const baseUrl = String(process.env.COMFORT_SMOKE_BASE_URL || "").trim().replace(/\/$/, "");
const testEmail = String(process.env.COMFORT_SMOKE_TEST_EMAIL || "smoke-check@example.com").trim();
const timeoutMs = Number.parseInt(String(process.env.COMFORT_SMOKE_TIMEOUT_MS || "10000"), 10);

if (!baseUrl) {
  console.error("[smoke-postdeploy] Missing COMFORT_SMOKE_BASE_URL");
  process.exit(1);
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let body = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text };
    }
    return { res, body };
  } finally {
    clearTimeout(timer);
  }
}

function assert(condition, message, details = {}) {
  if (!condition) {
    console.error(`[smoke-postdeploy] FAIL: ${message}`);
    if (Object.keys(details).length) {
      console.error(JSON.stringify(details, null, 2));
    }
    process.exit(1);
  }
}

async function main() {
  const results = [];

  const health = await fetchJson(`${baseUrl}/api/health`);
  assert(health.res.status === 200 || health.res.status === 503, "Unexpected /api/health status", {
    status: health.res.status,
    body: health.body
  });
  results.push({ check: "health", status: health.res.status, ok: !!health.body.ok });

  const slo = await fetchJson(`${baseUrl}/api/health/slo?windowMin=15`);
  assert(slo.res.status === 200, "SLO endpoint not healthy", { status: slo.res.status, body: slo.body });
  results.push({
    check: "slo",
    status: slo.res.status,
    serverErrorRate: slo.body?.requests?.serverErrorRate ?? null,
    p95Ms: slo.body?.latency?.p95Ms ?? null
  });

  const waitlist = await fetchJson(`${baseUrl}/api/waitlist`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: testEmail, source: "postdeploy-smoke" })
  });
  assert([200, 429].includes(waitlist.res.status), "Waitlist endpoint unhealthy", {
    status: waitlist.res.status,
    body: waitlist.body
  });
  results.push({ check: "waitlist", status: waitlist.res.status, code: waitlist.body?.code || null });

  const status = await fetchJson(
    `${baseUrl}/v1/api/subscription/status?email=${encodeURIComponent(testEmail)}`
  );
  assert([200, 400, 429].includes(status.res.status), "Subscription status endpoint unhealthy", {
    status: status.res.status,
    body: status.body
  });
  results.push({ check: "subscription-status-v1", status: status.res.status });

  console.log("[smoke-postdeploy] OK");
  console.log(JSON.stringify({ baseUrl, results }, null, 2));
}

main().catch((error) => {
  console.error("[smoke-postdeploy] FAIL: unhandled error");
  console.error(error && error.message ? error.message : String(error));
  process.exit(1);
});
