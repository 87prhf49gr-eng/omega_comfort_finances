#!/usr/bin/env node

const baseUrl = String(process.env.COMFORT_SLO_BASE_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const windowMin = Number.parseInt(String(process.env.COMFORT_SLO_WINDOW_MIN || "15"), 10);
const maxServerErrorRate = Number.parseFloat(String(process.env.COMFORT_SLO_MAX_5XX_RATE || "0.02"));
const maxWebhookFailureRate = Number.parseFloat(String(process.env.COMFORT_SLO_MAX_WEBHOOK_FAILURE_RATE || "0.05"));
const maxP95Ms = Number.parseInt(String(process.env.COMFORT_SLO_MAX_P95_MS || "1200"), 10);

function fail(message, details = {}) {
  console.error(`[check-slo] ALERT: ${message}`);
  if (Object.keys(details).length) {
    console.error(JSON.stringify(details, null, 2));
  }
  process.exit(1);
}

async function main() {
  const url = `${baseUrl}/api/health/slo?windowMin=${encodeURIComponent(String(windowMin))}`;
  const res = await fetch(url);
  if (!res.ok) {
    fail("SLO endpoint unavailable", { status: res.status, url });
  }
  const body = await res.json();
  const checks = [
    {
      ok: (body.requests?.serverErrorRate ?? 0) <= maxServerErrorRate,
      name: "serverErrorRate",
      actual: body.requests?.serverErrorRate ?? 0,
      threshold: maxServerErrorRate
    },
    {
      ok: (body.webhook?.failureRate ?? 0) <= maxWebhookFailureRate,
      name: "webhookFailureRate",
      actual: body.webhook?.failureRate ?? 0,
      threshold: maxWebhookFailureRate
    },
    {
      ok: (body.latency?.p95Ms ?? 0) <= maxP95Ms,
      name: "p95Ms",
      actual: body.latency?.p95Ms ?? 0,
      threshold: maxP95Ms
    }
  ];

  const failed = checks.filter((c) => !c.ok);
  if (failed.length) {
    fail("One or more SLO checks failed", {
      url,
      windowMin,
      failed,
      snapshot: body
    });
  }

  console.log("[check-slo] OK");
  console.log(
    JSON.stringify(
      {
        windowMin,
        serverErrorRate: body.requests?.serverErrorRate ?? 0,
        webhookFailureRate: body.webhook?.failureRate ?? 0,
        p95Ms: body.latency?.p95Ms ?? 0
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  fail("Unexpected check-slo error", { message: error && error.message ? error.message : String(error) });
});
