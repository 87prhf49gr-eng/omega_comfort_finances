/* Comfort Ledger extracted domain module (Hito D phase 3) */

function comfortVt(fn) {
  if (typeof window !== "undefined" && typeof window.comfortRunViewTransition === "function") {
    window.comfortRunViewTransition(fn);
  } else {
    fn();
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

  return new Promise((resolve) => {
    if (!form) {
      document.body.classList.remove("comfort--gate-active");
      if (hybridRow) hybridRow.hidden = true;
      resolve(profile);
      return;
    }

    let hybridBetaHandler = null;

    const detachListeners = () => {
      form.removeEventListener("submit", onSubmit);
      cancel?.removeEventListener("click", onCancel);
      if (hybridBtn && hybridBetaHandler) hybridBtn.removeEventListener("click", hybridBetaHandler);
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
