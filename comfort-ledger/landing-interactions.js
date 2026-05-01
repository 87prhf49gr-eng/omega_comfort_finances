(function () {
  var STORAGE_KEY = "comfort_waitlist_v1";
  var locale =
    document.documentElement.getAttribute("data-landing-locale") ||
    (/^en\b/i.test(document.documentElement.lang || "") ? "en" : "es");
  var S = {
    es: {
      invalidEmail: "Revisa el correo — parece que tiene algún error.",
      waitlistOk: "Listo. Te aviso en cuanto abramos al público.",
      checkoutErr: "No pudimos abrir el checkout. Intenta luego.",
      annual: "Empezar anual →",
      monthly: "Empezar mensual →"
    },
    en: {
      invalidEmail: "Please check your email — it looks invalid.",
      waitlistOk: "Done. I will notify you as soon as we launch publicly.",
      checkoutErr: "We could not open checkout. Please try again later.",
      annual: "Start annual ->",
      monthly: "Start monthly ->"
    }
  };
  function msg(key) {
    var bundle = locale === "en" ? S.en : S.es;
    return bundle[key] || S.es[key];
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }

  function handleWaitlist(formId, msgElementId) {
    var form = document.getElementById(formId);
    var msgEl = document.getElementById(msgElementId);
    if (!form || !msgEl) return;
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      var input = form.querySelector('input[type="email"]');
      var email = (input && input.value ? input.value : "").trim();
      if (!isValidEmail(email)) {
        msgEl.textContent = msg("invalidEmail");
        msgEl.className = "waitlist-note";
        if (input) input.focus();
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      try {
        await fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, source: formId })
        });
      } catch (_) {}
      try {
        var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        if (!saved.includes(email)) {
          saved.push(email);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        }
      } catch (_) {}
      form.reset();
      msgEl.textContent = msg("waitlistOk");
      msgEl.className = "waitlist-ok";
      if (btn) btn.disabled = false;
    });
  }

  async function wirePurchaseButtons() {
    var cfg = null;
    try {
      var r = await fetch("/api/public-config", { cache: "no-store" });
      if (r.ok) cfg = await r.json();
    } catch (_) {}
    if (!cfg || !cfg.publicPurchaseEnabled) return;

    document.querySelectorAll(".price-cta").forEach(function (cta) {
      var plan = cta.getAttribute("data-plan") || "monthly";
      cta.textContent = msg(plan === "annual" ? "annual" : "monthly");
      cta.setAttribute("href", "/api/checkout?plan=" + encodeURIComponent(plan));
      cta.addEventListener("click", async function (event) {
        event.preventDefault();
        cta.setAttribute("aria-busy", "true");
        try {
          var response = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan: plan })
          });
          var payload = await response.json().catch(function () {
            return {};
          });
          if (response.ok && payload.url) {
            window.location.href = payload.url;
            return;
          }
          alert(payload.error || msg("checkoutErr"));
        } catch (_) {
          window.location.href = "/api/checkout?plan=" + encodeURIComponent(plan);
        } finally {
          cta.removeAttribute("aria-busy");
        }
      });
    });
  }

  handleWaitlist("waitlistForm", "waitlistMsg");
  handleWaitlist("waitlistFormBottom", "waitlistMsgBottom");
  wirePurchaseButtons();
})();
