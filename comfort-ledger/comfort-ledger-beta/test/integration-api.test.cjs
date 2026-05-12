const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");

function makeBetaUser(username, password, role = "user", id = undefined) {
  const pinSalt = crypto.randomBytes(16).toString("hex");
  const pinHash = crypto.scryptSync(password, pinSalt, 64).toString("hex");
  return {
    id: id || `beta-${username}`,
    username,
    displayName: "Beta One",
    slot: "A1",
    role,
    pinSalt,
    pinHash,
    active: true
  };
}

async function waitForHealth(baseUrl, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) return;
    } catch {
      // keep retrying
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("Server did not become healthy in time");
}

function createTestServer() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "comfort-ledger-int-"));
  const dataDir = path.join(tmpRoot, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, "beta-users.json"),
    `${JSON.stringify([
      makeBetaUser("tester", "pass1234", "user", "beta-user-1"),
      makeBetaUser("supporter", "pass1234", "support", "beta-user-2")
    ], null, 2)}\n`,
    "utf8"
  );

  const port = 10000 + Math.floor(Math.random() * 20000);
  const baseUrl = `http://127.0.0.1:${port}`;
  const serverPath = path.resolve(__dirname, "..", "server.js");
  const child = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      PORT: String(port),
      COMFORT_HOST: "127.0.0.1",
      NODE_ENV: "test",
      COMFORT_DATA_DIR: dataDir,
      COMFORT_SESSION_SECRET: "integration-test-session-secret",
      LEMONSQUEEZY_WEBHOOK_SECRET: "integration-test-webhook-secret",
      COMFORT_RATE_WAITLIST_MAX: "100"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  const stdout = [];
  const stderr = [];
  child.stdout.on("data", (d) => stdout.push(String(d)));
  child.stderr.on("data", (d) => stderr.push(String(d)));

  return {
    baseUrl,
    dataDir,
    tmpRoot,
    child,
    logs: {
      get stdout() {
        return stdout.join("");
      },
      get stderr() {
        return stderr.join("");
      }
    }
  };
}

test("integration: critical API flows", async (t) => {
  const srv = createTestServer();
  t.after(async () => {
    if (!srv.child.killed) {
      srv.child.kill("SIGTERM");
      await new Promise((resolve) => {
        srv.child.once("exit", () => resolve());
        setTimeout(resolve, 1000);
      });
    }
    fs.rmSync(srv.tmpRoot, { recursive: true, force: true });
  });

  await waitForHealth(srv.baseUrl);

  const invalidWaitlist = await fetch(`${srv.baseUrl}/api/waitlist`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "invalid-email" })
  });
  assert.equal(invalidWaitlist.status, 400);
  const invalidWaitlistBody = await invalidWaitlist.json();
  assert.equal(invalidWaitlistBody.code, "INVALID_EMAIL");

  const invalidWaitlistV1 = await fetch(`${srv.baseUrl}/v1/api/waitlist`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "invalid-email" })
  });
  assert.equal(invalidWaitlistV1.status, 400);
  const invalidWaitlistV1Body = await invalidWaitlistV1.json();
  assert.equal(invalidWaitlistV1Body.code, "INVALID_EMAIL");

  const validWaitlist = await fetch(`${srv.baseUrl}/api/waitlist`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "person@example.com", source: "test" })
  });
  assert.equal(validWaitlist.status, 200);
  const validWaitlistBody = await validWaitlist.json();
  assert.equal(validWaitlistBody.ok, true);

  const badLogin = await fetch(`${srv.baseUrl}/api/beta/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "tester", password: "wrong" })
  });
  assert.equal(badLogin.status, 401);
  const badLoginBody = await badLogin.json();
  assert.equal(badLoginBody.code, "INVALID_CREDENTIALS");

  const missingEmailStatus = await fetch(`${srv.baseUrl}/api/subscription/status`);
  assert.equal(missingEmailStatus.status, 400);
  const missingEmailStatusBody = await missingEmailStatus.json();
  assert.equal(missingEmailStatusBody.code, "EMAIL_REQUIRED");

  const missingEmailStatusV1 = await fetch(`${srv.baseUrl}/v1/api/subscription/status`);
  assert.equal(missingEmailStatusV1.status, 400);

  const invalidCheckoutEmail = await fetch(
    `${srv.baseUrl}/api/checkout?email=bad-email&plan=monthly`
  );
  assert.equal(invalidCheckoutEmail.status, 400);
  const invalidCheckoutBody = await invalidCheckoutEmail.json();
  assert.equal(invalidCheckoutBody.code, "INVALID_EMAIL");

  const webhookPayload = {
    meta: {
      event_name: "subscription_created"
    },
    data: {
      type: "subscriptions",
      id: "sub_123",
      attributes: {
        user_email: "payer@example.com",
        status: "active",
        variant_id: "var_monthly",
        customer_id: "cust_123",
        renews_at: "2026-12-31T00:00:00Z"
      }
    }
  };
  const raw = Buffer.from(JSON.stringify(webhookPayload), "utf8");
  const signature = crypto
    .createHmac("sha256", "integration-test-webhook-secret")
    .update(raw)
    .digest("hex");

  const webhookFirst = await fetch(`${srv.baseUrl}/api/webhooks/lemonsqueezy`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature": signature
    },
    body: raw
  });
  assert.equal(webhookFirst.status, 200);
  const webhookFirstBody = await webhookFirst.json();
  assert.equal(webhookFirstBody.ok, true);
  assert.equal(webhookFirstBody.duplicate, undefined);

  const webhookSecond = await fetch(`${srv.baseUrl}/api/webhooks/lemonsqueezy`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature": signature
    },
    body: raw
  });
  assert.equal(webhookSecond.status, 200);
  const webhookSecondBody = await webhookSecond.json();
  assert.equal(webhookSecondBody.ok, true);
  assert.equal(webhookSecondBody.duplicate, true);
});

test("e2e: paid user onboarding flow", async (t) => {
  const srv = createTestServer();
  t.after(async () => {
    if (!srv.child.killed) {
      srv.child.kill("SIGTERM");
      await new Promise((resolve) => {
        srv.child.once("exit", () => resolve());
        setTimeout(resolve, 1000);
      });
    }
    fs.rmSync(srv.tmpRoot, { recursive: true, force: true });
  });

  await waitForHealth(srv.baseUrl);

  const payerEmail = "payer-flow@example.com";
  const webhookPayload = {
    meta: {
      event_name: "subscription_created"
    },
    data: {
      type: "subscriptions",
      id: "sub_paid_flow_1",
      attributes: {
        user_email: payerEmail,
        status: "active",
        variant_id: "var_monthly",
        customer_id: "cust_paid_flow_1",
        renews_at: "2026-12-31T00:00:00Z"
      }
    }
  };
  const raw = Buffer.from(JSON.stringify(webhookPayload), "utf8");
  const signature = crypto
    .createHmac("sha256", "integration-test-webhook-secret")
    .update(raw)
    .digest("hex");

  const webhookRes = await fetch(`${srv.baseUrl}/api/webhooks/lemonsqueezy`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature": signature
    },
    body: raw
  });
  assert.equal(webhookRes.status, 200);

  const onboardingRes = await fetch(`${srv.baseUrl}/api/onboarding/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      profile: {
        displayName: "Paid User",
        email: payerEmail,
        focus: "Build emergency fund",
        lifestyle: "simple",
        currency: "USD"
      }
    })
  });
  assert.equal(onboardingRes.status, 200);
  const onboardingBody = await onboardingRes.json();
  assert.equal(onboardingBody.ok, true);
  assert.equal(onboardingBody.profile.email, payerEmail);

  const setCookie = onboardingRes.headers.get("set-cookie");
  assert.ok(setCookie, "Expected onboarding response to set session cookie");
  const sessionCookie = setCookie.split(";")[0];

  const sessionRes = await fetch(`${srv.baseUrl}/api/onboarding/session`, {
    headers: { cookie: sessionCookie }
  });
  assert.equal(sessionRes.status, 200);
  const sessionBody = await sessionRes.json();
  assert.equal(sessionBody.ok, true);
  assert.equal(sessionBody.authenticated, true);
  assert.equal(sessionBody.profile.email, payerEmail);

  const coachRes = await fetch(`${srv.baseUrl}/api/ai-coach`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie
    },
    body: JSON.stringify({
      question: "How should I prioritize savings?",
      language: "en"
    })
  });
  // OPENAI_API_KEY is intentionally not configured in this integration environment.
  assert.equal(coachRes.status, 503);
  const coachBody = await coachRes.json();
  assert.equal(coachBody.code, "COACH_NOT_CONFIGURED");
});

test("e2e: beta tester login and logout flow", async (t) => {
  const srv = createTestServer();
  t.after(async () => {
    if (!srv.child.killed) {
      srv.child.kill("SIGTERM");
      await new Promise((resolve) => {
        srv.child.once("exit", () => resolve());
        setTimeout(resolve, 1000);
      });
    }
    fs.rmSync(srv.tmpRoot, { recursive: true, force: true });
  });

  await waitForHealth(srv.baseUrl);

  const loginRes = await fetch(`${srv.baseUrl}/api/beta/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: "tester",
      password: "pass1234"
    })
  });
  assert.equal(loginRes.status, 200);
  const loginBody = await loginRes.json();
  assert.equal(loginBody.ok, true);
  assert.equal(loginBody.user.username, "tester");

  const setCookie = loginRes.headers.get("set-cookie");
  assert.ok(setCookie, "Expected beta login to set session cookie");
  const sessionCookie = setCookie.split(";")[0];

  const sessionActiveRes = await fetch(`${srv.baseUrl}/api/beta/session`, {
    headers: { cookie: sessionCookie }
  });
  assert.equal(sessionActiveRes.status, 200);
  const sessionActiveBody = await sessionActiveRes.json();
  assert.equal(sessionActiveBody.ok, true);
  assert.equal(sessionActiveBody.authenticated, true);
  assert.equal(sessionActiveBody.user.username, "tester");

  const logoutRes = await fetch(`${srv.baseUrl}/api/beta/logout`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie
    },
    body: JSON.stringify({})
  });
  assert.equal(logoutRes.status, 200);
  const logoutBody = await logoutRes.json();
  assert.equal(logoutBody.ok, true);

  const sessionAfterLogoutRes = await fetch(`${srv.baseUrl}/api/beta/session`, {
    headers: { cookie: sessionCookie }
  });
  assert.equal(sessionAfterLogoutRes.status, 200);
  const sessionAfterLogoutBody = await sessionAfterLogoutRes.json();
  assert.equal(sessionAfterLogoutBody.ok, true);
  assert.equal(sessionAfterLogoutBody.authenticated, false);
});

test("integration: admin subscriptions endpoint enforces RBAC", async (t) => {
  const srv = createTestServer();
  t.after(async () => {
    if (!srv.child.killed) {
      srv.child.kill("SIGTERM");
      await new Promise((resolve) => {
        srv.child.once("exit", () => resolve());
        setTimeout(resolve, 1000);
      });
    }
    fs.rmSync(srv.tmpRoot, { recursive: true, force: true });
  });

  await waitForHealth(srv.baseUrl);

  const noAuth = await fetch(`${srv.baseUrl}/api/admin/subscriptions`);
  assert.equal(noAuth.status, 401);

  const userLogin = await fetch(`${srv.baseUrl}/api/beta/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "tester", password: "pass1234" })
  });
  assert.equal(userLogin.status, 200);
  const userCookie = userLogin.headers.get("set-cookie").split(";")[0];

  const forbidden = await fetch(`${srv.baseUrl}/api/admin/subscriptions`, {
    headers: { cookie: userCookie }
  });
  assert.equal(forbidden.status, 403);

  const supportLogin = await fetch(`${srv.baseUrl}/api/beta/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "supporter", password: "pass1234" })
  });
  assert.equal(supportLogin.status, 200);
  const supportCookie = supportLogin.headers.get("set-cookie").split(";")[0];

  const allowed = await fetch(`${srv.baseUrl}/api/admin/subscriptions?limit=5`, {
    headers: { cookie: supportCookie }
  });
  assert.equal(allowed.status, 200);
  const allowedBody = await allowed.json();
  assert.equal(allowedBody.ok, true);
  assert.ok(Array.isArray(allowedBody.items));

  const allowedV1 = await fetch(`${srv.baseUrl}/v1/api/admin/subscriptions?limit=5`, {
    headers: { cookie: supportCookie }
  });
  assert.equal(allowedV1.status, 200);
});
