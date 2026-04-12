import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createCheckoutSession(req, res) {
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_MONTHLY, quantity: 1 }],
    success_url: `${process.env.APP_URL}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/?checkout=cancelled`,
    allow_promotion_codes: true
  });

  res.json({ url: session.url });
}

export async function startMonthlyCheckout() {
  const response = await fetch("/api/stripe/checkout", { method: "POST" });
  const { url } = await response.json();
  window.location.href = url;
}
