/**
 * Minimal LemonSqueezy helpers for Comfort Ledger.
 *
 * LemonSqueezy actúa como Merchant of Record: ellos cobran y se encargan del
 * sales tax / VAT globalmente, y notifican vía webhook cuando cambia una
 * suscripción.
 *
 * No hay SDK oficial ligero: usamos fetch nativo (Node 18+) y crypto nativo.
 * Este módulo solo expone helpers puros; la persistencia vive en server.js.
 */

const crypto = require("crypto");

const LS_API_BASE = "https://api.lemonsqueezy.com/v1";

const PLAN_MONTHLY = "monthly";
const PLAN_ANNUAL = "annual";

function getConfig() {
  return {
    apiKey: String(process.env.LEMONSQUEEZY_API_KEY || "").trim(),
    storeId: String(process.env.LEMONSQUEEZY_STORE_ID || "").trim(),
    variantMonthly: String(process.env.LEMONSQUEEZY_VARIANT_MONTHLY || "").trim(),
    variantAnnual: String(process.env.LEMONSQUEEZY_VARIANT_ANNUAL || "").trim(),
    webhookSecret: String(process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "").trim(),
    checkoutRedirectUrl: String(process.env.COMFORT_CHECKOUT_REDIRECT_URL || "").trim(),
    publicPurchaseEnabled: String(process.env.COMFORT_PUBLIC_PURCHASE || "false").toLowerCase() === "true"
  };
}

function isConfigured() {
  const cfg = getConfig();
  return Boolean(cfg.apiKey && cfg.storeId && cfg.variantMonthly && cfg.webhookSecret);
}

function variantIdForPlan(plan) {
  const cfg = getConfig();
  if (plan === PLAN_ANNUAL) return cfg.variantAnnual || cfg.variantMonthly;
  return cfg.variantMonthly;
}

/**
 * Verifica firma HMAC-SHA256 del webhook de LemonSqueezy.
 * La firma viene en el header `X-Signature` y se calcula sobre el raw body.
 */
function verifyWebhookSignature(rawBody, signatureHeader) {
  const cfg = getConfig();
  if (!cfg.webhookSecret || !signatureHeader) return false;
  const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ""), "utf8");
  const expected = crypto.createHmac("sha256", cfg.webhookSecret).update(payload).digest("hex");
  const provided = String(signatureHeader).trim();
  try {
    const expectedBuf = Buffer.from(expected, "hex");
    const providedBuf = Buffer.from(provided, "hex");
    if (expectedBuf.length !== providedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  } catch {
    return false;
  }
}

/**
 * Crea una URL de checkout hosted para el plan indicado, prellenando email
 * si se provee. Devuelve { url } o { error }.
 */
async function createCheckoutUrl({ plan, email, discountCode }) {
  const cfg = getConfig();
  if (!isConfigured()) return { error: "LemonSqueezy no está configurado en el servidor." };
  const variantId = variantIdForPlan(plan);
  if (!variantId) return { error: "Variante no configurada para este plan." };

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          email: email ? String(email).trim().toLowerCase() : undefined,
          custom: {
            source: "comfort-ledger-landing",
            plan: plan === PLAN_ANNUAL ? PLAN_ANNUAL : PLAN_MONTHLY
          },
          discount_code: discountCode ? String(discountCode).trim() : undefined
        },
        checkout_options: {
          embed: false,
          media: false,
          logo: true
        },
        product_options: {
          redirect_url: cfg.checkoutRedirectUrl || undefined,
          receipt_button_text: "Abrir Comfort Ledger",
          receipt_thank_you_note: "Gracias por apoyar Comfort Ledger."
        },
        expires_at: null
      },
      relationships: {
        store: { data: { type: "stores", id: cfg.storeId } },
        variant: { data: { type: "variants", id: variantId } }
      }
    }
  };

  try {
    const response = await fetch(`${LS_API_BASE}/checkouts`, {
      method: "POST",
      headers: lemonHeaders(cfg.apiKey),
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { error: `LS checkout failed (${response.status}): ${text.slice(0, 300)}` };
    }
    const json = await response.json();
    const url = json?.data?.attributes?.url;
    if (!url) return { error: "LemonSqueezy no devolvió URL de checkout." };
    return { url };
  } catch (err) {
    return { error: err && err.message ? err.message : "Error llamando a LemonSqueezy." };
  }
}

/**
 * Devuelve la URL del Customer Portal para la suscripción dada.
 * subscriptionId viene del webhook.
 */
async function getCustomerPortalUrl(subscriptionId) {
  const cfg = getConfig();
  if (!isConfigured()) return { error: "LemonSqueezy no está configurado." };
  if (!subscriptionId) return { error: "subscriptionId requerido." };
  try {
    const response = await fetch(`${LS_API_BASE}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      method: "GET",
      headers: lemonHeaders(cfg.apiKey)
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { error: `LS subscription fetch failed (${response.status}): ${text.slice(0, 300)}` };
    }
    const json = await response.json();
    const portal = json?.data?.attributes?.urls?.customer_portal;
    if (!portal) return { error: "Sin URL de portal en la respuesta." };
    return { url: portal };
  } catch (err) {
    return { error: err && err.message ? err.message : "Error llamando a LemonSqueezy." };
  }
}

/**
 * Normaliza un payload de webhook en un registro de suscripción local.
 * Aceptamos los eventos más usuales: subscription_created, subscription_updated,
 * subscription_cancelled, subscription_resumed, subscription_expired,
 * subscription_paused, subscription_unpaused, subscription_payment_success,
 * subscription_payment_failed.
 */
function parseWebhookEvent(payload) {
  if (!payload || typeof payload !== "object") return null;
  const eventName = String(payload?.meta?.event_name || "").trim();
  const data = payload?.data;
  if (!eventName || !data) return null;
  const attrs = data.attributes || {};
  const custom = payload?.meta?.custom_data || {};
  const email = String(attrs.user_email || attrs.email || "").trim().toLowerCase();
  const subscriptionId = data.type === "subscriptions" ? String(data.id || "") : String(attrs.subscription_id || "");
  const status = String(attrs.status || "").trim();
  const renewsAt = attrs.renews_at || attrs.ends_at || null;
  const variantId = String(attrs.variant_id || "");
  const customerId = String(attrs.customer_id || "");
  const plan = custom?.plan === PLAN_ANNUAL ? PLAN_ANNUAL : PLAN_MONTHLY;
  return {
    eventName,
    email,
    subscriptionId,
    customerId,
    variantId,
    status,
    renewsAt,
    plan
  };
}

function isActiveStatus(status) {
  return ["on_trial", "active", "paused"].includes(String(status || "").toLowerCase());
}

function lemonHeaders(apiKey) {
  return {
    "Accept": "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    "Authorization": `Bearer ${apiKey}`
  };
}

module.exports = {
  PLAN_MONTHLY,
  PLAN_ANNUAL,
  getConfig,
  isConfigured,
  verifyWebhookSignature,
  createCheckoutUrl,
  getCustomerPortalUrl,
  parseWebhookEvent,
  isActiveStatus
};
