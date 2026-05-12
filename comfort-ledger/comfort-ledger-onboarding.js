/* Comfort Ledger extracted domain module (Hito D phase 3) */

function comfortVt(fn) {
  if (typeof window !== "undefined" && typeof window.comfortRunViewTransition === "function") {
    window.comfortRunViewTransition(fn);
  } else {
    fn();
  }
}

/**
 * Wires up the multi-step onboarding form.
 * Groups are controlled via data-onboarding-group attributes.
 * When isEdit=true, shows all groups at once and hides multi-step UI.
 * Returns a cleanup function.
 */
function wireOnboardingSteps(form, isEdit = false) {
  if (!form || form.dataset.stepsWired) return () => {};
  form.dataset.stepsWired = "1";

  const groups = Array.from(form.querySelectorAll("[data-onboarding-group]"));
  const totalSteps = groups.length;
  let currentStep = 1;

  const nextBtn = document.getElementById("comfortOnboardingNext");
  const backBtn = document.getElementById("comfortOnboardingBack");
  const submitBtn = document.getElementById("comfortOnboardingSubmit");
  const stepLabel = document.getElementById("comfortOnboardingStepLabel");
  const progressContainer = document.getElementById("comfortOnboardingProgress");
  const dots = Array.from(document.querySelectorAll("#comfortOnboardingProgress .onboarding-step-dot"));
  const lines = Array.from(document.querySelectorAll("#comfortOnboardingProgress .onboarding-step-line"));

  // Edit mode: show all groups, hide multi-step UI
  if (isEdit) {
    groups.forEach((g) => g.classList.add("active"));
    if (progressContainer) progressContainer.hidden = true;
    if (nextBtn) nextBtn.hidden = true;
    if (backBtn) backBtn.hidden = true;
    if (submitBtn) submitBtn.hidden = false;
    return function cleanup() {
      delete form.dataset.stepsWired;
    };
  }

  function applyStep(step) {
    // Show/hide groups
    groups.forEach((g) => {
      const gStep = Number(g.dataset.onboardingGroup);
      g.classList.toggle("active", gStep === step);
    });
    // Update dots
    dots.forEach((dot, i) => {
      const dotStep = i + 1;
      dot.classList.toggle("active", dotStep === step);
      dot.classList.toggle("done", dotStep < step);
    });
    // Update connector lines
    lines.forEach((line, i) => {
      line.classList.toggle("done", i + 1 < step);
    });
    // Update step label
    if (stepLabel) {
      const key = `onboarding_step_${step}_of_${totalSteps}`;
      stepLabel.textContent = typeof t === "function" ? t(key) : `Step ${step} of ${totalSteps}`;
    }
    // Toggle next/back/submit buttons
    if (nextBtn) nextBtn.hidden = step >= totalSteps;
    if (backBtn) backBtn.hidden = step <= 1;
    if (submitBtn) submitBtn.hidden = step < totalSteps;
  }

  const onNext = (ev) => {
    ev.preventDefault();
    // Validate current group's required fields
    const activeGroup = groups.find((g) => Number(g.dataset.onboardingGroup) === currentStep);
    if (activeGroup) {
      const required = Array.from(activeGroup.querySelectorAll("[required]"));
      const invalid = required.find((el) => !el.value.trim());
      if (invalid) {
        invalid.focus();
        return;
      }
    }
    if (currentStep < totalSteps) {
      currentStep++;
      applyStep(currentStep);
      // Focus first input in new step
      const newGroup = groups.find((g) => Number(g.dataset.onboardingGroup) === currentStep);
      if (newGroup) {
        const firstInput = newGroup.querySelector("input, select, textarea");
        if (firstInput) firstInput.focus();
      }
    }
  };

  const onBack = (ev) => {
    ev.preventDefault();
    if (currentStep > 1) {
      currentStep--;
      applyStep(currentStep);
    }
  };

  // Intercept Enter/submit on non-final steps — advance instead of submitting
  const onSubmitIntercept = (ev) => {
    if (currentStep < totalSteps) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      onNext(ev);
    }
  };

  nextBtn?.addEventListener("click", onNext);
  backBtn?.addEventListener("click", onBack);
  form.addEventListener("submit", onSubmitIntercept, true); // capture phase

  // Initialise on step 1
  applyStep(1);

  return function cleanup() {
    delete form.dataset.stepsWired;
    nextBtn?.removeEventListener("click", onNext);
    backBtn?.removeEventListener("click", onBack);
    form.removeEventListener("submit", onSubmitIntercept, true);
  };
}

/**
 * Fetches subscription status for the given email and shows the trial pill if on_trial.
 */
async function fetchAndShowTrialStatus(email) {
  if (!email || !window.__COMFORT_HOSTED) return;
  try {
    const res = await fetch(`/api/subscription/status?email=${encodeURIComponent(email)}`, {
      credentials: "include"
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data && typeof window.showTrialCountdown === "function") {
      window.showTrialCountdown(data.renewsAt || null, data.status || "");
    }
  } catch {
    /* ignore */
  }
}

async function showOnboardingUntilDone(existingProfile = null, opts = {}) {
  const offerBetaShortcut = Boolean(opts.offerBetaShortcut);
  const shell = document.getElementById("comfortOnboardingGate");
  if (!shell) {
    return existingProfile;
  }
  const profile = normalizeProfile(existingProfile);
  const form = document.getElementById("comfortOnboardingForm");
  const nameInput = document.getElementById("comfortOnboardingName");
  const emailInput = document.getElementById("comfortOnboardingEmail");
  const focusInput = document.getElementById("comfortOnboardingFocus");
  const lifestyleInput = document.getElementById("comfortOnboardingLifestyle");
  const currencyInput = document.getElementById("comfortOnboardingCurrency");
  const err = document.getElementById("comfortOnboardingErr");
  const cancel = document.getElementById("comfortOnboardingCancel");
  const hybridRow = document.getElementById("comfortHybridBetaRow");
  const hybridBtn = document.getElementById("comfortHybridBetaBtn");

  if (nameInput) nameInput.value = profile?.displayName || "";
  if (emailInput) emailInput.value = profile?.email || "";
  if (focusInput) focusInput.value = profile?.focus || "";
  if (lifestyleInput) lifestyleInput.value = profile?.lifestyle || "simple";
  if (currencyInput) {
    const c = typeof profile?.currency === "string" ? profile.currency.trim().toUpperCase() : "";
    currencyInput.value = c && currencyInput.querySelector(`option[value="${c}"]`) ? c : "";
  }
  if (err) {
    err.hidden = true;
    err.textContent = "";
  }
  if (cancel) {
    cancel.hidden = !profile;
  }

  comfortVt(() => {
    if (typeof comfortOverlayReveal === "function") {
      comfortOverlayReveal(shell);
    } else {
      shell.classList.remove("comfort-beta-overlay--hidden");
      shell.setAttribute("aria-hidden", "false");
    }
    document.body.classList.add("comfort--gate-active");
  });
  applyStaticI18n();
  applyPaidOnboardingCopy();

  // Wire multi-step progress (skip steps when editing existing profile)
  const isEdit = !!profile;
  const cleanupSteps = wireOnboardingSteps(form, isEdit);

  return new Promise((resolve) => {
    if (!form) {
      document.body.classList.remove("comfort--gate-active");
      if (hybridRow) hybridRow.hidden = true;
      resolve(profile);
      return;
    }

    const isFirstTime = !profile; // show welcome modal only for brand-new users
    let hybridBetaHandler = null;

    const detachListeners = () => {
      form.removeEventListener("submit", onSubmit);
      cancel?.removeEventListener("click", onCancel);
      if (hybridBtn && hybridBetaHandler) hybridBtn.removeEventListener("click", hybridBetaHandler);
      cleanupSteps();
    };

    const dismissOverlayUi = () => {
      comfortVt(() => {
        if (typeof comfortOverlayDismiss === "function") {
          comfortOverlayDismiss(shell);
        } else {
          shell.classList.add("comfort-beta-overlay--hidden");
          shell.setAttribute("aria-hidden", "true");
        }
        document.body.classList.remove("comfort--gate-active");
      });
    };

    const hideHybridRow = () => {
      if (hybridRow) hybridRow.hidden = true;
    };

    if (hybridRow) hybridRow.hidden = !offerBetaShortcut;

    const onCancel = () => {
      detachListeners();
      dismissOverlayUi();
      hideHybridRow();
      resolve(profile);
    };

    const onSubmit = async (ev) => {
      ev.preventDefault();
      if (err) {
        err.hidden = true;
        err.textContent = "";
      }
      const nextProfile = normalizeProfile({
        id: profile?.id,
        createdAt: profile?.createdAt,
        displayName: nameInput?.value || "",
        email: emailInput?.value || "",
        focus: focusInput?.value || "",
        lifestyle: lifestyleInput?.value || "simple",
        currency: currencyInput?.value || ""
      });
      if (!nextProfile) {
        if (err) {
          err.textContent = t("onboarding_error");
          err.hidden = false;
        }
        return;
      }
      try {
        const savedProfile = await startOnboardingSession(nextProfile);
        setStoredProfile(savedProfile);
        const appliedTemplate = applyLifestyleTemplateIfEmpty(savedProfile.lifestyle || "simple");
        if (appliedTemplate) {
          showBackupStatus(tFill("onboarding_template_applied", { mode: lifestyleLabel(savedProfile.lifestyle || "simple") }), false);
          try {
            if (typeof renderAll === "function") renderAll();
          } catch {
            /* ignore */
          }
        }
        window.__COMFORT_SESSION_ACTIVE = true;
        stopDemoBar();
        window.__COMFORT_DEMO_EXPIRES_AT = null;
        window.__COMFORT_LANDING_DEMO = false;
        detachListeners();
        dismissOverlayUi();
        hideHybridRow();
        // Show welcome modal on first-time onboarding
        if (isFirstTime && typeof window.showWelcomeModal === "function") {
          window.showWelcomeModal(savedProfile.displayName || "");
        }
        // Fetch subscription trial status (for trial pill in header)
        if (savedProfile.email) {
          void fetchAndShowTrialStatus(savedProfile.email);
        }
        resolve(savedProfile);
      } catch (error) {
        if (err) {
          err.textContent = String(error?.message || t("onboarding_error"));
          err.hidden = false;
        }
      }
    };

    hybridBetaHandler = async () => {
      detachListeners();
      dismissOverlayUi();
      hideHybridRow();
      await showBetaLoginUntilDone();
      resolve({ via: "beta" });
    };

    form.addEventListener("submit", onSubmit);
    cancel?.addEventListener("click", onCancel);
    if (offerBetaShortcut && hybridBtn) hybridBtn.addEventListener("click", hybridBetaHandler);
  });
}

async function ensureHybridEntry(cfg) {
  window.__COMFORT_SESSION_KIND = "";
  let betaProbe = await fetchHostedSession("/api/beta/session");
  if (betaProbe.authenticated) {
    window.__COMFORT_SESSION_KIND = "beta";
    window.__COMFORT_SESSION_ACTIVE = true;
    return true;
  }
  let onboardingProbe = await fetchHostedSession("/api/onboarding/session");
  if (onboardingProbe.authenticated) {
    const sessionProfile = normalizeProfile(onboardingProbe.profile);
    if (sessionProfile) {
      setStoredProfile(sessionProfile);
    }
    window.__COMFORT_SESSION_KIND = "onboarding";
    window.__COMFORT_SESSION_ACTIVE = true;
    return true;
  }
  const hybridRes = await showOnboardingUntilDone(getStoredProfile(), { offerBetaShortcut: !!cfg.betaEnabled });
  if (hybridRes && hybridRes.via === "beta") {
    window.__COMFORT_SESSION_KIND = "beta";
    const j = await fetchHostedSession("/api/beta/session");
    window.__COMFORT_SESSION_ACTIVE = Boolean(j.authenticated);
    try {
      sessionStorage.removeItem("comfort_landing_demo_until_ms");
    } catch {
      /* ignore */
    }
    window.__COMFORT_DEMO_EXPIRES_AT = null;
    window.__COMFORT_LANDING_DEMO = false;
    stopDemoBar();
    return window.__COMFORT_SESSION_ACTIVE;
  }
  if (!hybridRes) {
    window.__COMFORT_SESSION_ACTIVE = false;
    window.__COMFORT_SESSION_KIND = "";
    return false;
  }
  window.__COMFORT_SESSION_KIND = "onboarding";
  window.__COMFORT_SESSION_ACTIVE = true;
  try {
    sessionStorage.removeItem("comfort_landing_demo_until_ms");
  } catch {
    /* ignore */
  }
  window.__COMFORT_DEMO_EXPIRES_AT = null;
  window.__COMFORT_LANDING_DEMO = false;
  stopDemoBar();
  return true;
}

async function ensureOnboardingSession() {
  let sessionJson = await fetchHostedSession("/api/onboarding/session");
  if (sessionJson.authenticated) {
    const sessionProfile = normalizeProfile(sessionJson.profile);
    if (sessionProfile) {
      setStoredProfile(sessionProfile);
    }
    return sessionProfile || getStoredProfile();
  }

  const localProfile = getStoredProfile();
  if (localProfile) {
    try {
      const restoredProfile = await startOnboardingSession(localProfile);
      setStoredProfile(restoredProfile);
      return restoredProfile;
    } catch {
      /* ignore and fall through to modal */
    }
  }

  return showOnboardingUntilDone(localProfile, {});
}

async function showBetaLoginUntilDone() {
  const shell = document.getElementById("comfortBetaLogin");
  if (!shell) {
    return;
  }
  comfortVt(() => {
    if (typeof comfortOverlayReveal === "function") {
      comfortOverlayReveal(shell);
    } else {
      shell.classList.remove("comfort-beta-overlay--hidden");
      shell.setAttribute("aria-hidden", "false");
    }
    document.body.classList.add("comfort--gate-active");
  });
  applyStaticI18n();
  return new Promise((resolve) => {
    const form = document.getElementById("comfortBetaLoginForm");
    if (!form) {
      document.body.classList.remove("comfort--gate-active");
      resolve();
      return;
    }
    const err = document.getElementById("comfortBetaLoginErr");
    const onSubmit = async (ev) => {
      ev.preventDefault();
      if (err) {
        err.hidden = true;
      }
      const u = document.getElementById("comfortBetaUser")?.value.trim() || "";
      const p = document.getElementById("comfortBetaPass")?.value || "";
      try {
        const lr = await fetch("/api/beta/login", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: u, password: p })
        });
        const lj = await lr.json().catch(() => ({}));
        if (!lr.ok) {
          if (err) {
            err.textContent = lj.error || t("beta_login_error");
            err.hidden = false;
          }
          return;
        }
        try {
          sessionStorage.removeItem("comfort_landing_demo_until_ms");
        } catch {
          /* ignore */
        }
        window.__COMFORT_LANDING_DEMO = false;
        window.__COMFORT_DEMO_EXPIRES_AT = null;
        stopDemoBar();
        comfortVt(() => {
          if (typeof comfortOverlayDismiss === "function") {
            comfortOverlayDismiss(shell);
          } else {
            shell.classList.add("comfort-beta-overlay--hidden");
            shell.setAttribute("aria-hidden", "true");
          }
          document.body.classList.remove("comfort--gate-active");
        });
        form.removeEventListener("submit", onSubmit);
        resolve();
      } catch {
        if (err) {
          err.textContent = t("beta_login_error");
          err.hidden = false;
        }
      }
    };
    form.addEventListener("submit", onSubmit);
  });
}

async function initComfortHostedMode() {
  document.body.classList.remove("comfort--gate-active");
  window.__COMFORT_HOSTED = false;
  window.__COMFORT_AI_COACH = false;
  window.__COMFORT_SUBSCRIBE_URL = "";
  window.__COMFORT_DEMO_EXPIRES_AT = null;
  window.__COMFORT_SESSION_ACTIVE = false;
  window.__COMFORT_REQUIRE_BETA_LOGIN = false;
  window.__COMFORT_LANDING_DEMO_MS = 0;
  window.__COMFORT_LANDING_DEMO = false;
  window.__COMFORT_PUBLIC_CFG = null;
  window.__COMFORT_SESSION_KIND = "";
  window.__COMFORT_PAID_ONBOARDING_REQUIRES_SUBSCRIPTION = false;
  window.__COMFORT_SUPPORT_EMAIL = "support@comfortledger.app";
  wireTrialModal();

  let cfg;
  try {
    const res = await fetch("/api/public-config", { credentials: "include" });
    if (!res.ok) {
      return;
    }
    cfg = await res.json();
  } catch {
    return;
  }
  if (!cfg || !cfg.ok || !cfg.comfortHosted) {
    return;
  }

  window.__COMFORT_PUBLIC_CFG = cfg;
  window.__COMFORT_HOSTED = true;
  window.__COMFORT_ACCESS_MODE = String(cfg.accessMode || "onboarding");
  window.__COMFORT_SUBSCRIBE_URL = String(cfg.subscribeUrl || "").trim() || "https://example.com";
  window.__COMFORT_AI_COACH = Boolean(cfg.aiCoachConfigured);
  const cmt = Number(cfg.coachMaxTokens);
  if (Number.isFinite(cmt) && cmt >= 80 && cmt <= 2000) {
    window.__COMFORT_COACH_MAX_TOKENS = Math.floor(cmt);
  }
  window.__COMFORT_REQUIRE_BETA_LOGIN = Boolean(cfg.requireBetaLogin);
  window.__COMFORT_PAID_ONBOARDING_REQUIRES_SUBSCRIPTION = Boolean(cfg.paidOnboardingRequiresSubscription);
  window.__COMFORT_SUPPORT_EMAIL = String(cfg.supportEmail || "").trim() || "support@comfortledger.app";
  window.__COMFORT_LANDING_DEMO_MS = Number(cfg.landingDemoMs) || 0;
  window.__COMFORT_PUSH_CONFIGURED = Boolean(cfg.pushConfigured);
  window.__COMFORT_PUSH_VAPID_PUBLIC_KEY = String(cfg.pushVapidPublicKey || "");
  document.body.classList.add("comfort--hosted");

  if (window.__COMFORT_ACCESS_MODE === "onboarding") {
    const onboardingProfile = await ensureOnboardingSession();
    window.__COMFORT_SESSION_ACTIVE = Boolean(onboardingProfile);
    window.__COMFORT_SESSION_KIND = window.__COMFORT_SESSION_ACTIVE ? "onboarding" : "";
    try {
      sessionStorage.removeItem("comfort_landing_demo_until_ms");
    } catch {
      /* ignore */
    }
    window.__COMFORT_DEMO_EXPIRES_AT = null;
    window.__COMFORT_LANDING_DEMO = false;
    stopDemoBar();
    renderHostedProfileCard();
    applyHostedCoachCopy();
  } else if (window.__COMFORT_ACCESS_MODE === "hybrid") {
    window.__COMFORT_SESSION_KIND = "";
    await ensureHybridEntry(cfg);
    renderHostedProfileCard();
    applyHostedCoachCopy();
  } else {
    const sessionJson = await fetchHostedSession("/api/beta/session");
    const wantsBetaGate = Boolean(cfg.requireBetaLogin && cfg.betaEnabled);

    if (sessionJson.authenticated) {
      try {
        sessionStorage.removeItem("comfort_landing_demo_until_ms");
      } catch {
        /* ignore */
      }
      window.__COMFORT_DEMO_EXPIRES_AT = null;
      window.__COMFORT_LANDING_DEMO = false;
      window.__COMFORT_SESSION_ACTIVE = true;
      window.__COMFORT_SESSION_KIND = "beta";
      stopDemoBar();
      applyHostedCoachCopy();
    } else if (wantsBetaGate) {
      await showBetaLoginUntilDone();
      const j2 = await fetchHostedSession("/api/beta/session");
      window.__COMFORT_SESSION_ACTIVE = Boolean(j2.authenticated);
      window.__COMFORT_SESSION_KIND = window.__COMFORT_SESSION_ACTIVE ? "beta" : "";
      try {
        sessionStorage.removeItem("comfort_landing_demo_until_ms");
      } catch {
        /* ignore */
      }
      window.__COMFORT_DEMO_EXPIRES_AT = null;
      window.__COMFORT_LANDING_DEMO = false;
      stopDemoBar();
      applyHostedCoachCopy();
    } else {
      window.__COMFORT_SESSION_ACTIVE = false;
      window.__COMFORT_SESSION_KIND = "";
      applyHostedCoachCopy();
      startLandingDemoCountdown(window.__COMFORT_LANDING_DEMO_MS);
    }
  }

  // After session is established, show trial countdown pill if applicable
  if (window.__COMFORT_SESSION_ACTIVE) {
    const storedProfile = typeof getStoredProfile === "function" ? getStoredProfile() : null;
    if (storedProfile?.email) {
      void fetchAndShowTrialStatus(storedProfile.email);
    }
  }

  if (comfortSessionPoll) {
    clearInterval(comfortSessionPoll);
  }
  comfortSessionPoll = setInterval(async () => {
    if (!window.__COMFORT_HOSTED || comfortTrialEnded) {
      return;
    }
    if (!window.__COMFORT_SESSION_ACTIVE) {
      return;
    }
    try {
      const mode = window.__COMFORT_ACCESS_MODE;
      if (mode === "onboarding") {
        const j = await fetchHostedSession("/api/onboarding/session");
        if (!j.authenticated) {
          const restoredProfile = await ensureOnboardingSession();
          window.__COMFORT_SESSION_ACTIVE = Boolean(restoredProfile);
          renderHostedProfileCard();
        } else {
          const sessionProfile = normalizeProfile(j.profile);
          if (sessionProfile) {
            setStoredProfile(sessionProfile);
          }
        }
        return;
      }
      if (mode === "beta") {
        const j = await fetchHostedSession("/api/beta/session");
        if (!j.authenticated) {
          window.__COMFORT_SESSION_ACTIVE = false;
          window.__COMFORT_SESSION_KIND = "";
          applyHostedCoachCopy();
        }
        return;
      }
      if (mode === "hybrid") {
        const kind = window.__COMFORT_SESSION_KIND || "onboarding";
        if (kind === "beta") {
          const j = await fetchHostedSession("/api/beta/session");
          if (!j.authenticated) {
            window.__COMFORT_SESSION_ACTIVE = false;
            window.__COMFORT_SESSION_KIND = "";
            applyHostedCoachCopy();
          }
        } else {
          const j = await fetchHostedSession("/api/onboarding/session");
          if (!j.authenticated) {
            await ensureHybridEntry(window.__COMFORT_PUBLIC_CFG || {});
            renderHostedProfileCard();
          } else {
            const sessionProfile = normalizeProfile(j.profile);
            if (sessionProfile) {
              setStoredProfile(sessionProfile);
            }
          }
        }
      }
    } catch {
      /* ignore */
    }
  }, 120000);
}

function applyPaidOnboardingCopy() {
  if (!window.__COMFORT_PAID_ONBOARDING_REQUIRES_SUBSCRIPTION) {
    return;
  }
  const intro = document.querySelector("#comfortOnboardingGate [data-i18n-html='onboarding_intro_html']");
  const emailLabel = document.querySelector("label[for='comfortOnboardingEmail']");
  const emailInput = document.getElementById("comfortOnboardingEmail");
  const support = window.__COMFORT_SUPPORT_EMAIL || "support@comfortledger.app";
  const lang = String(document.documentElement.lang || "").toLowerCase().startsWith("es") ? "es" : "en";
  if (intro) {
    intro.textContent =
      lang === "es"
        ? `Entra con el correo que usaste al pagar. Si acabas de comprar, el webhook puede tardar un minuto; soporte: ${support}.`
        : `Enter with the email you used at checkout. If you just paid, the webhook can take a minute; support: ${support}.`;
  }
  if (emailLabel) {
    emailLabel.textContent = lang === "es" ? "Correo usado al pagar" : "Email used at checkout";
  }
  if (emailInput) {
    emailInput.required = true;
    emailInput.placeholder = lang === "es" ? "tu-correo@ejemplo.com" : "you@example.com";
  }
}

function renderHostedProfileCard() {
  const card = document.getElementById("comfortProfileCard");
  const name = document.getElementById("comfortProfileName");
  const lifestyle = document.getElementById("comfortProfileLifestyle");
  const profile = getStoredProfile();
  const modeOk =
    window.__COMFORT_ACCESS_MODE === "onboarding" ||
    window.__COMFORT_ACCESS_MODE === "hybrid";
  const onboardingLike =
    modeOk &&
    window.__COMFORT_SESSION_KIND !== "beta";
  const shouldShow = Boolean(window.__COMFORT_HOSTED && onboardingLike && profile);
  if (!card || !name) {
    return;
  }
  card.hidden = !shouldShow;
  if (!shouldShow) {
    name.textContent = "—";
    if (lifestyle) {
      lifestyle.textContent = "";
      lifestyle.hidden = true;
    }
    return;
  }
  name.textContent = profile.displayName;
  if (lifestyle) {
    lifestyle.textContent = `${t("profile_lifestyle_prefix")} ${lifestyleLabel(profile.lifestyle || "simple")}`;
    lifestyle.hidden = false;
  }
}
