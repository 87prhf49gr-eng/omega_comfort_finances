/* Comfort Ledger extracted domain module (Hito D phase 3) */

async function showOnboardingUntilDone(existingProfile = null) {
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
  const err = document.getElementById("comfortOnboardingErr");
  const cancel = document.getElementById("comfortOnboardingCancel");

  if (nameInput) nameInput.value = profile?.displayName || "";
  if (emailInput) emailInput.value = profile?.email || "";
  if (focusInput) focusInput.value = profile?.focus || "";
  if (lifestyleInput) lifestyleInput.value = profile?.lifestyle || "simple";
  if (err) {
    err.hidden = true;
    err.textContent = "";
  }
  if (cancel) {
    cancel.hidden = !profile;
  }

  shell.classList.remove("comfort-beta-overlay--hidden");
  shell.setAttribute("aria-hidden", "false");
  document.body.classList.add("comfort--gate-active");
  applyStaticI18n();

  return new Promise((resolve) => {
    if (!form) {
      document.body.classList.remove("comfort--gate-active");
      resolve(profile);
      return;
    }

    const closeShell = () => {
      shell.classList.add("comfort-beta-overlay--hidden");
      shell.setAttribute("aria-hidden", "true");
      document.body.classList.remove("comfort--gate-active");
      form.removeEventListener("submit", onSubmit);
      cancel?.removeEventListener("click", onCancel);
    };

    const onCancel = () => {
      closeShell();
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
        lifestyle: lifestyleInput?.value || "simple"
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
        closeShell();
        resolve(savedProfile);
      } catch (error) {
        if (err) {
          err.textContent = String(error?.message || t("onboarding_error"));
          err.hidden = false;
        }
      }
    };

    form.addEventListener("submit", onSubmit);
    cancel?.addEventListener("click", onCancel);
  });
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

  return showOnboardingUntilDone(localProfile);
}

async function showBetaLoginUntilDone() {
  const shell = document.getElementById("comfortBetaLogin");
  if (!shell) {
    return;
  }
  shell.classList.remove("comfort-beta-overlay--hidden");
  shell.setAttribute("aria-hidden", "false");
  document.body.classList.add("comfort--gate-active");
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
        shell.classList.add("comfort-beta-overlay--hidden");
        shell.setAttribute("aria-hidden", "true");
        document.body.classList.remove("comfort--gate-active");
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

  window.__COMFORT_HOSTED = true;
  window.__COMFORT_ACCESS_MODE = String(cfg.accessMode || "onboarding");
  window.__COMFORT_SUBSCRIBE_URL = String(cfg.subscribeUrl || "").trim() || "https://example.com";
  window.__COMFORT_AI_COACH = Boolean(cfg.aiCoachConfigured);
  window.__COMFORT_REQUIRE_BETA_LOGIN = Boolean(cfg.requireBetaLogin);
  window.__COMFORT_LANDING_DEMO_MS = Number(cfg.landingDemoMs) || 0;
  window.__COMFORT_PUSH_CONFIGURED = Boolean(cfg.pushConfigured);
  window.__COMFORT_PUSH_VAPID_PUBLIC_KEY = String(cfg.pushVapidPublicKey || "");
  document.body.classList.add("comfort--hosted");

  if (window.__COMFORT_ACCESS_MODE === "onboarding") {
    const onboardingProfile = await ensureOnboardingSession();
    window.__COMFORT_SESSION_ACTIVE = Boolean(onboardingProfile);
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
      stopDemoBar();
      applyHostedCoachCopy();
    } else if (wantsBetaGate) {
      await showBetaLoginUntilDone();
      const j2 = await fetchHostedSession("/api/beta/session");
      window.__COMFORT_SESSION_ACTIVE = Boolean(j2.authenticated);
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
      const endpoint =
        window.__COMFORT_ACCESS_MODE === "onboarding" ? "/api/onboarding/session" : "/api/beta/session";
      const j = await fetchHostedSession(endpoint);
      if (!j.authenticated) {
        if (window.__COMFORT_ACCESS_MODE === "onboarding") {
          const restoredProfile = await ensureOnboardingSession();
          window.__COMFORT_SESSION_ACTIVE = Boolean(restoredProfile);
          renderHostedProfileCard();
        } else {
          window.__COMFORT_SESSION_ACTIVE = false;
          applyHostedCoachCopy();
        }
      } else if (window.__COMFORT_ACCESS_MODE === "onboarding") {
        const sessionProfile = normalizeProfile(j.profile);
        if (sessionProfile) {
          setStoredProfile(sessionProfile);
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
  const shouldShow = Boolean(window.__COMFORT_HOSTED && window.__COMFORT_ACCESS_MODE === "onboarding" && profile);
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
