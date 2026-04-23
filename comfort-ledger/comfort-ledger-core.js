/**
 * Comfort Ledger — standalone demo. No imports from BlackLedger Omega.
 */

const STORAGE_KEY = "comfort_ledger_v1";
const NOTIFY_LOG_KEY = "comfort_ledger_notify_v1";

window.__COMFORT_HOSTED = false;
window.__COMFORT_AI_COACH = false;
window.__COMFORT_ACCESS_MODE = "onboarding";
window.__COMFORT_SUBSCRIBE_URL = "";
window.__COMFORT_DEMO_EXPIRES_AT = null;
window.__COMFORT_SESSION_ACTIVE = false;
let comfortTrialEnded = false;
let comfortDemoInterval = null;
let comfortSessionPoll = null;

function purgeComfortLocalData() {
  try {
    const drop = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("comfort_")) {
        drop.push(k);
      }
    }
    drop.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

function applyHostedCoachCopy() {
  const coach = document.getElementById("coachPanel");
  if (!coach) return;

  const prefs = typeof loadCoachPrefs === "function" ? loadCoachPrefs() : { mode: "local", apiKey: "" };
  const userOpenAI = prefs.mode === "openai" && prefs.apiKey;
  const hostedOpenAI = window.__COMFORT_HOSTED && window.__COMFORT_AI_COACH;

  const badge = coach.querySelector(".coach-badge");
  const intro = coach.querySelector(".coach-intro");
  const status = document.getElementById("coachStatus");

  if (userOpenAI) {
    if (badge) badge.textContent = t("coach_badge_cloud");
    if (intro) intro.innerHTML = sanitizeI18nHtml(t("coach_intro_cloud_html"));
    if (status) status.textContent = t("coach_status_direct");
    return;
  }

  if (hostedOpenAI) {
    if (badge) badge.textContent = t("coach_badge_cloud");
    if (intro) intro.innerHTML = sanitizeI18nHtml(t("coach_intro_cloud_html"));
    if (status) status.textContent = t("coach_status_cloud");
    return;
  }

  if (badge) badge.textContent = t("coach_badge");
}

function formatDemoClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function getDemoRemainingMs() {
  const exp = window.__COMFORT_DEMO_EXPIRES_AT;
  if (!exp) {
    return 0;
  }
  const end = new Date(exp).getTime();
  if (!Number.isFinite(end)) {
    return 0;
  }
  return Math.max(0, end - Date.now());
}

function startLandingDemoCountdown(ms) {
  const n = Number(ms) || 0;
  if (n <= 0) {
    window.__COMFORT_LANDING_DEMO = false;
    window.__COMFORT_DEMO_EXPIRES_AT = null;
    stopDemoBar();
    return;
  }
  window.__COMFORT_LANDING_DEMO = true;
  const key = "comfort_landing_demo_until_ms";
  let until = 0;
  try {
    until = Number(sessionStorage.getItem(key) || 0);
  } catch {
    until = 0;
  }
  const now = Date.now();
  if (!until || until < now) {
    until = now + n;
    try {
      sessionStorage.setItem(key, String(until));
    } catch {
      /* ignore */
    }
  }
  window.__COMFORT_DEMO_EXPIRES_AT = new Date(until).toISOString();
  showDemoBar();
}

function updateDemoBar() {
  const bar = document.getElementById("comfortBetaDemoBar");
  if (!bar || !window.__COMFORT_HOSTED) {
    return;
  }
  if (!window.__COMFORT_DEMO_EXPIRES_AT) {
    bar.classList.add("comfort-beta-demo--hidden");
    return;
  }
  const left = getDemoRemainingMs();
  const prefix = window.__COMFORT_LANDING_DEMO ? t("landing_demo_prefix") : t("beta_demo_prefix");
  bar.textContent = `${prefix} ${formatDemoClock(left)}`;
}

function showDemoBar() {
  const bar = document.getElementById("comfortBetaDemoBar");
  if (!bar) {
    return;
  }
  if (!window.__COMFORT_DEMO_EXPIRES_AT) {
    bar.classList.add("comfort-beta-demo--hidden");
    return;
  }
  bar.classList.remove("comfort-beta-demo--hidden");
  updateDemoBar();
  if (comfortDemoInterval) {
    clearInterval(comfortDemoInterval);
  }
  comfortDemoInterval = setInterval(() => {
    updateDemoBar();
    if (window.__COMFORT_DEMO_EXPIRES_AT && getDemoRemainingMs() <= 0 && !comfortTrialEnded) {
      void endComfortDemoTrial();
    }
  }, 1000);
}

function stopDemoBar() {
  if (comfortDemoInterval) {
    clearInterval(comfortDemoInterval);
    comfortDemoInterval = null;
  }
  const bar = document.getElementById("comfortBetaDemoBar");
  if (bar) {
    bar.classList.add("comfort-beta-demo--hidden");
  }
}

async function endComfortDemoTrial() {
  if (comfortTrialEnded) {
    return;
  }
  comfortTrialEnded = true;
  const hadBetaSession = Boolean(window.__COMFORT_SESSION_ACTIVE);
  window.__COMFORT_SESSION_ACTIVE = false;
  window.__COMFORT_LANDING_DEMO = false;
  window.__COMFORT_DEMO_EXPIRES_AT = null;
  stopDemoBar();
  try {
    sessionStorage.removeItem("comfort_landing_demo_until_ms");
  } catch {
    /* ignore */
  }
  purgeComfortLocalData();
  if (hadBetaSession) {
    try {
      await fetch("/api/beta/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
    } catch {
      /* ignore */
    }
  }
  const thread = document.getElementById("coachThread");
  if (thread) {
    thread.innerHTML = "";
  }
  const modal = document.getElementById("comfortBetaTrialEnd");
  const subBtn = document.getElementById("comfortBetaSubscribeBtn");
  if (subBtn && window.__COMFORT_SUBSCRIBE_URL) {
    subBtn.setAttribute("href", window.__COMFORT_SUBSCRIBE_URL);
  }
  if (modal) {
    modal.classList.remove("comfort-beta-overlay--hidden");
    modal.setAttribute("aria-hidden", "false");
    applyStaticI18n();
  }
  state = loadState();
  try {
    if (typeof renderAll === "function") {
      renderAll();
    }
  } catch {
    /* ignore */
  }
}

function wireTrialModal() {
  const dismiss = document.getElementById("comfortBetaTrialDismiss");
  if (dismiss && !dismiss.dataset.comfortWired) {
    dismiss.dataset.comfortWired = "1";
    dismiss.addEventListener("click", () => {
      const modal = document.getElementById("comfortBetaTrialEnd");
      if (modal) {
        modal.classList.add("comfort-beta-overlay--hidden");
        modal.setAttribute("aria-hidden", "true");
      }
      window.location.reload();
    });
  }
}

async function fetchHostedSession(endpoint) {
  try {
    const res = await fetch(endpoint, { credentials: "include" });
    if (!res.ok) {
      return {};
    }
    return await res.json();
  } catch {
    return {};
  }
}

async function startOnboardingSession(profile) {
  const normalized = normalizeProfile(profile);
  if (!normalized) {
    throw new Error(t("onboarding_error"));
  }
  const res = await fetch("/api/onboarding/start", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile: normalized, language: UI_LOCALE })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || t("onboarding_error"));
  }
  return normalizeProfile(data.profile || normalized) || normalized;
}

/* extracted to comfort-ledger-onboarding.js: showOnboardingUntilDone */

/* extracted to comfort-ledger-onboarding.js: ensureOnboardingSession */

/* extracted to comfort-ledger-onboarding.js: showBetaLoginUntilDone */

/* extracted to comfort-ledger-onboarding.js: initComfortHostedMode */

/* extracted to comfort-ledger-coach.js: coach constants */

/* extracted to comfort-ledger-coach.js: setupCoachSettingsModal */

/* extracted to comfort-ledger-coach.js: applyCoachBadge */

/* extracted to comfort-ledger-coach.js: loadCoachPrefs */

/* extracted to comfort-ledger-coach.js: saveCoachPrefs */

/* extracted to comfort-ledger-coach.js: buildCoachContextPayload */

/* extracted to comfort-ledger-coach.js: comfortCoachAskOpenAIDirect */

/* extracted to comfort-ledger-coach.js: comfortCoachAskOpenAI */

const UTILITY_CATEGORY_KEYS = [
  "rent",
  "water",
  "electric",
  "gas",
  "insurance",
  "phone",
  "internet",
  "condo",
  "other"
];

const SUBSCRIPTION_SERVICES = [
  { id: "netflix", unsub: "https://www.netflix.com/account/cancelplan" },
  { id: "disney", unsub: "https://www.disneyplus.com/account/cancel-subscription" },
  { id: "hulu", unsub: "https://www.hulu.com/account" },
  { id: "hbo", unsub: "https://www.max.com/account" },
  { id: "prime", unsub: "https://www.amazon.com/gp/primecentral" },
  { id: "apple_tv", unsub: "https://tv.apple.com/account/subscriptions" },
  { id: "youtube", unsub: "https://www.youtube.com/paid_memberships" },
  { id: "spotify", unsub: "https://www.spotify.com/account/subscription/" },
  { id: "apple_music", unsub: "https://music.apple.com/for-you" },
  { id: "paramount", unsub: "https://www.paramountplus.com/account/" },
  { id: "peacock", unsub: "https://www.peacocktv.com/account" },
  { id: "dropbox", unsub: "https://www.dropbox.com/account/plan" },
  { id: "icloud", unsub: "https://www.icloud.com/settings/" },
  { id: "microsoft365", unsub: "https://account.microsoft.com/services" },
  { id: "adobe", unsub: "https://account.adobe.com/plans" },
  { id: "chatgpt", unsub: "https://chat.openai.com/#settings/Subscription" },
  { id: "custom", unsub: "" }
];

function subscriptionServiceDef(id) {
  return SUBSCRIPTION_SERVICES.find((s) => s.id === id) || SUBSCRIPTION_SERVICES[SUBSCRIPTION_SERVICES.length - 1];
}

const EXPENSE_CATEGORIES = [
  "Comida fuera",
  "Supermercado",
  "Cafe y snacks",
  "Transporte publico",
  "Gasolina y estacionamiento",
  "Auto mantenimiento",
  "Renta o hipoteca",
  "Servicios hogar",
  "Luz gas agua",
  "Internet y telefono",
  "Muebles y hogar",
  "Limpieza y hogar",
  "Salud y medicina",
  "Gimnasio y bienestar",
  "Seguros",
  "Educacion y cursos",
  "Ninos y familia",
  "Mascotas",
  "Ropa y calzado",
  "Cuidado personal",
  "Entretenimiento",
  "Viajes y hospedaje",
  "Suscripciones y software",
  "Trabajo y oficina",
  "Regalos y donaciones",
  "Impuestos y honorarios",
  "Pagos de deuda",
  "Ahorro e inversion",
  "Multas e imprevistos",
  "Otros"
];

const CATEGORY_EN = [
  "Dining out",
  "Groceries",
  "Coffee & snacks",
  "Public transit",
  "Gas & parking",
  "Car maintenance",
  "Rent or mortgage",
  "Home services",
  "Utilities",
  "Internet & phone",
  "Furniture & home",
  "Cleaning & home",
  "Health & medicine",
  "Gym & wellness",
  "Insurance",
  "Education & courses",
  "Kids & family",
  "Pets",
  "Clothing & shoes",
  "Personal care",
  "Entertainment",
  "Travel & lodging",
  "Subscriptions & software",
  "Work & office",
  "Gifts & donations",
  "Taxes & fees",
  "Debt payments",
  "Saving & investing",
  "Fines & surprises",
  "Other"
];

const CATEGORY_ZH = [
  "外出就餐",
  "超市杂货",
  "咖啡零食",
  "公共交通",
  "油费停车",
  "汽车保养",
  "房租房贷",
  "家庭服务",
  "水电燃气",
  "网络电话",
  "家具家居",
  "清洁家务",
  "医疗健康",
  "健身康体",
  "保险",
  "教育课程",
  "子女家庭",
  "宠物",
  "服装鞋靴",
  "个人护理",
  "娱乐",
  "旅行住宿",
  "订阅软件",
  "工作办公",
  "礼品捐赠",
  "税费手续费",
  "还贷付款",
  "储蓄投资",
  "罚款意外",
  "其他"
];

const LOCALE_KEY = "comfort_ledger_locale";

const UI_STRINGS = {
  es: {
    page_title: "Comfort Ledger — Resumen y coach",
    meta_description: "Resumen financiero minimalista: ingresos, gastos y deuda con coach IA.",
    lang_label: "Idioma",
    brand_eyebrow: "Vista patrimonial",
    tagline: "Menos ruido. Más claridad.",
    pill_local: "100% local",
    pill_offline: "Sin conexión a red",
    pill_device_data: "Datos en este dispositivo",
    pill_network_coach: "Coach vía servidor (IA)",
    backup_export: "Exportar respaldo",
    backup_import: "Importar…",
    backup_import_confirm:
      "¿Reemplazar todos los datos actuales con el archivo importado? Esta acción no se puede deshacer.",
    backup_import_ok: "Importación correcta. Datos guardados en este dispositivo.",
    backup_import_err_invalid: "El archivo no es un respaldo válido de Comfort Ledger.",
    backup_import_err_read: "No se pudo leer el archivo.",
    health_title: "Resumen de salud",
    goals_title: "Metas con tus cobros",
    goals_add: "+ Meta",
    goals_sub_html:
      "Define <strong>monto objetivo</strong> (vacaciones, enganche de auto, etc.) y <strong>meses</strong> para lograrlo. Calculamos cuánto apartar <strong>cada mes del cheque</strong>; los totales aparecen en el <strong>Resumen de salud</strong> de arriba.",
    chart_flow_title: "Flujo del mes",
    chart_flow_sub: "Ingreso vs gasto mensualizado vs carga de deuda",
    donut_aria: "Gráfico de flujo del ingreso",
    chart_cushion_title: "Colchón vs deuda",
    chart_cushion_sub: "Visual honesto: ahorros frente a lo que debes",
    cushion_aria: "Comparación ahorros y deuda",
    chart_cadence_title: "Ritmo de gastos",
    chart_cadence_sub: "Por cadencia: diario, semanal o mensual (equivalente al mes)",
    cadence_aria: "Gastos por cadencia",
    chart_card_title: "Deuda en tarjetas vs ingreso",
    chart_card_sub_html:
      "Suma solo filas marcadas como <strong>Tarjeta</strong>; comparado a tu ingreso mensual total",
    card_debt_aria: "Deuda en tarjetas frente al ingreso",
    coach_title: "Coach IA",
    coach_badge: "Asesor local",
    coach_intro_html:
      "Pregunta por tu mes, deudas o zona de confort. Este coach es <strong>local</strong> (reglas + tus números): no conecta con BlackLedger Omega ni con internet.",
    coach_input_label: "Mensaje al coach",
    coach_placeholder: "Ej.: ¿Estoy cómodo con 10k ahorrados si debo 9.2k?",
    coach_send: "Enviar",
    coach_status: "Coach local (reglas + tus números). No llama a Omega ni a internet.",
    onboarding_title: "Tu espacio en Comfort Ledger",
    onboarding_intro_html:
      "Antes de entrar, deja tu <strong>nombre</strong> y, si quieres, tu <strong>correo</strong> y tu enfoque. Lo guardamos <strong>en este dispositivo</strong> para que vuelvas directo.",
    onboarding_name: "Nombre",
    onboarding_email: "Correo (opcional)",
    onboarding_focus: "¿Qué quieres ordenar primero?",
    onboarding_focus_placeholder: "Ej.: suscripciones, tarjetas, flujo mensual o metas.",
    onboarding_lifestyle: "Tu situación principal",
    onboarding_lifestyle_payroll: "Nómina",
    onboarding_lifestyle_freelance: "Freelance",
    onboarding_lifestyle_family: "Familia",
    onboarding_lifestyle_student: "Estudiante",
    onboarding_lifestyle_simple: "Solo orden rápido",
    onboarding_template_applied: "Aplicamos una plantilla inicial para {mode}. Puedes editar todo.",
    profile_lifestyle_prefix: "Modo:",
    onboarding_submit: "Continuar",
    onboarding_cancel: "Cerrar",
    onboarding_error: "No se pudo guardar tu acceso. Revisa tus datos e inténtalo otra vez.",
    onboarding_saved_note: "Guardado en este dispositivo.",
    onboarding_edit: "Editar perfil",
    beta_login_title: "Comfort Ledger — Beta",
    beta_login_intro: "Acceso restringido. Usa el usuario y contraseña que te enviaron.",
    beta_login_user: "Usuario",
    beta_login_pass: "Contraseña",
    beta_login_submit: "Entrar",
    beta_login_error: "No se pudo entrar. Revisa usuario y contraseña.",
    beta_demo_prefix: "Demo beta — quedan",
    landing_demo_prefix: "Demo (visitante) — quedan",
    beta_trial_title: "Prueba terminada",
    beta_trial_body_html:
      "La <strong>demo desde el navegador</strong> (sin sesión beta) terminó. Se borró la información de prueba guardada aquí. Los usuarios beta con sesión iniciada no tienen este límite de tiempo. Suscríbete o entra con tu acceso beta para continuar.",
    beta_trial_subscribe: "Suscribirse",
    beta_trial_cancel: "Cerrar",
    coach_badge_cloud: "OpenAI",
    coach_intro_cloud_html:
      "Pregunta por tu mes, deudas o zona de confort. Este coach usa <strong>OpenAI</strong> en el servidor: se envía un <strong>resumen numérico</strong> de tu vista (no números de cuenta bancaria).",
    coach_status_cloud:
      "Coach OpenAI (servidor). Respuestas con IA; no guardamos datos de tarjetas ni claves.",
    coach_status_direct:
      "Coach OpenAI (tu API key). Tu pregunta y un resumen anónimo van a OpenAI desde este navegador.",
    coach_loading: "Pensando…",
    coach_error_generic: "No se pudo obtener respuesta del coach.",
    coach_settings_aria: "Ajustes del coach",
    coach_settings_title: "Ajustes del coach",
    coach_settings_intro:
      "Elige cómo responde el coach. Tu elección se guarda solo en este dispositivo.",
    coach_settings_mode_legend: "Modo del coach",
    coach_mode_local_title: "Local — rápido y privado",
    coach_mode_local_desc: "Reglas + tus cifras. Cero datos salen del navegador.",
    coach_mode_openai_title: "OpenAI — respuestas más ricas",
    coach_mode_openai_desc:
      "Usa tu propia API key. Tu pregunta + un resumen anónimo van a OpenAI. Respuestas más conversacionales.",
    coach_openai_key_label: "Tu API key de OpenAI",
    coach_openai_key_placeholder: "sk-...",
    coach_openai_model_label: "Modelo",
    coach_openai_hint_html:
      "Obtén tu API key en <a href=\"https://platform.openai.com/api-keys\" target=\"_blank\" rel=\"noopener noreferrer\">platform.openai.com/api-keys</a>. Cada consulta cuesta fracciones de centavo. La key se guarda <strong>solo en este dispositivo</strong>.",
    coach_openai_warn:
      "No compartas tu navegador con otras personas si guardas la key aquí.",
    coach_openai_key_missing: "Pega tu API key de OpenAI para activar este modo.",
    coach_openai_key_format: "La API key debe empezar por sk- y tener al menos 20 caracteres.",
    coach_openai_key_invalid: "API key rechazada por OpenAI. Revisa o regenérala.",
    coach_openai_rate_limit: "OpenAI te pidió esperar un momento (rate limit). Reintenta en unos segundos.",
    coach_openai_server_err: "OpenAI tuvo un problema interno. Reintenta en un minuto.",
    coach_openai_network_err: "No pude contactar con OpenAI. Revisa tu conexión.",
    coach_openai_empty: "OpenAI respondió sin texto. Intenta reformular la pregunta.",
    coach_settings_save: "Guardar",
    coach_settings_close: "Cerrar",
    twin_clocks_title: "Chicago y Nueva York",
    twin_clocks_sub: "Hora local en cada ciudad; se calcula en tu dispositivo (sin internet).",
    income_title: "Ingresos",
    expenses_title: "Gastos",
    debts_title: "Deudas",
    add_row: "+ Agregar",
    income_sub_html:
      "Cada cobro lleva <strong>fecha</strong> (calendario). El resumen y los gráficos suman solo lo del <strong>mes calendario en curso</strong>. Lo nuevo queda arriba.",
    liquid_label: "Efectivo / ahorros líquidos hoy",
    expenses_sub_html:
      "<strong>Categoría</strong> + concepto. Cadencia <strong>diaria, semanal o mensual</strong>. Lo nuevo queda arriba.",
    debts_sub_html:
      "Marca <strong>Tarjeta</strong> para que cuente en el gráfico vs ingreso. Lo nuevo queda arriba.",
    dash_title: "Informe ejecutivo",
    dash_sub:
      "Misma información que arriba, en porcentaje del ingreso del mes y lectura compacta tipo sala de juntas.",
    income_date: "Fecha cobro",
    income_label: "Concepto",
    income_amount: "Monto cobrado",
    expense_category: "Categoría",
    expense_label: "Concepto",
    expense_amount: "Monto",
    expense_cadence: "Cadencia",
    cadence_d: "Diario",
    cadence_w: "Semanal",
    cadence_m: "Mensual",
    cadence_b: "Quincenal",
    cadence_o: "Una vez",
    income_cadence: "Recurrencia",
    income_empty_title: "Aún no has agregado ingresos.",
    income_empty_sub: "Empieza por tu sueldo o tu cobro principal. Eso sostiene todo lo demás.",
    income_empty_cta: "Añadir ingreso",
    expense_empty_title: "Todavía no hay gastos aquí.",
    expense_empty_sub: "Agrega tu renta, servicios o ese café de cada día. Cuanto más real, mejor te cuadra el mes.",
    expense_empty_cta: "Añadir gasto",
    debt_empty_title: "Sin deudas registradas. Buena noticia.",
    debt_empty_sub: "Si tienes tarjetas, préstamos o pagos a plazos, añádelos para tener la foto completa.",
    debt_empty_cta: "Añadir deuda",
    undo_deleted_income: "Ingreso eliminado",
    undo_deleted_expense: "Gasto eliminado",
    undo_deleted_debt: "Deuda eliminada",
    undo_action: "Deshacer",
    saved_label: "Guardado",
    kpi_empty_title: "Añade tu primer ingreso",
    kpi_empty_sub: "Así podemos calcular si te alcanza el mes.",
    kpi_free_label: "Libres después de todo este mes",
    kpi_warn: "Cuidado: gastos + deuda ≥ ingreso",
    kpi_neg: "Estás en rojo este mes",
    kpi_ok: "Zona de confort",
    kpi_tight: "Mes ajustado",
    debt_type: "Tipo",
    debt_label: "Concepto",
    debt_balance: "Balance",
    debt_min: "Pago mín.",
    debt_type_card: "Tarjeta",
    debt_type_other: "Otra deuda",
    goal_name: "Meta (nombre)",
    goal_target: "Monto objetivo",
    goal_months: "Meses",
    goal_apart_hint: "Apartar / mes",
    goal_apart_title: "Del cheque, cada mes hasta la meta",
    goals_empty_html:
      "Ej.: vacaciones, enganche de auto. Pon el <strong>monto total</strong> y en <strong>cuántos meses</strong> lo quieres; el apartado mensual se ve aquí y en el <strong>Resumen de salud</strong> de arriba.",
    goals_summary_empty: "Sin metas aún.",
    goals_last_label: "Meta más reciente:",
    goals_scroll_aria: "Lista de metas; desplaza hacia abajo para ver las más antiguas.",
    remove_aria: "Quitar",
    remove_goal_aria: "Quitar meta",
    health_goal_monthly: "Apartado a metas (cada mes)",
    health_free_after_goals: "Libre tras gastos, mínimos y metas",
    health_income: "Ingreso cobrado",
    health_expenses: "Gastos (mensualizado)",
    health_debt_min: "Mínimos deuda",
    health_free_after: "Libre post gastos + mínimos",
    health_savings: "Ahorros líquidos",
    health_debt_total: "Deuda total",
    dash_dyn_title: "Dinámica del mes",
    dash_dyn_hint: "% del ingreso cobrado",
    dash_dyn_pct_title: "% del ingreso del mes",
    dash_radar_title: "Radar de carga",
    dash_radar_hint: "Misma escala 0–100% en cada eje",
    dash_radar_aria: "Radar de asignación del ingreso",
    dash_orbit_title: "Órbita del ingreso",
    dash_orbit_leg_spend: "Gastos",
    dash_orbit_leg_debt: "Mín. deuda",
    dash_orbit_leg_goals: "Metas / mes",
    dash_orbit_leg_free: "Libre tras metas",
    dash_orbit_leg_rest: "Sin asignar",
    dash_cat_title: "Gasto por categoría",
    dash_cat_hint: "Mensualizado (equivalente al mes)",
    dash_cat_empty: "Sin gastos: agrega filas en Gastos para ver categorías.",
    dash_goal_title: "Colchón vs meta",
    dash_goal_hint: "Qué % de cada meta cubren tus ahorros líquidos hoy",
    dash_goal_empty:
      "Sin metas con monto: define objetivos arriba para ver arcos de cobertura con tu colchón.",
    dash_goal_arc_title: "Colchón líquido vs meta total",
    donut_leg_exp: "Gasto mensualizado",
    donut_leg_exp_pct: "del ingreso del mes",
    donut_leg_debt: "Pagos mínimos deuda",
    donut_leg_debt_pct: "del ingreso",
    donut_leg_free: "Resto / margen",
    donut_footnote: "Ingreso del donut: suma de filas con fecha en",
    cadence_d_label: "Diario → mes",
    cadence_w_label: "Semanal → mes",
    cadence_m_label: "Mensual",
    cadence_total: "Total mensualizado:",
    cushion_none: "Sin deuda registrada: toda la barra refleja ahorros líquidos.",
    cushion_ok:
      "Ahorros {s} vs deuda {d}: el colchón cubre el pasivo, pero mira el mensaje de salud por el flujo mensual.",
    cushion_low: "Ahorros {s} por debajo de deuda {d}: visualmente la deuda pesa más que tu colchón.",
    card_income: "Ingreso del mes",
    card_debt: "Deuda tarjetas",
    card_ratio_none: "Sin saldo marcado como “Tarjeta”, o todo está en “Otra deuda”.",
    card_ratio_lt: "La deuda en tarjetas es ~{p}% del ingreso cobrado en {m}.",
    card_ratio_gte: "La deuda en tarjetas equivale a ~{r} veces el ingreso cobrado en {m}.",
    world_chicago: "Chicago",
    world_newyork: "Nueva York",
    world_clock_fail: "No se pudieron mostrar los horarios (zona horaria no soportada en este navegador).",
    dyn_spend: "Gastos",
    dyn_debt: "Mín. deuda",
    dyn_goals: "Metas",
    dyn_free: "Libre",
    dyn_cushion: "Colchón",
    new_income_label: "Cobro",
    new_expense_label: "Nuevo gasto",
    new_debt_label: "Nueva deuda",
    new_goal_label: "Vacaciones o enganche",
    default_income_label: "Cobro principal",
    default_goal_name: "Meta",
    recurring_title: "Pagos recurrentes",
    recurring_add: "+ Agregar",
    recurring_sub_html:
      "Anota <strong>renta, seguros o suscripciones</strong> y el <strong>día del mes</strong> en que suele cargarse. Si pones una <strong>URL de pago</strong>, al tocar el aviso abrimos esa página; si no, te llevamos a esta fila. Avisos <strong>3 días antes</strong> y el <strong>día del pago</strong> (permiso del navegador; con la app totalmente cerrada hace falta Web Push desde un servidor, usando el mismo <code>data.url</code> para abrir al tocar).",
    recurring_label: "Nombre / servicio",
    recurring_day: "Día de cargo (1–31)",
    recurring_pay_url: "URL para pagar (opcional)",
    recurring_amount_opt: "Monto (opcional)",
    recurring_next: "Próximo cargo",
    recurring_in_days: "en {n} días",
    recurring_today: "hoy",
    recurring_cancel: "Cancelar suscripción",
    recurring_reactivate: "Reactivar",
    recurring_status_cancelled: "Cancelada",
    recurring_notify_btn: "Activar avisos del sistema",
    recurring_notify_btn_granted: "Listo",
    recurring_notify_active: "Avisos del sistema activados",
    recurring_notify_denied: "Avisos bloqueados en el navegador",
    recurring_notify_default: "Pulsa para permitir avisos del navegador",
    recurring_go_pay: "Ir a pagar",
    recurring_empty: "Aún no hay pagos recurrentes. Agrega renta, seguros o suscripciones.",
    recurring_notif_before_title: "Pronto: pago recurrente",
    recurring_notif_before_body: "{label} — en 3 días ({date}).{amt}",
    recurring_notif_due_title: "Hoy toca pagar",
    recurring_notif_due_body: "{label} — día de cargo ({date}).{amt}",
    today_banner_due_title: "Hoy toca pagar",
    today_banner_soon_title: "Pronto vence",
    today_banner_due_more: "y {n} más hoy.",
    today_banner_soon_more: "y {n} más en los próximos días.",
    budgets_section_title: "Presupuestos por categoría",
    budgets_add: "+ Agregar",
    budgets_section_sub_html:
      "Define un tope mensual por categoría y te avisamos al llegar al <strong>80%</strong> y al <strong>100%</strong>.",
    budgets_empty: "Aún no tienes presupuestos. Agrega uno para vigilar tu gasto por categoría.",
    budgets_summary_empty: "Sin presupuestos activos.",
    budgets_summary_main: "Gastado {spent} de {budget} ({ratio}%). Categorías pasadas: {over}.",
    budgets_monthly: "Tope mensual",
    budgets_meta_spent: "Gastado: {spent}",
    budgets_meta_ratio: "{n}% del presupuesto",
    budget_alert_warn_title: "Alerta de presupuesto (80%)",
    budget_alert_warn_body: "{label}: llevas {spent} de {budget}.",
    budget_alert_over_title: "Presupuesto superado",
    budget_alert_over_body: "{label}: ya gastaste {spent} (tope {budget}).",
    weekly_title: "Check-in semanal",
    weekly_dismiss: "Ocultar esta semana",
    weekly_income: "Ingreso del mes",
    weekly_expenses: "Gasto mensualizado",
    weekly_free: "Libre después de metas",
    weekly_top_empty: "Sin gastos suficientes para destacar categorías.",
    new_recurring_label: "Nueva suscripción",
    post_dash_hint_html:
      "Debajo del <strong>Informe ejecutivo</strong>: servicios del hogar a la izquierda y <strong>suscripciones</strong> a la derecha. Activa avisos para recordatorios 3 días antes y el día del cargo (mejor con la app servida por <code>https</code> o <code>localhost</code>).",
    utility_section_title: "Hogar y servicios",
    utility_section_sub_html:
      "Renta, agua, luz, gas, seguros, teléfono, etc. La franja oscura muestra el <strong>último registro</strong> (la fila de arriba); desplázate para editar categoría, monto, fecha y día de recordatorio.",
    utility_add: "+ Agregar",
    utility_list_empty: "Sin filas: agrega renta, luz u otros servicios.",
    utility_summary_empty: "Sin datos aún.",
    utility_last_label: "Último:",
    utility_category: "Categoría",
    utility_notes: "Nota / referencia",
    utility_amount: "Monto",
    utility_date: "Fecha de referencia",
    utility_reminder_day: "Día de recordatorio (mes)",
    utility_reminder_next: "Próximo aviso",
    utility_cat_rent: "Renta / hipoteca",
    utility_cat_water: "Agua",
    utility_cat_electric: "Luz / electricidad",
    utility_cat_gas: "Gas",
    utility_cat_insurance: "Seguro",
    utility_cat_phone: "Teléfono móvil",
    utility_cat_internet: "Internet / TV",
    utility_cat_condo: "Condominio / basura",
    utility_cat_other: "Otro",
    sub_section_title: "Suscripciones",
    sub_section_sub_html:
      "Elige servicio, cadencia y monto. El botón amarillo abre la <strong>página oficial</strong> para darte de baja (Netflix, Disney+, etc.).",
    sub_add: "+ Agregar",
    sub_list_empty: "Sin suscripciones registradas.",
    sub_summary_empty: "Sin datos aún.",
    sub_last_label: "Última:",
    sub_service: "Servicio",
    sub_charge_day: "Día habitual de cargo (mes)",
    sub_monthly_equiv: "Equiv. mensual aprox.",
    sub_custom_name: "Nombre (otro servicio)",
    sub_custom_unsub: "Enlace para darse de baja (https…)",
    sub_unsubscribe_btn: "Darse de baja",
    subsvc_netflix: "Netflix",
    subsvc_disney: "Disney+",
    subsvc_hulu: "Hulu",
    subsvc_hbo: "Max (HBO)",
    subsvc_prime: "Amazon Prime",
    subsvc_apple_tv: "Apple TV+",
    subsvc_youtube: "YouTube Premium",
    subsvc_spotify: "Spotify",
    subsvc_apple_music: "Apple Music",
    subsvc_paramount: "Paramount+",
    subsvc_peacock: "Peacock",
    subsvc_dropbox: "Dropbox",
    subsvc_icloud: "iCloud+",
    subsvc_microsoft365: "Microsoft 365",
    subsvc_adobe: "Adobe",
    subsvc_chatgpt: "ChatGPT Plus",
    subsvc_custom: "Otro (manual)"
  },
  en: {
    page_title: "Comfort Ledger — Summary & coach",
    meta_description: "Minimal finance snapshot: income, expenses, and debt with a local AI-style coach.",
    lang_label: "Language",
    brand_eyebrow: "Wealth snapshot",
    tagline: "Less noise. More clarity.",
    pill_local: "100% on-device",
    pill_offline: "No network",
    pill_device_data: "Data stays on this device",
    pill_network_coach: "Coach uses network (AI)",
    backup_export: "Export backup",
    backup_import: "Import…",
    backup_import_confirm:
      "Replace all current data with the imported file? This cannot be undone.",
    backup_import_ok: "Import complete. Data saved on this device.",
    backup_import_err_invalid: "This file is not a valid Comfort Ledger backup.",
    backup_import_err_read: "Could not read the file.",
    health_title: "Health summary",
    goals_title: "Goals from your paychecks",
    goals_add: "+ Goal",
    goals_sub_html:
      "Set a <strong>target amount</strong> (vacation, car down payment, etc.) and <strong>months</strong> to get there. We estimate how much to set aside <strong>each month from your check</strong>; totals roll into the <strong>Health summary</strong> above.",
    chart_flow_title: "Month cash flow",
    chart_flow_sub: "Income vs monthly expenses vs debt load",
    donut_aria: "Income flow chart",
    chart_cushion_title: "Cushion vs debt",
    chart_cushion_sub: "Straight view: savings vs what you owe",
    cushion_aria: "Savings and debt comparison",
    chart_cadence_title: "Spending rhythm",
    chart_cadence_sub: "By cadence: daily, weekly, or monthly (month equivalent)",
    cadence_aria: "Spending by cadence",
    chart_card_title: "Card debt vs income",
    chart_card_sub_html: "Only rows marked <strong>Card</strong>; compared to your total monthly income",
    card_debt_aria: "Credit card debt vs income",
    coach_title: "AI coach",
    coach_badge: "Local advisor",
    coach_intro_html:
      "Ask about your month, debt, or comfort zone. This coach is <strong>local</strong> (rules + your numbers): it does not connect to BlackLedger Omega or the internet.",
    coach_input_label: "Message to coach",
    coach_placeholder: "E.g.: Am I comfortable with 10k saved if I owe 9.2k?",
    coach_send: "Send",
    coach_status: "Local coach (rules + your numbers). Does not call Omega or the internet.",
    onboarding_title: "Your space in Comfort Ledger",
    onboarding_intro_html:
      "Before you enter, leave your <strong>name</strong> and, if you want, your <strong>email</strong> and focus. We keep it <strong>on this device</strong> so you come back straight in.",
    onboarding_name: "Name",
    onboarding_email: "Email (optional)",
    onboarding_focus: "What do you want to organize first?",
    onboarding_focus_placeholder: "E.g. subscriptions, card debt, monthly cash flow, or goals.",
    onboarding_lifestyle: "Primary situation",
    onboarding_lifestyle_payroll: "Payroll",
    onboarding_lifestyle_freelance: "Freelance",
    onboarding_lifestyle_family: "Family",
    onboarding_lifestyle_student: "Student",
    onboarding_lifestyle_simple: "Quick setup",
    onboarding_template_applied: "We applied a starter template for {mode}. You can edit everything.",
    profile_lifestyle_prefix: "Mode:",
    onboarding_submit: "Continue",
    onboarding_cancel: "Close",
    onboarding_error: "Could not save your access. Check your details and try again.",
    onboarding_saved_note: "Saved on this device.",
    onboarding_edit: "Edit profile",
    beta_login_title: "Comfort Ledger — Beta",
    beta_login_intro: "Restricted access. Use the username and password you were sent.",
    beta_login_user: "Username",
    beta_login_pass: "Password",
    beta_login_submit: "Sign in",
    beta_login_error: "Sign-in failed. Check username and password.",
    beta_demo_prefix: "Beta demo — time left",
    landing_demo_prefix: "Browser demo — time left",
    beta_trial_title: "Trial ended",
    beta_trial_body_html:
      "The <strong>browser demo</strong> (without a beta login) has ended. Trial data stored here was cleared. Signed-in beta testers are not limited this way. Subscribe or sign in with beta access to continue.",
    beta_trial_subscribe: "Subscribe",
    beta_trial_cancel: "Close",
    coach_badge_cloud: "OpenAI",
    coach_intro_cloud_html:
      "Ask about your month, debt, or comfort zone. This coach uses <strong>OpenAI</strong> on the server: we send a <strong>numeric summary</strong> of your view (not bank account numbers).",
    coach_status_cloud:
      "OpenAI coach (server). AI answers; we do not store card numbers or passwords.",
    coach_status_direct:
      "OpenAI coach (your API key). Your question and an anonymous snapshot go to OpenAI from this browser.",
    coach_loading: "Thinking…",
    coach_error_generic: "Could not get a coach response.",
    coach_settings_aria: "Coach settings",
    coach_settings_title: "Coach settings",
    coach_settings_intro:
      "Choose how the coach replies. Your choice stays only on this device.",
    coach_settings_mode_legend: "Coach mode",
    coach_mode_local_title: "Local — fast and private",
    coach_mode_local_desc: "Rules + your numbers. Nothing leaves the browser.",
    coach_mode_openai_title: "OpenAI — richer answers",
    coach_mode_openai_desc:
      "Use your own API key. Your question + an anonymous snapshot go to OpenAI. More conversational replies.",
    coach_openai_key_label: "Your OpenAI API key",
    coach_openai_key_placeholder: "sk-...",
    coach_openai_model_label: "Model",
    coach_openai_hint_html:
      "Grab your API key at <a href=\"https://platform.openai.com/api-keys\" target=\"_blank\" rel=\"noopener noreferrer\">platform.openai.com/api-keys</a>. Each question costs a fraction of a cent. The key is stored <strong>only on this device</strong>.",
    coach_openai_warn:
      "Do not share this browser with others if you save the key here.",
    coach_openai_key_missing: "Paste your OpenAI API key to enable this mode.",
    coach_openai_key_format: "The API key must start with sk- and be at least 20 characters.",
    coach_openai_key_invalid: "API key rejected by OpenAI. Check or regenerate it.",
    coach_openai_rate_limit: "OpenAI asked to slow down (rate limit). Try again in a few seconds.",
    coach_openai_server_err: "OpenAI had an internal issue. Try again in a minute.",
    coach_openai_network_err: "Could not reach OpenAI. Check your connection.",
    coach_openai_empty: "OpenAI returned no text. Try rephrasing the question.",
    coach_settings_save: "Save",
    coach_settings_close: "Close",
    twin_clocks_title: "Chicago & New York",
    twin_clocks_sub: "Local time in each city, calculated on your device (no internet needed).",
    income_title: "Income",
    expenses_title: "Expenses",
    debts_title: "Debts",
    add_row: "+ Add",
    income_sub_html:
      "Each line has a <strong>date</strong> (calendar). Charts and summary only include the <strong>current calendar month</strong>. Newest lines stay on top.",
    liquid_label: "Cash / liquid savings today",
    expenses_sub_html:
      "<strong>Category</strong> + description. Cadence <strong>daily, weekly, or monthly</strong>. Newest on top.",
    debts_sub_html: "Mark <strong>Card</strong> to include it in the chart vs income. Newest on top.",
    dash_title: "Executive briefing",
    dash_sub: "Same data as above as a % of this month’s income in a compact boardroom-style view.",
    income_date: "Pay date",
    income_label: "Description",
    income_amount: "Amount received",
    expense_category: "Category",
    expense_label: "Description",
    expense_amount: "Amount",
    expense_cadence: "Cadence",
    cadence_d: "Daily",
    cadence_w: "Weekly",
    cadence_m: "Monthly",
    cadence_b: "Biweekly",
    cadence_o: "One-off",
    income_cadence: "Recurrence",
    income_empty_title: "No income yet.",
    income_empty_sub: "Start with your paycheck or main deposit. Everything else builds on top.",
    income_empty_cta: "Add income",
    expense_empty_title: "No expenses here yet.",
    expense_empty_sub: "Add rent, utilities or that daily coffee. The more real, the better it squares up.",
    expense_empty_cta: "Add expense",
    debt_empty_title: "No debt tracked. Good news.",
    debt_empty_sub: "If you have cards, loans or installments, add them so the picture is complete.",
    debt_empty_cta: "Add debt",
    undo_deleted_income: "Income deleted",
    undo_deleted_expense: "Expense deleted",
    undo_deleted_debt: "Debt deleted",
    undo_action: "Undo",
    saved_label: "Saved",
    kpi_empty_title: "Add your first income",
    kpi_empty_sub: "So we can see if the month adds up.",
    kpi_free_label: "Free after everything this month",
    kpi_warn: "Heads up: expenses + debt ≥ income",
    kpi_neg: "You're in the red this month",
    kpi_ok: "Comfort zone",
    kpi_tight: "Tight month",
    debt_type: "Type",
    debt_label: "Description",
    debt_balance: "Balance",
    debt_min: "Min. payment",
    debt_type_card: "Card",
    debt_type_other: "Other debt",
    goal_name: "Goal (name)",
    goal_target: "Target amount",
    goal_months: "Months",
    goal_apart_hint: "Set aside / mo",
    goal_apart_title: "From each paycheck until the goal",
    goals_empty_html:
      "E.g. vacation or car down payment. Enter the <strong>total amount</strong> and <strong>how many months</strong>; monthly set-aside shows here and in the <strong>Health summary</strong> above.",
    goals_summary_empty: "No goals yet.",
    goals_last_label: "Most recent goal:",
    goals_scroll_aria: "Goals list; scroll down to see older goals.",
    remove_aria: "Remove",
    remove_goal_aria: "Remove goal",
    health_goal_monthly: "Set aside for goals (each month)",
    health_free_after_goals: "Free after expenses, minimums & goals",
    health_income: "Income received",
    health_expenses: "Expenses (monthly)",
    health_debt_min: "Debt minimums",
    health_free_after: "Free after expenses + minimums",
    health_savings: "Liquid savings",
    health_debt_total: "Total debt",
    dash_dyn_title: "Month dynamics",
    dash_dyn_hint: "% of income received",
    dash_dyn_pct_title: "% of this month’s income",
    dash_radar_title: "Load radar",
    dash_radar_hint: "Same 0–100% scale on each axis",
    dash_radar_aria: "Income allocation radar",
    dash_orbit_title: "Income orbit",
    dash_orbit_leg_spend: "Spending",
    dash_orbit_leg_debt: "Min. debt",
    dash_orbit_leg_goals: "Goals / mo",
    dash_orbit_leg_free: "Free after goals",
    dash_orbit_leg_rest: "Unassigned",
    dash_cat_title: "Spend by category",
    dash_cat_hint: "Monthly equivalent",
    dash_cat_empty: "No expenses: add rows under Expenses to see categories.",
    dash_goal_title: "Cushion vs goal",
    dash_goal_hint: "% of each goal covered by liquid savings today",
    dash_goal_empty: "No funded goals: add targets above to see cushion coverage arcs.",
    dash_goal_arc_title: "Liquid cushion vs total goal",
    donut_leg_exp: "Monthly expenses",
    donut_leg_exp_pct: "of this month’s income",
    donut_leg_debt: "Minimum debt payments",
    donut_leg_debt_pct: "of income",
    donut_leg_free: "Remainder / margin",
    donut_footnote: "Donut income: sum of lines dated in",
    cadence_d_label: "Daily → month",
    cadence_w_label: "Weekly → month",
    cadence_m_label: "Monthly",
    cadence_total: "Monthly total:",
    cushion_none: "No debt on file: the bar reflects liquid savings.",
    cushion_ok:
      "Savings {s} vs debt {d}: cushion covers liabilities, but check the health message for monthly cash flow.",
    cushion_low: "Savings {s} below debt {d}: visually debt outweighs your cushion.",
    card_income: "Month income",
    card_debt: "Card balances",
    card_ratio_none: 'No balance marked as “Card”, or everything is in “Other debt”.',
    card_ratio_lt: "Card debt is ~{p}% of income received in {m}.",
    card_ratio_gte: "Card debt is ~{r}× income received in {m}.",
    world_chicago: "Chicago",
    world_newyork: "New York",
    world_clock_fail: "Could not show clocks (time zones not supported in this browser).",
    dyn_spend: "Spend",
    dyn_debt: "Min. debt",
    dyn_goals: "Goals",
    dyn_free: "Free",
    dyn_cushion: "Cushion",
    new_income_label: "Paycheck",
    new_expense_label: "New expense",
    new_debt_label: "New debt",
    new_goal_label: "Vacation or down payment",
    default_income_label: "Primary paycheck",
    default_goal_name: "Goal",
    recurring_title: "Recurring payments",
    recurring_add: "+ Add",
    recurring_sub_html:
      "Track <strong>rent, insurance, subscriptions</strong> and the <strong>billing day</strong>. Add an optional <strong>pay URL</strong>: when you tap the notification we open that page; otherwise we jump to this row. Alerts <strong>3 days before</strong> and on the <strong>due day</strong> (browser permission; fully closed app needs server Web Push with the same <code>data.url</code> on tap).",
    recurring_label: "Name / service",
    recurring_day: "Billing day (1–31)",
    recurring_pay_url: "Pay URL (optional)",
    recurring_amount_opt: "Amount (optional)",
    recurring_next: "Next charge",
    recurring_in_days: "in {n} days",
    recurring_today: "today",
    recurring_cancel: "Cancel subscription",
    recurring_reactivate: "Reactivate",
    recurring_status_cancelled: "Cancelled",
    recurring_notify_btn: "Enable system alerts",
    recurring_notify_btn_granted: "Done",
    recurring_notify_active: "System alerts on",
    recurring_notify_denied: "Notifications blocked in browser",
    recurring_notify_default: "Tap to allow browser notifications",
    recurring_go_pay: "Go pay",
    recurring_empty: "No recurring payments yet. Add rent, insurance, or subscriptions.",
    recurring_notif_before_title: "Upcoming recurring payment",
    recurring_notif_before_body: "{label} — in 3 days ({date}).{amt}",
    recurring_notif_due_title: "Payment due today",
    recurring_notif_due_body: "{label} — billing day ({date}).{amt}",
    today_banner_due_title: "Due today",
    today_banner_soon_title: "Coming up soon",
    today_banner_due_more: "and {n} more today.",
    today_banner_soon_more: "and {n} more in the coming days.",
    budgets_section_title: "Category budgets",
    budgets_add: "+ Add",
    budgets_section_sub_html:
      "Set a monthly cap by category and get alerts at <strong>80%</strong> and <strong>100%</strong>.",
    budgets_empty: "No budgets yet. Add one to track spending by category.",
    budgets_summary_empty: "No active budgets.",
    budgets_summary_main: "Spent {spent} of {budget} ({ratio}%). Over budget categories: {over}.",
    budgets_monthly: "Monthly cap",
    budgets_meta_spent: "Spent: {spent}",
    budgets_meta_ratio: "{n}% of budget",
    budget_alert_warn_title: "Budget alert (80%)",
    budget_alert_warn_body: "{label}: you've spent {spent} of {budget}.",
    budget_alert_over_title: "Budget exceeded",
    budget_alert_over_body: "{label}: you've spent {spent} (cap {budget}).",
    weekly_title: "Weekly check-in",
    weekly_dismiss: "Hide this week",
    weekly_income: "Month income",
    weekly_expenses: "Monthly-equivalent spend",
    weekly_free: "Free after goals",
    weekly_top_empty: "Not enough spending data yet.",
    new_recurring_label: "New subscription",
    post_dash_hint_html:
      "Below <strong>Executive briefing</strong>: household bills on the left, <strong>subscriptions</strong> on the right. Turn on alerts for reminders 3 days before and on the charge day (works best when the app is served over <code>https</code> or <code>localhost</code>).",
    utility_section_title: "Home & utilities",
    utility_section_sub_html:
      "Rent, water, power, gas, insurance, phone, etc. The dark strip shows the <strong>latest entry</strong> (top row); scroll to edit category, amount, date, and reminder day.",
    utility_add: "+ Add",
    utility_list_empty: "No rows yet — add rent, utilities, etc.",
    utility_summary_empty: "Nothing yet.",
    utility_last_label: "Latest:",
    utility_category: "Category",
    utility_notes: "Note / reference",
    utility_amount: "Amount",
    utility_date: "Reference date",
    utility_reminder_day: "Reminder day of month",
    utility_reminder_next: "Next reminder",
    utility_cat_rent: "Rent / mortgage",
    utility_cat_water: "Water",
    utility_cat_electric: "Electric",
    utility_cat_gas: "Gas",
    utility_cat_insurance: "Insurance",
    utility_cat_phone: "Mobile phone",
    utility_cat_internet: "Internet / TV",
    utility_cat_condo: "HOA / trash",
    utility_cat_other: "Other",
    sub_section_title: "Subscriptions",
    sub_section_sub_html:
      "Pick a service, cadence, and amount. The yellow button opens the <strong>official page</strong> to cancel (Netflix, Disney+, etc.).",
    sub_add: "+ Add",
    sub_list_empty: "No subscriptions yet.",
    sub_summary_empty: "Nothing yet.",
    sub_last_label: "Latest:",
    sub_service: "Service",
    sub_charge_day: "Typical billing day (month)",
    sub_monthly_equiv: "Approx. monthly equivalent",
    sub_custom_name: "Name (other service)",
    sub_custom_unsub: "Cancel link (https…)",
    sub_unsubscribe_btn: "Unsubscribe",
    subsvc_netflix: "Netflix",
    subsvc_disney: "Disney+",
    subsvc_hulu: "Hulu",
    subsvc_hbo: "Max (HBO)",
    subsvc_prime: "Amazon Prime",
    subsvc_apple_tv: "Apple TV+",
    subsvc_youtube: "YouTube Premium",
    subsvc_spotify: "Spotify",
    subsvc_apple_music: "Apple Music",
    subsvc_paramount: "Paramount+",
    subsvc_peacock: "Peacock",
    subsvc_dropbox: "Dropbox",
    subsvc_icloud: "iCloud+",
    subsvc_microsoft365: "Microsoft 365",
    subsvc_adobe: "Adobe",
    subsvc_chatgpt: "ChatGPT Plus",
    subsvc_custom: "Other (manual)"
  },
  zh: {
    page_title: "Comfort Ledger — 概览与顾问",
    meta_description: "简洁财务概览：收入、支出与债务，并配备本地规则型顾问。",
    lang_label: "语言",
    brand_eyebrow: "资产视图",
    tagline: "少噪音，更清晰。",
    pill_local: "100% 本地",
    pill_offline: "离线",
    pill_device_data: "数据保存在本机",
    pill_network_coach: "顾问走网络（AI）",
    backup_export: "导出备份",
    backup_import: "导入…",
    backup_import_confirm: "用导入文件替换当前全部数据？此操作无法撤销。",
    backup_import_ok: "导入成功。数据已保存在本机。",
    backup_import_err_invalid: "该文件不是有效的 Comfort Ledger 备份。",
    backup_import_err_read: "无法读取该文件。",
    health_title: "健康摘要",
    goals_title: "与工资挂钩的目标",
    goals_add: "+ 目标",
    goals_sub_html:
      "填写<strong>目标金额</strong>（旅行、购车首付等）与<strong>月数</strong>。我们会估算每月从工资中需<strong>预留</strong>多少；合计显示在上方<strong>健康摘要</strong>。",
    chart_flow_title: "当月现金流",
    chart_flow_sub: "收入对比月化支出与债务负担",
    donut_aria: "收入结构图",
    chart_cushion_title: "现金垫 vs 债务",
    chart_cushion_sub: "直观对比：储蓄与欠款",
    cushion_aria: "储蓄与债务对比",
    chart_cadence_title: "支出节奏",
    chart_cadence_sub: "按频率：日、周或月（折算为月）",
    cadence_aria: "按频率的支出",
    chart_card_title: "信用卡债务 vs 收入",
    chart_card_sub_html: "仅统计标记为<strong>信用卡</strong>的行；与当月总收入对比",
    card_debt_aria: "信用卡债务与收入",
    coach_title: "智能顾问",
    coach_badge: "本地顾问",
    coach_intro_html:
      "可询问当月、债务或安全感。本顾问<strong>完全本地</strong>（规则+你的数据）：不连接 BlackLedger Omega，也不联网。",
    coach_input_label: "给顾问留言",
    coach_placeholder: "例：若欠款 9.2k，储蓄 1 万是否安心？",
    coach_send: "发送",
    coach_status: "本地顾问（规则+你的数据）。不调用 Omega 或互联网。",
    onboarding_title: "你的 Comfort Ledger 空间",
    onboarding_intro_html:
      "进入前先留下你的<strong>姓名</strong>，以及可选的<strong>邮箱</strong>和使用重点。资料会<strong>保存在此设备</strong>，下次可直接进入。",
    onboarding_name: "姓名",
    onboarding_email: "邮箱（可选）",
    onboarding_focus: "你想先整理什么？",
    onboarding_focus_placeholder: "例如：订阅、信用卡债务、每月现金流或目标。",
    onboarding_lifestyle: "当前主要情况",
    onboarding_lifestyle_payroll: "固定工资",
    onboarding_lifestyle_freelance: "自由职业",
    onboarding_lifestyle_family: "家庭开支",
    onboarding_lifestyle_student: "学生",
    onboarding_lifestyle_simple: "快速整理",
    onboarding_template_applied: "已为你应用 {mode} 的初始模板，后续可随时修改。",
    profile_lifestyle_prefix: "模式：",
    onboarding_submit: "继续",
    onboarding_cancel: "关闭",
    onboarding_error: "无法保存你的访问资料，请检查后重试。",
    onboarding_saved_note: "已保存在此设备。",
    onboarding_edit: "编辑资料",
    beta_login_title: "Comfort Ledger — 内测",
    beta_login_intro: "仅限受邀。请输入运营方提供的用户名与密码。",
    beta_login_user: "用户名",
    beta_login_pass: "密码",
    beta_login_submit: "登录",
    beta_login_error: "登录失败，请检查用户名和密码。",
    beta_demo_prefix: "内测演示 — 剩余",
    landing_demo_prefix: "访客演示 — 剩余",
    beta_trial_title: "试用结束",
    beta_trial_body_html:
      "<strong>浏览器访客演示</strong>已结束（未登录内测）。本机试用数据已清除。已登录的内测用户不受此时长限制。请订阅或使用内测账号继续。",
    beta_trial_subscribe: "订阅",
    beta_trial_cancel: "关闭",
    coach_badge_cloud: "OpenAI",
    coach_intro_cloud_html:
      "可询问当月、债务或安全感。本顾问在服务器使用 <strong>OpenAI</strong>：仅发送你界面上的<strong>数字摘要</strong>（不含银行账户）。",
    coach_status_cloud: "OpenAI 顾问（服务器）。由 AI 回答；不保存卡号或密码。",
    coach_status_direct: "OpenAI 顾问（你的 API key）。你的问题与匿名摘要直接从此浏览器发送给 OpenAI。",
    coach_loading: "思考中…",
    coach_error_generic: "无法获取顾问回复。",
    coach_settings_aria: "顾问设置",
    coach_settings_title: "顾问设置",
    coach_settings_intro: "选择顾问的回答方式。选项仅保存在此设备。",
    coach_settings_mode_legend: "顾问模式",
    coach_mode_local_title: "本地 — 快速且私密",
    coach_mode_local_desc: "规则 + 你的数据。不向外发送任何信息。",
    coach_mode_openai_title: "OpenAI — 更丰富的回答",
    coach_mode_openai_desc: "使用你自己的 API key。问题与匿名摘要会发往 OpenAI，回答更自然。",
    coach_openai_key_label: "你的 OpenAI API key",
    coach_openai_key_placeholder: "sk-...",
    coach_openai_model_label: "模型",
    coach_openai_hint_html:
      "在 <a href=\"https://platform.openai.com/api-keys\" target=\"_blank\" rel=\"noopener noreferrer\">platform.openai.com/api-keys</a> 获取 API key。每次问答费用仅为几分之一美分。key <strong>仅保存在此设备</strong>。",
    coach_openai_warn: "若此浏览器与他人共用，请勿在此保存 key。",
    coach_openai_key_missing: "粘贴你的 OpenAI API key 以启用该模式。",
    coach_openai_key_format: "API key 必须以 sk- 开头，且至少 20 个字符。",
    coach_openai_key_invalid: "OpenAI 拒绝了此 API key。请检查或重新生成。",
    coach_openai_rate_limit: "OpenAI 要求稍候（速率限制）。数秒后再试。",
    coach_openai_server_err: "OpenAI 内部故障，请稍后再试。",
    coach_openai_network_err: "无法连接到 OpenAI，请检查网络。",
    coach_openai_empty: "OpenAI 未返回文本。请尝试改写问题。",
    coach_settings_save: "保存",
    coach_settings_close: "关闭",
    twin_clocks_title: "芝加哥与纽约",
    twin_clocks_sub: "各城市当地时间，由本机计算（无需联网）。",
    income_title: "收入",
    expenses_title: "支出",
    debts_title: "债务",
    add_row: "+ 添加",
    income_sub_html:
      "每笔含<strong>日期</strong>（日历）。摘要与图表仅统计<strong>当前自然月</strong>内入账。新行在上。",
    liquid_label: "今日现金 / 活期储蓄",
    expenses_sub_html: "<strong>类别</strong> + 说明。频率为<strong>日、周或月</strong>。新行在上。",
    debts_sub_html: "标记<strong>信用卡</strong>以纳入与收入的对比图。新行在上。",
    dash_title: "高管简报",
    dash_sub: "与上方相同的数据，以当月收入百分比呈现，便于快速阅读。",
    income_date: "到账日期",
    income_label: "说明",
    income_amount: "金额",
    expense_category: "类别",
    expense_label: "说明",
    expense_amount: "金额",
    expense_cadence: "频率",
    cadence_d: "每日",
    cadence_w: "每周",
    cadence_m: "每月",
    cadence_b: "双周",
    cadence_o: "一次性",
    income_cadence: "周期",
    income_empty_title: "尚未添加收入。",
    income_empty_sub: "先添加你的工资或主要收入，其他都以此为基础。",
    income_empty_cta: "添加收入",
    expense_empty_title: "还没有支出。",
    expense_empty_sub: "添加房租、账单或每天的咖啡，越真实越准确。",
    expense_empty_cta: "添加支出",
    debt_empty_title: "暂无债务记录。好消息。",
    debt_empty_sub: "如果有信用卡、贷款或分期付款，请添加以便完整了解。",
    debt_empty_cta: "添加债务",
    undo_deleted_income: "收入已删除",
    undo_deleted_expense: "支出已删除",
    undo_deleted_debt: "债务已删除",
    undo_action: "撤销",
    saved_label: "已保存",
    kpi_empty_title: "添加你的第一笔收入",
    kpi_empty_sub: "让我们看看这个月是否够用。",
    kpi_free_label: "本月扣除所有后可自由支配",
    kpi_warn: "注意：支出加债务 ≥ 收入",
    kpi_neg: "本月已赤字",
    kpi_ok: "舒适区",
    kpi_tight: "紧张月份",
    debt_type: "类型",
    debt_label: "说明",
    debt_balance: "余额",
    debt_min: "最低还款",
    debt_type_card: "信用卡",
    debt_type_other: "其他债务",
    goal_name: "目标名称",
    goal_target: "目标金额",
    goal_months: "月数",
    goal_apart_hint: "每月预留",
    goal_apart_title: "从每期工资到目标完成",
    goals_empty_html:
      "例：旅行或购车首付。填写<strong>总金额</strong>与<strong>月数</strong>；每月预留显示于此及上方<strong>健康摘要</strong>。",
    goals_summary_empty: "尚无目标。",
    goals_last_label: "最新目标：",
    goals_scroll_aria: "目标列表；向下滚动可查看较早的目标。",
    remove_aria: "删除",
    remove_goal_aria: "删除目标",
    health_goal_monthly: "目标每月预留",
    health_free_after_goals: "扣除支出、最低还款与目标后结余",
    health_income: "已到账收入",
    health_expenses: "支出（月化）",
    health_debt_min: "债务最低还款",
    health_free_after: "扣除支出与最低还款后结余",
    health_savings: "活期储蓄",
    health_debt_total: "债务合计",
    dash_dyn_title: "当月结构",
    dash_dyn_hint: "占已收收入比例",
    dash_dyn_pct_title: "占当月收入%",
    dash_radar_title: "负担雷达",
    dash_radar_hint: "各轴均为 0–100% 同尺度",
    dash_radar_aria: "收入分配雷达",
    dash_orbit_title: "收入环形",
    dash_orbit_leg_spend: "支出",
    dash_orbit_leg_debt: "最低还款",
    dash_orbit_leg_goals: "目标/月",
    dash_orbit_leg_free: "目标后结余",
    dash_orbit_leg_rest: "未分配",
    dash_cat_title: "按类别支出",
    dash_cat_hint: "月化等值",
    dash_cat_empty: "暂无支出：请在「支出」中添加行以查看类别。",
    dash_goal_title: "现金垫 vs 目标",
    dash_goal_hint: "活期储蓄覆盖各目标的 %",
    dash_goal_empty: "暂无带金额目标：在上方添加以查看覆盖进度。",
    dash_goal_arc_title: "活期储蓄 vs 目标总额",
    donut_leg_exp: "月化支出",
    donut_leg_exp_pct: "占当月收入",
    donut_leg_debt: "债务最低还款",
    donut_leg_debt_pct: "占收入",
    donut_leg_free: "剩余 / 空间",
    donut_footnote: "环形图收入：日期属于",
    cadence_d_label: "每日 → 月",
    cadence_w_label: "每周 → 月",
    cadence_m_label: "每月",
    cadence_total: "月化合计：",
    cushion_none: "未登记债务：条形仅反映活期储蓄。",
    cushion_ok: "储蓄 {s} 对比债务 {d}：现金垫覆盖负债，但仍请结合健康摘要看月度现金流。",
    cushion_low: "储蓄 {s} 低于债务 {d}：视觉上债务重于现金垫。",
    card_income: "当月收入",
    card_debt: "信用卡余额",
    card_ratio_none: "无标记为「信用卡」的余额，或均在「其他债务」。",
    card_ratio_lt: "信用卡债务约为 {m} 已收收入的 ~{p}%。",
    card_ratio_gte: "信用卡债务约为 {m} 已收收入的 ~{r} 倍。",
    world_chicago: "芝加哥",
    world_newyork: "纽约",
    world_clock_fail: "无法显示时钟（此浏览器可能不支持该时区）。",
    dyn_spend: "支出",
    dyn_debt: "最低还款",
    dyn_goals: "目标",
    dyn_free: "结余",
    dyn_cushion: "现金垫",
    new_income_label: "入账",
    new_expense_label: "新支出",
    new_debt_label: "新债务",
    new_goal_label: "旅行或首付",
    default_income_label: "主要工资",
    default_goal_name: "目标",
    recurring_title: "周期性付款",
    recurring_add: "+ 添加",
    recurring_sub_html:
      "记录<strong>房租、保险或订阅</strong>及<strong>每月扣款日</strong>。可填<strong>付款链接</strong>：点通知时打开该链接；否则跳到本行。在<strong>到期前 3 天</strong>与<strong>当天</strong>提醒（需浏览器权限；应用完全关闭时需服务端 Web Push，并在 payload 的 <code>data.url</code> 中放点击后打开的地址）。",
    recurring_label: "名称 / 服务",
    recurring_day: "扣款日（1–31）",
    recurring_pay_url: "付款链接（可选）",
    recurring_amount_opt: "金额（可选）",
    recurring_next: "下次扣款",
    recurring_in_days: "{n} 天后",
    recurring_today: "今天",
    recurring_cancel: "取消订阅",
    recurring_reactivate: "重新启用",
    recurring_status_cancelled: "已取消",
    recurring_notify_btn: "开启系统通知",
    recurring_notify_btn_granted: "完成",
    recurring_notify_active: "系统通知已开启",
    recurring_notify_denied: "浏览器已阻止通知",
    recurring_notify_default: "点击以允许浏览器通知",
    recurring_go_pay: "去支付",
    recurring_empty: "暂无周期性付款。可添加房租、保险或订阅。",
    recurring_notif_before_title: "即将扣款",
    recurring_notif_before_body: "{label} — 还有 3 天（{date}）。{amt}",
    recurring_notif_due_title: "今日应付款",
    recurring_notif_due_body: "{label} — 扣款日（{date}）。{amt}",
    today_banner_due_title: "今日应付款",
    today_banner_soon_title: "即将到期",
    today_banner_due_more: "还有 {n} 项今天到期。",
    today_banner_soon_more: "还有 {n} 项即将到期。",
    budgets_section_title: "分类预算",
    budgets_add: "+ 添加",
    budgets_section_sub_html:
      "为每个分类设置月度上限，并在达到 <strong>80%</strong> 和 <strong>100%</strong> 时提醒你。",
    budgets_empty: "还没有预算。先添加一个，按分类追踪支出。",
    budgets_summary_empty: "暂无预算。",
    budgets_summary_main: "已花费 {spent} / {budget}（{ratio}%）。超预算分类：{over}。",
    budgets_monthly: "月度上限",
    budgets_meta_spent: "已花费：{spent}",
    budgets_meta_ratio: "预算使用 {n}%",
    budget_alert_warn_title: "预算提醒（80%）",
    budget_alert_warn_body: "{label}：你已花费 {spent} / {budget}。",
    budget_alert_over_title: "预算已超出",
    budget_alert_over_body: "{label}：你已花费 {spent}（上限 {budget}）。",
    weekly_title: "每周速览",
    weekly_dismiss: "本周隐藏",
    weekly_income: "本月收入",
    weekly_expenses: "月化支出",
    weekly_free: "目标后可用余额",
    weekly_top_empty: "支出数据不足，暂无法显示重点分类。",
    new_recurring_label: "新订阅",
    post_dash_hint_html:
      "在<strong>执行简报</strong>下方：左侧为家庭账单，右侧为<strong>订阅</strong>。开启通知可在扣款前 3 天与当天提醒（建议通过 <code>https</code> 或 <code>localhost</code> 打开应用）。",
    utility_section_title: "家庭与公用事业",
    utility_section_sub_html:
      "房租、水、电、气、保险、电话等。深色条显示<strong>最新一条</strong>（列表最上）；向下滚动可编辑类别、金额、日期与提醒日。",
    utility_add: "+ 添加",
    utility_list_empty: "暂无记录，可添加房租、水电等。",
    utility_summary_empty: "暂无数据。",
    utility_last_label: "最新：",
    utility_category: "类别",
    utility_notes: "备注 / 参考",
    utility_amount: "金额",
    utility_date: "参考日期",
    utility_reminder_day: "提醒日（每月几号）",
    utility_reminder_next: "下次提醒",
    utility_cat_rent: "房租 / 房贷",
    utility_cat_water: "水费",
    utility_cat_electric: "电费",
    utility_cat_gas: "燃气",
    utility_cat_insurance: "保险",
    utility_cat_phone: "手机",
    utility_cat_internet: "网络 / 电视",
    utility_cat_condo: "物业 / 垃圾费",
    utility_cat_other: "其他",
    sub_section_title: "订阅服务",
    sub_section_sub_html:
      "选择服务、周期与金额。黄色按钮打开<strong>官方退订页面</strong>（Netflix、Disney+ 等）。",
    sub_add: "+ 添加",
    sub_list_empty: "暂无订阅。",
    sub_summary_empty: "暂无数据。",
    sub_last_label: "最新：",
    sub_service: "服务",
    sub_charge_day: "常见扣款日（每月）",
    sub_monthly_equiv: "约当月化金额",
    sub_custom_name: "名称（其他服务）",
    sub_custom_unsub: "退订链接（https…）",
    sub_unsubscribe_btn: "退订",
    subsvc_netflix: "Netflix",
    subsvc_disney: "Disney+",
    subsvc_hulu: "Hulu",
    subsvc_hbo: "Max (HBO)",
    subsvc_prime: "Amazon Prime",
    subsvc_apple_tv: "Apple TV+",
    subsvc_youtube: "YouTube Premium",
    subsvc_spotify: "Spotify",
    subsvc_apple_music: "Apple Music",
    subsvc_paramount: "Paramount+",
    subsvc_peacock: "Peacock",
    subsvc_dropbox: "Dropbox",
    subsvc_icloud: "iCloud+",
    subsvc_microsoft365: "Microsoft 365",
    subsvc_adobe: "Adobe",
    subsvc_chatgpt: "ChatGPT Plus",
    subsvc_custom: "其他（手动）"
  }
};

const HEALTH_COPY = {
  es: {
    positiveLabel: "Zona de confort",
    positiveBase:
      "Tus ahorros cubren la deuda con margen y el mes cierra con espacio después de gastos y pagos mínimos.",
    negativeLabel: "Sin zona de confort",
    negativeNarr: (savings, debt) =>
      `Aunque tengas ${fmtMoney(savings)} líquidos, debes ${fmtMoney(debt)}: el pasivo supera tu colchón. No es “dinero tranquilo” hasta que baje la deuda o suba el colchón.`,
    thinLabel: "Alerta: colchón fino",
    thinNarr: (savings, debt) =>
      `Casi empatas ahorros (${fmtMoney(savings)}) con deuda (${fmtMoney(debt)}). Un imprevisto te empuja a rojo; prioriza amortizar o subir colchón.`,
    flowLabel: "Flujo ajustado",
    flowNarr: (absNeg) =>
      `El mes sale negativo por ${fmtMoney(absNeg)} después de gastos y mínimos de deuda. Aunque la deuda no supere ahorros, el ritmo mensual está apretado.`,
    heavyLabel: "Deuda pesada vs ahorros",
    heavyNarr:
      "Ganas bien, pero el peso de la deuda respecto a tus ahorros sigue alto. Conviene acelerar pagos o congelar gastos discrecionales.",
    goalsPos: (sg, ff) =>
      ` Metas grandes: aparta ${fmtMoney(sg)} al mes del cheque; tras eso quedarían ~${fmtMoney(ff)} libres al mes.`,
    goalsNeg: (sg, free, gap) =>
      ` Metas grandes: apartar ${fmtMoney(sg)} al mes supera lo libre del mes (${fmtMoney(free)}); falta ~${fmtMoney(gap)} — alarga plazo, baja la meta o sube ingreso.`,
    goalsVsFlowLabel: "Metas vs flujo mensual"
  },
  en: {
    positiveLabel: "Comfort zone",
    positiveBase:
      "Your savings cover debt with room to spare, and the month ends with space after expenses and minimum payments.",
    negativeLabel: "Outside comfort zone",
    negativeNarr: (savings, debt) =>
      `Even with ${fmtMoney(savings)} liquid, you owe ${fmtMoney(debt)}: liabilities exceed your cushion. Cash only feels “calm” once debt drops or the cushion rises.`,
    thinLabel: "Alert: thin cushion",
    thinNarr: (savings, debt) =>
      `Savings (${fmtMoney(savings)}) are almost level with debt (${fmtMoney(debt)}). One shock pushes you red; prioritize paydown or grow the cushion.`,
    flowLabel: "Tight cash flow",
    flowNarr: (absNeg) =>
      `The month is short by ${fmtMoney(absNeg)} after expenses and minimum debt payments. Even if debt does not exceed savings, the monthly pace is tight.`,
    heavyLabel: "Heavy debt vs savings",
    heavyNarr:
      "Income is solid, but debt weight versus savings remains high. Accelerate paydown or freeze discretionary spend.",
    goalsPos: (sg, ff) =>
      ` Big goals: set aside ${fmtMoney(sg)} each month from your check; after that ~${fmtMoney(ff)} would remain monthly.`,
    goalsNeg: (sg, free, gap) =>
      ` Big goals: setting aside ${fmtMoney(sg)}/month exceeds what’s free this month (${fmtMoney(free)}); you’re short ~${fmtMoney(gap)} — extend the timeline, lower the target, or raise income.`,
    goalsVsFlowLabel: "Goals vs monthly cash flow"
  },
  zh: {
    positiveLabel: "舒适区",
    positiveBase: "储蓄足以覆盖债务并有缓冲；扣除支出与最低还款后，本月仍有空间。",
    negativeLabel: "不在舒适区",
    negativeNarr: (savings, debt) =>
      `即便有 ${fmtMoney(savings)} 活期，仍欠 ${fmtMoney(debt)}：负债超过现金垫。在债务下降或垫款上升前，资金难言“安心”。`,
    thinLabel: "提醒：现金垫偏薄",
    thinNarr: (savings, debt) =>
      `储蓄（${fmtMoney(savings)}）几乎与债务（${fmtMoney(debt)}）持平，意外易入不敷出；优先还债或增厚现金垫。`,
    flowLabel: "现金流偏紧",
    flowNarr: (absNeg) =>
      `扣除支出与最低还款后，本月缺口约 ${fmtMoney(absNeg)}。即使债务未超过储蓄，月度节奏仍偏紧。`,
    heavyLabel: "债务相对储蓄偏重",
    heavyNarr: "收入不错，但债务相对储蓄仍偏重；可加快还款或压缩非必要支出。",
    goalsPos: (sg, ff) =>
      ` 大额目标：每月从工资预留 ${fmtMoney(sg)}；之后每月约可余 ${fmtMoney(ff)}。`,
    goalsNeg: (sg, free, gap) =>
      ` 大额目标：每月预留 ${fmtMoney(sg)} 超过本月可支配（${fmtMoney(free)}）；缺口约 ${fmtMoney(gap)} — 可延长期限、降低目标或提高收入。`,
    goalsVsFlowLabel: "目标对比月度现金流"
  }
};

let UI_LOCALE = "es";

function loadLocale() {
  try {
    const v = localStorage.getItem(LOCALE_KEY);
    if (v === "en" || v === "zh") return v;
  } catch {
    /* ignore */
  }
  return "es";
}

function getIntlLocale() {
  if (UI_LOCALE === "en") return "en-US";
  if (UI_LOCALE === "zh") return "zh-CN";
  return "es-MX";
}

function t(key) {
  const pack = UI_STRINGS[UI_LOCALE] || UI_STRINGS.es;
  return pack[key] ?? UI_STRINGS.es[key] ?? key;
}

function tFill(key, vars) {
  let s = t(key);
  if (!vars) return s;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

function categoryDisplayLabel(esKey) {
  const i = EXPENSE_CATEGORIES.indexOf(esKey);
  if (i < 0) return EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
  if (UI_LOCALE === "en") return CATEGORY_EN[i];
  if (UI_LOCALE === "zh") return CATEGORY_ZH[i];
  return esKey;
}

/** Solo etiquetas de copy estático; el resto se convierte a texto plano (mitiga XSS vía i18n). */
function sanitizeI18nHtml(html) {
  const allowed = new Set(["strong", "em", "br", "span", "a", "p", "code"]);
  const doc = new DOMParser().parseFromString(`<div>${String(html)}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return escapeHtml(String(html));

  function appendCleaned(parent, nodeList) {
    for (const ch of Array.from(nodeList)) {
      const c = clean(ch);
      if (!c) continue;
      if (c.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        appendCleaned(parent, c.childNodes);
      } else {
        parent.appendChild(c);
      }
    }
  }

  function clean(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.nodeValue);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const name = node.tagName.toLowerCase();
    if (name === "script" || name === "style") return null;
    if (!allowed.has(name)) {
      const frag = document.createDocumentFragment();
      appendCleaned(frag, node.childNodes);
      return frag;
    }
    if (name === "br") return document.createElement("br");
    const el = document.createElement(name);
    if (name === "a") {
      const href = node.getAttribute("href") || "";
      if (!/^https?:\/\//i.test(href)) {
        const frag = document.createDocumentFragment();
        appendCleaned(frag, node.childNodes);
        return frag;
      }
      el.setAttribute("href", href);
      el.setAttribute("rel", "noopener noreferrer");
      el.setAttribute("target", "_blank");
    }
    appendCleaned(el, node.childNodes);
    return el;
  }

  const out = document.createDocumentFragment();
  appendCleaned(out, root.childNodes);
  const sink = document.createElement("div");
  sink.appendChild(out);
  return sink.innerHTML;
}

function applyStaticI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (!key) return;
    el.innerHTML = sanitizeI18nHtml(t(key));
  });
  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    const raw = el.getAttribute("data-i18n-attr");
    if (!raw) return;
    const [attr, key] = raw.split("|").map((s) => s && s.trim());
    if (attr && key) el.setAttribute(attr, t(key));
  });
}

function updateLangButtons() {
  document.querySelectorAll("[data-set-lang]").forEach((btn) => {
    const loc = btn.getAttribute("data-set-lang");
    const on = loc === UI_LOCALE;
    btn.classList.toggle("lang-btn--active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

function setLocale(next) {
  UI_LOCALE = next === "en" || next === "zh" ? next : "es";
  try {
    localStorage.setItem(LOCALE_KEY, UI_LOCALE);
  } catch {
    /* ignore */
  }
  document.documentElement.lang = UI_LOCALE === "zh" ? "zh-Hans" : UI_LOCALE === "en" ? "en" : "es";
  document.body.classList.toggle("lang-zh", UI_LOCALE === "zh");
  document.title = t("page_title");
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", t("meta_description"));
  applyStaticI18n();
  renderHostedProfileCard();
  applyHostedCoachCopy();
  comfortApplyTrustPills();
  updateLangButtons();
  renderAll();
  renderWorldClocks();
}

function formatDateInput(d = new Date()) {
  const local = new Date(d);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}

function sanitizeISODate(value) {
  const s = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : formatDateInput();
}

function monthIncomeLabel(ref = new Date()) {
  const s = ref.toLocaleDateString(getIntlLocale(), { month: "long", year: "numeric" });
  if (!s) return "";
  if (UI_LOCALE === "zh") return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const defaultState = () => ({
  profile: null,
  incomeLines: [],
  liquidSavings: 0,
  expenses: [],
  debts: [],
  savingsGoals: [],
  utilityBills: [],
  subscriptions: [],
  budgets: []
});

function parseNum(raw) {
  if (raw === "" || raw == null) return NaN;
  let s = String(raw).trim().replace(/\s/g, "");
  if (!s) return NaN;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function fmtMoney(n) {
  const num = Number(n);
  const value = Number.isFinite(num) ? num : 0;
  const isWholeInteger = Number.isInteger(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: isWholeInteger ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value);
}

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeProfile(profile) {
  if (!profile || typeof profile !== "object") {
    return null;
  }
  const displayName = String(profile.displayName || profile.name || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 60);
  if (!displayName) {
    return null;
  }
  const id = String(profile.id || "").trim().slice(0, 80) || `visitor-${createId("profile")}`;
  const email = String(profile.email || "")
    .trim()
    .slice(0, 120);
  const focus = String(profile.focus || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 180);
  const lifestyleRaw = String(profile.lifestyle || "").trim().toLowerCase();
  const lifestyle = ["payroll", "freelance", "family", "student", "simple"].includes(lifestyleRaw)
    ? lifestyleRaw
    : "simple";
  const createdAt = String(profile.createdAt || new Date().toISOString());
  return { id, displayName, email, focus, lifestyle, createdAt };
}

/* extracted to comfort-ledger-modules.js */

function normalizeCadence(c) {
  return c === "weekly" || c === "monthly" ? c : "daily";
}

function normalizeIncomeCadence(c) {
  if (c === "weekly" || c === "biweekly" || c === "one-off") return c;
  return "monthly";
}

function normalizeExpense(e) {
  const cat = EXPENSE_CATEGORIES.includes(e.category) ? e.category : "Otros";
  return {
    id: typeof e.id === "string" ? e.id : createId("e"),
    category: cat,
    label: String(e.label ?? ""),
    amount: Number(e.amount) || 0,
    cadence: normalizeCadence(e.cadence)
  };
}

function normalizeBudget(b) {
  const cat = EXPENSE_CATEGORIES.includes(b?.category) ? b.category : "Otros";
  return {
    id: typeof b?.id === "string" ? b.id : createId("bg"),
    category: cat,
    monthly: Math.max(0, Number(b?.monthly) || 0)
  };
}

function normalizeDebt(d) {
  let debtType = d.debtType === "card" ? "card" : "other";
  if (d.debtType == null && String(d.label ?? "").toLowerCase().includes("tarjeta")) {
    debtType = "card";
  }
  return {
    id: typeof d.id === "string" ? d.id : createId("d"),
    debtType,
    label: String(d.label ?? ""),
    balance: Number(d.balance) || 0,
    minPayment: Number(d.minPayment) || 0
  };
}

function normalizeIncomeLine(line) {
  return {
    id: typeof line.id === "string" ? line.id : createId("inc"),
    label: String(line.label ?? "Ingreso"),
    amount: Number(line.amount) || 0,
    date: line.date ? sanitizeISODate(line.date) : formatDateInput(),
    cadence: normalizeIncomeCadence(line.cadence)
  };
}

function normalizeSavingsGoal(g) {
  const months = Math.max(1, Math.min(600, Math.floor(Number(g.months) || 1)));
  const out = {
    id: typeof g.id === "string" ? g.id : createId("goal"),
    label: String(g.label ?? "Meta"),
    targetAmount: Math.max(0, Number(g.targetAmount) || 0),
    months
  };
  if (typeof g.createdAt === "number" && Number.isFinite(g.createdAt)) {
    out.createdAt = g.createdAt;
  }
  return out;
}

/** Metas sin fecha: se asume índice 0 = más reciente (orden guardado). */
function ensureGoalCreatedAt(goals) {
  if (!goals?.length) return;
  if (goals.every((g) => typeof g.createdAt === "number" && Number.isFinite(g.createdAt))) return;
  const base = Date.now();
  goals.forEach((g, i) => {
    if (typeof g.createdAt !== "number" || !Number.isFinite(g.createdAt)) {
      g.createdAt = base - i * 60000;
    }
  });
}

function sortSavingsGoalsNewestFirstInPlace(goals) {
  if (!goals?.length) return;
  ensureGoalCreatedAt(goals);
  if (goals.length > 1) goals.sort((a, b) => b.createdAt - a.createdAt);
}

function normalizeUtilityBill(b) {
  const cat = UTILITY_CATEGORY_KEYS.includes(b.categoryKey) ? b.categoryKey : "other";
  return {
    id: typeof b.id === "string" ? b.id : createId("util"),
    categoryKey: cat,
    label: String(b.label ?? "").trim(),
    amount: Math.max(0, Number(b.amount) || 0),
    date: b.date && /^\d{4}-\d{2}-\d{2}$/.test(String(b.date)) ? String(b.date) : formatDateInput(),
    dayOfMonth: Math.max(1, Math.min(31, Math.floor(Number(b.dayOfMonth) || 1))),
    payUrl: String(b.payUrl ?? "").trim(),
    cancelled: Boolean(b.cancelled)
  };
}

function normalizeSubscriptionCadence(c) {
  return c === "weekly" || c === "monthly" ? c : "daily";
}

function normalizeSubscription(s) {
  const key = String(s.serviceKey ?? "custom");
  const serviceKey = SUBSCRIPTION_SERVICES.some((x) => x.id === key) ? key : "custom";
  return {
    id: typeof s.id === "string" ? s.id : createId("subp"),
    serviceKey,
    customLabel: String(s.customLabel ?? "").trim(),
    customUnsubUrl: String(s.customUnsubUrl ?? "").trim(),
    cadence: normalizeSubscriptionCadence(s.cadence),
    amount: Math.max(0, Number(s.amount) || 0),
    dayOfMonth: Math.max(1, Math.min(31, Math.floor(Number(s.dayOfMonth) || 1))),
    cancelled: Boolean(s.cancelled)
  };
}

function stripCalendarDate(d) {
  const x = new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
}

function toISODateLocal(d) {
  const x = stripCalendarDate(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const da = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function nextRecurringDueDate(dayOfMonth, from = new Date()) {
  const today = stripCalendarDate(from);
  const y = today.getFullYear();
  const m = today.getMonth();
  const clamp = (year, monthIdx) => {
    const last = new Date(year, monthIdx + 1, 0).getDate();
    return Math.min(dayOfMonth, last);
  };
  let due = new Date(y, m, clamp(y, m));
  if (due < today) {
    const nm = m + 1;
    if (nm > 11) due = new Date(y + 1, 0, clamp(y + 1, 0));
    else due = new Date(y, nm, clamp(y, nm));
  }
  return stripCalendarDate(due);
}

function calendarDaysBetween(fromDate, toDate) {
  const a = stripCalendarDate(fromDate).getTime();
  const b = stripCalendarDate(toDate).getTime();
  return Math.round((b - a) / 86400000);
}

function loadNotifyLog() {
  try {
    const raw = localStorage.getItem(NOTIFY_LOG_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

function saveNotifyLog(log) {
  try {
    localStorage.setItem(NOTIFY_LOG_KEY, JSON.stringify(log));
  } catch {
    /* ignore */
  }
}

function appPageUrlForDeepLink() {
  if (location.protocol === "file:") return location.href.split("#")[0];
  return `${location.origin}${location.pathname}${location.search}`.split("#")[0] || location.href.split("#")[0];
}

function safeExternalPayUrl(raw) {
  const s = String(raw || "").trim();
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.href;
  } catch {
    return "";
  }
}

function utilityCategoryLabel(key) {
  const k = `utility_cat_${key}`;
  const x = t(k);
  return x === k ? t("utility_cat_other") : x;
}

function subscriptionServiceLabel(serviceKey) {
  const k = `subsvc_${String(serviceKey).replace(/-/g, "_")}`;
  const x = t(k);
  return x === k ? serviceKey : x;
}

function subscriptionDisplayName(s) {
  if (s.serviceKey === "custom") return s.customLabel || t("subsvc_custom");
  return subscriptionServiceLabel(s.serviceKey);
}

function subscriptionUnsubUrl(s) {
  const custom = safeExternalPayUrl(s.customUnsubUrl);
  if (custom) return custom;
  const def = subscriptionServiceDef(s.serviceKey);
  return safeExternalPayUrl(def.unsub) || "";
}

function resolveUtilityNotifyUrl(bill) {
  const pay = safeExternalPayUrl(bill.payUrl);
  if (pay) return pay;
  return `${appPageUrlForDeepLink()}#utility-${bill.id}`;
}

function resolveSubscriptionNotifyUrl(s) {
  const u = subscriptionUnsubUrl(s);
  if (u) return u;
  return `${appPageUrlForDeepLink()}#sub-${s.id}`;
}

function formatRecurringShortDate(d) {
  return stripCalendarDate(d).toLocaleDateString(getIntlLocale(), {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

const COMFORT_BACKUP_FORMAT = "comfortLedgerBackup";
const COMFORT_BACKUP_VERSION = 1;

function hydrateComfortStateFromRaw(data) {
  if (!data || typeof data !== "object") {
    return null;
  }
  try {
    const base = defaultState();
    let incomeLines = Array.isArray(data.incomeLines) ? data.incomeLines.map(normalizeIncomeLine) : [];
    if (!incomeLines.length) {
      const legacy = parseNum(data.monthlyIncome);
      const amt = Number.isFinite(legacy) ? legacy : base.incomeLines[0].amount;
      incomeLines = [{ id: createId("inc"), label: "Principal", amount: amt, date: formatDateInput() }];
    }
    const expenses = Array.isArray(data.expenses) ? data.expenses.map(normalizeExpense) : base.expenses;
    const debts = Array.isArray(data.debts) ? data.debts.map(normalizeDebt) : base.debts;
    const savingsGoals = Array.isArray(data.savingsGoals)
      ? data.savingsGoals.map(normalizeSavingsGoal)
      : base.savingsGoals;
    sortSavingsGoalsNewestFirstInPlace(savingsGoals);
    let utilityBills = Array.isArray(data.utilityBills)
      ? data.utilityBills.map(normalizeUtilityBill)
      : [];
    if (!utilityBills.length && Array.isArray(data.recurringPayments)) {
      utilityBills = data.recurringPayments.map((r) =>
        normalizeUtilityBill({
          id: r.id,
          categoryKey: "other",
          label: String(r.label ?? ""),
          amount: Number(r.amount) || 0,
          date: formatDateInput(),
          dayOfMonth: Math.max(1, Math.min(31, Math.floor(Number(r.dayOfMonth) || 1))),
          payUrl: String(r.payUrl ?? ""),
          cancelled: Boolean(r.cancelled)
        })
      );
    }
    const subscriptions = Array.isArray(data.subscriptions)
      ? data.subscriptions.map(normalizeSubscription)
      : base.subscriptions.slice();
    const budgets = Array.isArray(data.budgets) ? data.budgets.map(normalizeBudget) : base.budgets.slice();
    const lsParsed = parseNum(data.liquidSavings);
    const liquidSavings = Number.isFinite(lsParsed) ? lsParsed : base.liquidSavings;
    const profile = normalizeProfile(data.profile) || base.profile;
    return {
      ...base,
      profile,
      incomeLines,
      liquidSavings,
      expenses,
      debts,
      savingsGoals,
      utilityBills,
      subscriptions,
      budgets
    };
  } catch {
    return null;
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const data = JSON.parse(raw);
    const hydrated = hydrateComfortStateFromRaw(data);
    return hydrated || defaultState();
  } catch {
    return defaultState();
  }
}

function saveState(payload) {
  const snapshot = payload || (typeof state !== "undefined" ? state : null);
  if (!snapshot) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    flashSavedIndicator();
  } catch (err) {
    console.warn("Comfort Ledger: no se pudo guardar", err);
  }
  scheduleHostedPushSync();
}

let __savedFlashTimer = null;
function flashSavedIndicator() {
  const host = document.getElementById("comfortSavedIndicator");
  if (!host) return;
  host.textContent = t("saved_label");
  host.classList.add("comfort-saved-indicator--visible");
  host.setAttribute("aria-live", "polite");
  if (__savedFlashTimer) clearTimeout(__savedFlashTimer);
  __savedFlashTimer = setTimeout(() => {
    host.classList.remove("comfort-saved-indicator--visible");
  }, 1200);
}

let __undoTimer = null;
function scheduleUndo(entry) {
  const toast = document.getElementById("comfortUndoToast");
  if (!toast) return;
  const label = toast.querySelector("[data-undo-label]");
  const btn = toast.querySelector("[data-undo-action]");
  const key =
    entry.kind === "income"
      ? "undo_deleted_income"
      : entry.kind === "expense"
        ? "undo_deleted_expense"
        : "undo_deleted_debt";
  if (label) label.textContent = t(key);
  if (btn) btn.textContent = t("undo_action");
  toast.classList.add("comfort-undo-toast--visible");

  if (__undoTimer) clearTimeout(__undoTimer);
  __undoTimer = setTimeout(() => {
    toast.classList.remove("comfort-undo-toast--visible");
  }, 5500);

  const handler = () => {
    if (entry.kind === "income") state.incomeLines.unshift(entry.item);
    else if (entry.kind === "expense") state.expenses.unshift(entry.item);
    else if (entry.kind === "debt") state.debts.unshift(entry.item);
    renderAll();
    saveState();
    toast.classList.remove("comfort-undo-toast--visible");
    btn?.removeEventListener("click", handler);
    if (__undoTimer) clearTimeout(__undoTimer);
  };
  btn?.addEventListener("click", handler, { once: true });
}

function comfortApplyTrustPills() {
  const p1 = document.getElementById("comfortTrustPillPrimary");
  const p2 = document.getElementById("comfortTrustPillSecondary");
  if (!p1 || !p2) {
    return;
  }
  if (window.__COMFORT_HOSTED && window.__COMFORT_AI_COACH) {
    p1.textContent = t("pill_device_data");
    p2.textContent = t("pill_network_coach");
  } else {
    p1.textContent = t("pill_local");
    p2.textContent = t("pill_offline");
  }
}

function comfortSnapshotForExport() {
  return {
    profile: state.profile,
    incomeLines: state.incomeLines,
    liquidSavings: state.liquidSavings,
    expenses: state.expenses,
    debts: state.debts,
    savingsGoals: state.savingsGoals,
    utilityBills: state.utilityBills,
    subscriptions: state.subscriptions
  };
}

function comfortExportBackup() {
  const wrap = {
    [COMFORT_BACKUP_FORMAT]: true,
    version: COMFORT_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appLocale: UI_LOCALE,
    data: comfortSnapshotForExport()
  };
  const blob = new Blob([JSON.stringify(wrap, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  const objUrl = URL.createObjectURL(blob);
  a.href = objUrl;
  a.download = `comfort-ledger-backup-${stamp}.json`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objUrl), 2500);
}

function comfortParseBackupText(text) {
  const parsed = JSON.parse(text);
  let inner = parsed;
  if (parsed && parsed[COMFORT_BACKUP_FORMAT] === true && parsed.data && typeof parsed.data === "object") {
    inner = parsed.data;
  }
  return hydrateComfortStateFromRaw(inner);
}

function comfortSetBackupStatus(msg, kind) {
  const el = document.getElementById("comfortBackupStatus");
  if (!el) return;
  if (!msg) {
    el.hidden = true;
    el.textContent = "";
    el.classList.remove("comfort-backup-status--ok", "comfort-backup-status--err");
    return;
  }
  el.hidden = false;
  el.textContent = msg;
  el.classList.toggle("comfort-backup-status--ok", kind === "ok");
  el.classList.toggle("comfort-backup-status--err", kind === "err");
}

function getStoredProfile() {
  return normalizeProfile(state?.profile);
}

function setStoredProfile(profile) {
  state.profile = normalizeProfile(profile);
  saveState(state);
  renderHostedProfileCard();
}

/* extracted to comfort-ledger-onboarding.js: renderHostedProfileCard */

function monthlyFromExpense(exp) {
  const a = Number(exp.amount) || 0;
  if (exp.cadence === "weekly") return a * (52 / 12);
  if (exp.cadence === "monthly") return a;
  return a * 30;
}

function topExpenseCategories(state, n = 6) {
  const map = new Map();
  for (const e of state.expenses || []) {
    const cat = String(e.category || "Otros");
    map.set(cat, (map.get(cat) || 0) + monthlyFromExpense(e));
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, n);
}

function tacticalRadarPolygon(percents, cx, cy, maxR) {
  const n = percents.length;
  return percents
    .map((v, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      const r = (Math.min(100, Math.max(0, v)) / 100) * maxR;
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    })
    .join(" ");
}

function tacticalOrbitConic(weights, colors) {
  if (!weights.length || weights.every((w) => (w || 0) <= 0)) {
    return "conic-gradient(from -90deg, #2a2d35 0deg 360deg)";
  }
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  let d = 0;
  const gap = 1.25;
  const parts = [];
  for (let i = 0; i < weights.length; i++) {
    const span = Math.max(0.2, (weights[i] / sum) * 360 - gap);
    const d0 = d;
    d += span + gap;
    parts.push(`${colors[i]} ${d0}deg ${d0 + span}deg`);
  }
  return `conic-gradient(from -90deg, ${parts.join(", ")})`;
}

function monthlyFromIncome(line) {
  const amount = Math.max(0, Number(line?.amount) || 0);
  if (amount <= 0) return 0;
  const cadence = normalizeIncomeCadence(line?.cadence);
  if (cadence === "weekly") return amount * (52 / 12);
  if (cadence === "biweekly") return amount * (26 / 12);
  if (cadence === "one-off") return 0;
  return amount;
}

function sumIncomeForCalendarMonth(state, refDate = new Date()) {
  const y = refDate.getFullYear();
  const m = refDate.getMonth();
  let income = 0;
  for (const line of state.incomeLines || []) {
    const cadence = normalizeIncomeCadence(line.cadence);
    if (cadence === "one-off") {
      const raw = line.date;
      if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(String(raw))) continue;
      const [yy, mm, dd] = String(raw).split("-").map(Number);
      const dt = new Date(yy, mm - 1, dd);
      if (dt.getFullYear() === y && dt.getMonth() === m) {
        income += Math.max(0, Number(line.amount) || 0);
      }
      continue;
    }
    income += monthlyFromIncome(line);
  }
  return income;
}

function compute(state) {
  const refMonth = new Date();
  const income = sumIncomeForCalendarMonth(state, refMonth);
  const incomeMonthLabel = monthIncomeLabel(refMonth);
  const savings = Math.max(0, parseNum(state.liquidSavings) || Number(state.liquidSavings) || 0);
  let monthlyExpenses = 0;
  for (const e of state.expenses) {
    monthlyExpenses += monthlyFromExpense(e);
  }
  let totalDebt = 0;
  let monthlyDebtPay = 0;
  let cardDebtBalance = 0;
  for (const d of state.debts) {
    const b = Math.max(0, Number(d.balance) || 0);
    const m = Math.max(0, Number(d.minPayment) || 0);
    totalDebt += b;
    monthlyDebtPay += m;
    if (d.debtType === "card") {
      cardDebtBalance += b;
    }
  }
  const freeAfter = income - monthlyExpenses - monthlyDebtPay;
  const debtVsSavings = totalDebt > 0 ? totalDebt / Math.max(savings, 1) : 0;

  let savingsGoalsMonthly = 0;
  for (const g of state.savingsGoals || []) {
    const t = Math.max(0, Number(g.targetAmount) || 0);
    const mo = Math.max(1, Math.min(600, Math.floor(Number(g.months) || 1)));
    if (t <= 0) continue;
    savingsGoalsMonthly += t / mo;
  }
  const freeAfterGoals = freeAfter - savingsGoalsMonthly;

  const H = HEALTH_COPY[UI_LOCALE] || HEALTH_COPY.es;
  let tone = "positive";
  let label = H.positiveLabel;
  let narrative = H.positiveBase;

  if (totalDebt > 0 && savings < totalDebt) {
    tone = "negative";
    label = H.negativeLabel;
    narrative = H.negativeNarr(savings, totalDebt);
  } else if (totalDebt > 0 && savings < totalDebt * 1.15) {
    tone = "alert";
    label = H.thinLabel;
    narrative = H.thinNarr(savings, totalDebt);
  } else if (freeAfter < 0) {
    tone = "alert";
    label = H.flowLabel;
    narrative = H.flowNarr(Math.abs(freeAfter));
  } else if (totalDebt > 0 && debtVsSavings > 0.5) {
    tone = "alert";
    label = H.heavyLabel;
    narrative = H.heavyNarr;
  }

  if (savingsGoalsMonthly > 0) {
    if (freeAfterGoals >= 0) {
      narrative += H.goalsPos(savingsGoalsMonthly, freeAfterGoals);
    } else {
      narrative += H.goalsNeg(savingsGoalsMonthly, freeAfter, Math.abs(freeAfterGoals));
      if (tone === "positive" && freeAfter >= 0) {
        tone = "alert";
        label = H.goalsVsFlowLabel;
      }
    }
  }

  const spendShare = income > 0 ? Math.min(1, (monthlyExpenses + monthlyDebtPay) / income) : 0;

  const expenseTop = topExpenseCategories(state, 6);
  const incomeRef = Math.max(income, 1e-9);
  const radarPercents =
    income > 0
      ? [
          Math.min(100, (monthlyExpenses / incomeRef) * 100),
          Math.min(100, (monthlyDebtPay / incomeRef) * 100),
          Math.min(100, (savingsGoalsMonthly / incomeRef) * 100),
          Math.min(100, Math.max(0, (freeAfter / incomeRef) * 100)),
          Math.min(100, (savings / incomeRef) * 100)
        ]
      : [0, 0, 0, 0, 0];

  const re = Math.max(0, monthlyExpenses);
  const rd = Math.max(0, monthlyDebtPay);
  const rg = Math.max(0, savingsGoalsMonthly);
  const rf = Math.max(0, freeAfterGoals);
  const ringSum = re + rd + rg + rf;
  const orbitScale = Math.max(income, ringSum, 1);
  const orbitWeights = [re, rd, rg, rf, Math.max(0, orbitScale - ringSum)];
  const orbitColors = ["#0e7490", "#be123c", "#14b8a6", "#0f766e", "rgba(36, 38, 46, 0.92)"];
  const orbitConic = tacticalOrbitConic(orbitWeights, orbitColors);

  const goalsForTactical = (state.savingsGoals || [])
    .filter((g) => (Number(g.targetAmount) || 0) > 0)
    .map((g) => {
      const gTarget = Math.max(Number(g.targetAmount) || 0, 1);
      return {
        label: String(g.label || t("default_goal_name")).slice(0, 32),
        pct: Math.min(100, (savings / gTarget) * 100)
      };
    })
    .slice(0, 6);

  const expensesByCategory = (function () {
    const map = new Map();
    for (const e of state.expenses || []) {
      const cat = e.category || "Otros";
      map.set(cat, (map.get(cat) || 0) + monthlyFromExpense(e));
    }
    return Array.from(map.entries())
      .map(([category, monthly]) => ({ category, monthly }))
      .sort((a, b) => b.monthly - a.monthly);
  })();

  return {
    income,
    incomeMonthLabel,
    savings,
    monthlyExpenses,
    totalDebt,
    monthlyDebtPay,
    cardDebtBalance,
    freeAfter,
    freeAfterGoals,
    savingsGoalsMonthly,
    debtVsSavings,
    tone,
    label,
    narrative,
    expensesByCategory,
    spendShare,
    expenseTop,
    radarPercents,
    orbitConic,
    goalsForTactical
  };
}

function buildCoachTips(snap) {
  const tips = [];
  const income = Number(snap.income) || 0;
  const totalRecurring = (Number(snap.monthlyExpenses) || 0) + (Number(snap.monthlyDebtPay) || 0);
  const debtMonthly = Number(snap.monthlyDebtPay) || 0;
  const free = Number(snap.freeAfter) || 0;

  if (income > 0 && totalRecurring >= income) {
    tips.push(
      UI_LOCALE === "en"
        ? "Your fixed expenses and debt minimums eat your whole income. Before anything else, trim the top category — that alone buys you breathing room."
        : UI_LOCALE === "zh"
          ? "你的固定支出加上最低还款已占满全部收入。先砍最大的那项类别，最直接的缓冲。"
          : "Tus gastos fijos + mínimos de deuda se comen todo el ingreso. Antes que nada, recorta la categoría más grande — eso solo ya te da aire."
    );
  } else if (free > 0 && free < income * 0.1) {
    tips.push(
      UI_LOCALE === "en"
        ? `You only keep ~${((free / income) * 100).toFixed(0)}% of your income free. Healthy range is 20%+. Look for one subscription or "small" recurring expense to cancel this week.`
        : UI_LOCALE === "zh"
          ? `你本月仅剩约 ${((free / income) * 100).toFixed(0)}% 可自由支配。健康区间是 20% 以上。本周找一项订阅或“小额”定期支出取消。`
          : `Solo te queda libre ~${((free / income) * 100).toFixed(0)}% del ingreso. Sano es 20% o más. Busca una suscripción o gasto recurrente "pequeño" para cancelar esta semana.`
    );
  }

  const topCat = (snap.expensesByCategory || [])[0];
  if (topCat && income > 0 && topCat.monthly / income > 0.35) {
    tips.push(
      UI_LOCALE === "en"
        ? `"${topCat.category}" is ${((topCat.monthly / income) * 100).toFixed(0)}% of your income. If this isn't rent, it's probably your biggest lever.`
        : UI_LOCALE === "zh"
          ? `「${topCat.category}」占收入的 ${((topCat.monthly / income) * 100).toFixed(0)}%。如果不是房租，这可能是最大的可调整项。`
          : `"${topCat.category}" es ${((topCat.monthly / income) * 100).toFixed(0)}% de tu ingreso. Si no es renta, probablemente es tu palanca más grande.`
    );
  }

  if (debtMonthly > 0 && free > 0) {
    const extraToDebt = Math.min(free * 0.5, debtMonthly);
    if (extraToDebt > 5) {
      tips.push(
        UI_LOCALE === "en"
          ? `Send even ${fmtMoney(extraToDebt)} extra toward debt each month and you cut the payoff time roughly in half.`
          : UI_LOCALE === "zh"
            ? `每月再多投入 ${fmtMoney(extraToDebt)} 到债务，还清时间大约可缩短一半。`
            : `Si destinas ${fmtMoney(extraToDebt)} extra cada mes a la deuda, reduces el plazo a la mitad aproximadamente.`
      );
    }
  }

  if (!tips.length) {
    tips.push(
      UI_LOCALE === "en"
        ? "Numbers look balanced. Keep the habit: quick check every Sunday, adjust one line if it moved, move on."
        : UI_LOCALE === "zh"
          ? "整体还算平衡。保持习惯：每周日快速检查一次，有变动就调整一行，继续前行。"
          : "Los números van balanceados. Mantén el hábito: un vistazo los domingos, ajusta una línea si se movió, y sigue."
    );
  }

  return tips.slice(0, 3);
}

function coachReply(question, snap) {
  const q = question.toLowerCase();
  const lines = [];
  const comfort = /confort|comfort|cómod|tranquil|segur|peace|calm|安心|舒适|轻松/i.test(q);
  const debt = /deud|debo|prest|tarjeta|debt|loan|card|owe|债务|欠款|信用卡|还贷/i.test(q);
  const spend = /gast|gasto|cuánto gasto|spend|expense|花费|支出多少/i.test(q);
  const incomeKw = /ingres|gano|salario|sueldo|income|salary|pay|earn|收入|工资|薪水/i.test(q);
  const savingsKw = /ahorr|líquid|efectivo|sav|liquid|cash cushion|储蓄|现金|存款/i.test(q);
  const goalsKw = /meta|vacaci|enganche|apartad|aparta|ahorrar para|goal|target|目标|首付|假期/i.test(q);
  const adviceKw = /consej|recomien|qué hago|ideas|tips|advice|recommend|建议|怎么办/i.test(q);
  const whereMoneyKw = /dónde.*dinero|a d[oó]nde.*va|where.*money|money.*go|钱去哪|花到哪/i.test(q);
  const debtTimeKw = /cu[aá]nto tard|cuando.*termin|pagar.*deuda|payoff|cuánd.*salgo|什么时候.*还完|多久.*还清/i.test(q);
  const affordMatch = q.match(/(?:puedo pagar|can i (?:afford|pay)|afford|pay for)[^\d$€]*\$?([\d.,]+)/i);

  if (whereMoneyKw) {
    const top = (snap.expensesByCategory || []).slice(0, 3);
    if (top.length) {
      const formatted = top.map((row) => `${row.category} ${fmtMoney(row.monthly)}`).join(", ");
      lines.push(
        UI_LOCALE === "en"
          ? `Your top 3 expense categories this month: ${formatted}. Total monthly spend: ${fmtMoney(snap.monthlyExpenses)}.`
          : UI_LOCALE === "zh"
            ? `本月支出前三：${formatted}。总月支出：${fmtMoney(snap.monthlyExpenses)}。`
            : `Tus 3 categorías de gasto más grandes este mes: ${formatted}. Gasto mensual total: ${fmtMoney(snap.monthlyExpenses)}.`
      );
    } else {
      lines.push(
        UI_LOCALE === "en"
          ? "Add some expenses first — then I can tell you exactly where it goes."
          : UI_LOCALE === "zh"
            ? "先添加一些支出，我才能告诉你钱具体花到哪里。"
            : "Agrega primero algunos gastos — luego te digo exactamente a dónde se va."
      );
    }
  }

  if (affordMatch) {
    const amount = parseNum(affordMatch[1]);
    if (Number.isFinite(amount) && amount > 0) {
      const free = Number(snap.freeAfter) || 0;
      if (amount <= free) {
        lines.push(
          UI_LOCALE === "en"
            ? `Yes — after everything you have ~${fmtMoney(free)} free this month. A ${fmtMoney(amount)} expense leaves ~${fmtMoney(free - amount)}.`
            : UI_LOCALE === "zh"
              ? `可以 — 扣除一切后本月约 ${fmtMoney(free)} 可自由支配。${fmtMoney(amount)} 的支出后约剩 ${fmtMoney(free - amount)}。`
              : `Sí — después de todo te quedan ~${fmtMoney(free)} libres este mes. Un gasto de ${fmtMoney(amount)} te deja ~${fmtMoney(free - amount)}.`
        );
      } else {
        lines.push(
          UI_LOCALE === "en"
            ? `It doesn't fit this month: free after everything is ~${fmtMoney(free)}, and you're asking about ${fmtMoney(amount)}. If you can wait or split it, your cash cushion is ${fmtMoney(snap.savings)}.`
            : UI_LOCALE === "zh"
              ? `本月放不下：扣除一切后约 ${fmtMoney(free)}，而你问的是 ${fmtMoney(amount)}。现金备用：${fmtMoney(snap.savings)}。`
              : `No cuadra este mes: libre después de todo ~${fmtMoney(free)}, y preguntas por ${fmtMoney(amount)}. Si puedes esperar o dividirlo, tu colchón es ${fmtMoney(snap.savings)}.`
        );
      }
    }
  }

  if (debtTimeKw && snap.totalDebt > 0) {
    const minMonthly = Math.max(1, Number(snap.monthlyDebtPay) || 0);
    const approxMonths = Math.ceil(snap.totalDebt / minMonthly);
    const years = (approxMonths / 12).toFixed(1);
    lines.push(
      UI_LOCALE === "en"
        ? `Paying only the minimums (${fmtMoney(minMonthly)}/mo) the total debt (${fmtMoney(snap.totalDebt)}) takes about ${approxMonths} months (~${years} years) before interest. Adding any extra speeds it up a lot.`
        : UI_LOCALE === "zh"
          ? `仅还最低（${fmtMoney(minMonthly)}/月），债务合计 ${fmtMoney(snap.totalDebt)} 大约需要 ${approxMonths} 个月（约 ${years} 年，未计利息）。多还一点速度会快很多。`
          : `Pagando solo los mínimos (${fmtMoney(minMonthly)}/mes) la deuda total (${fmtMoney(snap.totalDebt)}) tarda unos ${approxMonths} meses (~${years} años) sin contar intereses. Cualquier extra acorta mucho el plazo.`
    );
  }

  if (adviceKw) {
    const tips = buildCoachTips(snap);
    if (tips.length) {
      const bullet = UI_LOCALE === "zh" ? "· " : "• ";
      lines.push(tips.map((tip) => bullet + tip).join("\n"));
    }
  }

  if (comfort) lines.push(snap.narrative);
  if (debt) {
    lines.push(
      UI_LOCALE === "en"
        ? `Total debt: ${fmtMoney(snap.totalDebt)} (cards: ${fmtMoney(snap.cardDebtBalance)}). Minimum payments / month: ${fmtMoney(snap.monthlyDebtPay)}.`
        : UI_LOCALE === "zh"
          ? `债务合计：${fmtMoney(snap.totalDebt)}（信用卡：${fmtMoney(snap.cardDebtBalance)}）。每月最低还款：${fmtMoney(snap.monthlyDebtPay)}。`
          : `Deuda total: ${fmtMoney(snap.totalDebt)} (tarjetas: ${fmtMoney(snap.cardDebtBalance)}). Pagos mínimos al mes: ${fmtMoney(snap.monthlyDebtPay)}.`
    );
  }
  if (spend) {
    lines.push(
      UI_LOCALE === "en"
        ? `Monthly expenses (daily, weekly, monthly rolled up): ${fmtMoney(snap.monthlyExpenses)}.`
        : UI_LOCALE === "zh"
          ? `月化支出（日/周/月折算）：${fmtMoney(snap.monthlyExpenses)}。`
          : `Gasto mensualizado (diario, semanal y mensual): ${fmtMoney(snap.monthlyExpenses)}.`
    );
  }
  if (incomeKw) {
    lines.push(
      UI_LOCALE === "en"
        ? `Income received in ${snap.incomeMonthLabel}: ${fmtMoney(snap.income)} (by each row’s date).`
        : UI_LOCALE === "zh"
          ? `${snap.incomeMonthLabel} 已收收入：${fmtMoney(snap.income)}（按各行日期）。`
          : `Ingreso cobrado en ${snap.incomeMonthLabel}: ${fmtMoney(snap.income)} (por fecha de cada fila).`
    );
  }
  if (savingsKw) {
    lines.push(
      UI_LOCALE === "en"
        ? `Cash / liquid savings: ${fmtMoney(snap.savings)}.`
        : UI_LOCALE === "zh"
          ? `现金 / 活期储蓄：${fmtMoney(snap.savings)}。`
          : `Efectivo / ahorros líquidos: ${fmtMoney(snap.savings)}.`
    );
  }
  if (goalsKw) {
    if (snap.savingsGoalsMonthly > 0) {
      lines.push(
        UI_LOCALE === "en"
          ? `Planned goal set-aside: ${fmtMoney(snap.savingsGoalsMonthly)}/month. Free after expenses, minimums & goals: ~${fmtMoney(snap.freeAfterGoals)}.`
          : UI_LOCALE === "zh"
            ? `目标每月预留：${fmtMoney(snap.savingsGoalsMonthly)}。扣除支出、最低还款与目标后结余约 ${fmtMoney(snap.freeAfterGoals)}。`
            : `Apartado planificado a metas: ${fmtMoney(snap.savingsGoalsMonthly)} al mes. Libre después de gastos, mínimos y metas: ~${fmtMoney(snap.freeAfterGoals)}.`
      );
    } else {
      lines.push(
        UI_LOCALE === "en"
          ? "No goals yet under “Goals from your paychecks”; add a target amount and months to see the monthly set-aside."
          : UI_LOCALE === "zh"
            ? "「与工资挂钩的目标」中尚无目标；请填写目标金额与月数以查看每月预留。"
            : "Aún no hay metas en la sección “Metas con tus cobros”; agrega monto objetivo y meses para ver el apartado mensual."
      );
    }
  }
  if (!lines.length) {
    lines.push(
      UI_LOCALE === "en"
        ? `Quick read: income in ${snap.incomeMonthLabel} ${fmtMoney(snap.income)}, expenses ~${fmtMoney(snap.monthlyExpenses)}, debt ${fmtMoney(snap.totalDebt)}, free after all ~${fmtMoney(snap.freeAfter)}.${snap.savingsGoalsMonthly > 0 ? ` Goal set-aside: ${fmtMoney(snap.savingsGoalsMonthly)}/mo; free with goals ~${fmtMoney(snap.freeAfterGoals)}.` : ""} ${snap.narrative}`
        : UI_LOCALE === "zh"
          ? `速览：${snap.incomeMonthLabel} 收入 ${fmtMoney(snap.income)}，支出约 ${fmtMoney(snap.monthlyExpenses)}，债务 ${fmtMoney(snap.totalDebt)}，全部扣除后结余约 ${fmtMoney(snap.freeAfter)}。${snap.savingsGoalsMonthly > 0 ? ` 目标每月预留 ${fmtMoney(snap.savingsGoalsMonthly)}；含目标后结余约 ${fmtMoney(snap.freeAfterGoals)}。` : ""} ${snap.narrative}`
          : `Resumen rápido: ingreso cobrado en ${snap.incomeMonthLabel} ${fmtMoney(snap.income)}, gastos ~${fmtMoney(snap.monthlyExpenses)}, deuda ${fmtMoney(snap.totalDebt)}, libre después de todo ~${fmtMoney(snap.freeAfter)}.${snap.savingsGoalsMonthly > 0 ? ` Apartado a metas: ${fmtMoney(snap.savingsGoalsMonthly)}/mes; libre con metas ~${fmtMoney(snap.freeAfterGoals)}.` : ""} ${snap.narrative}`
    );
  }
  return lines.join(" ");
}

let state = loadState();

let els = {};

function collectEls() {
  return {
    incomeList: document.getElementById("incomeList"),
    liquidSavings: document.getElementById("liquidSavings"),
    expenseList: document.getElementById("expenseList"),
    debtList: document.getElementById("debtList"),
    healthRing: document.getElementById("healthRing"),
    healthLabel: document.getElementById("healthLabel"),
    healthNarrative: document.getElementById("healthNarrative"),
    healthMetrics: document.getElementById("healthMetrics"),
    donutFlow: document.getElementById("donutFlow"),
    donutLegend: document.getElementById("donutLegend"),
    barCompare: document.getElementById("barCompare"),
    cushionFootnote: document.getElementById("cushionFootnote"),
    cadenceBars: document.getElementById("cadenceBars"),
    cardDebtChart: document.getElementById("cardDebtChart"),
    coachThread: document.getElementById("coachThread"),
    coachForm: document.getElementById("coachForm"),
    coachInput: document.getElementById("coachInput"),
    coachStatus: document.getElementById("coachStatus"),
    profileCard: document.getElementById("comfortProfileCard"),
    profileEditBtn: document.getElementById("comfortProfileEditBtn"),
    addIncomeBtn: document.getElementById("addIncomeBtn"),
    addExpenseBtn: document.getElementById("addExpenseBtn"),
    addDebtBtn: document.getElementById("addDebtBtn"),
    goalsList: document.getElementById("goalsList"),
    goalsSummary: document.getElementById("goalsSummary"),
    goalsScrollWrap: document.getElementById("goalsScrollWrap"),
    addGoalBtn: document.getElementById("addGoalBtn"),
    dashTacticalGrid: document.getElementById("dashTacticalGrid"),
    utilityBillsList: document.getElementById("utilityBillsList"),
    utilityBillsSummary: document.getElementById("utilityBillsSummary"),
    addUtilityBillBtn: document.getElementById("addUtilityBillBtn"),
    subscriptionsList: document.getElementById("subscriptionsList"),
    subscriptionsSummary: document.getElementById("subscriptionsSummary"),
    addSubscriptionBtn: document.getElementById("addSubscriptionBtn"),
    recurringNotifyBtn: document.getElementById("recurringNotifyBtn"),
    recurringNotifyStatus: document.getElementById("recurringNotifyStatus"),
    postDashToday: document.getElementById("postDashToday"),
    postDashWeekly: document.getElementById("postDashWeekly"),
    budgetsList: document.getElementById("budgetsList"),
    budgetsSummary: document.getElementById("budgetsSummary"),
    addBudgetBtn: document.getElementById("addBudgetBtn"),
    comfortExportBtn: document.getElementById("comfortExportBtn"),
    comfortImportBtn: document.getElementById("comfortImportBtn"),
    comfortImportFile: document.getElementById("comfortImportFile")
  };
}

function renderKpiHero(snap) {
  const host = document.getElementById("comfortKpiHero");
  const label = document.getElementById("comfortKpiLabel");
  const value = document.getElementById("comfortKpiValue");
  const status = document.getElementById("comfortKpiStatus");
  if (!host || !value || !status) return;
  const income = Number(snap?.income) || 0;
  const free = Number(snap?.freeAfter) || 0;

  if (income <= 0) {
    host.dataset.tone = "empty";
    if (label) label.textContent = t("kpi_empty_title");
    value.textContent = "—";
    status.textContent = t("kpi_empty_sub");
    return;
  }

  if (label) label.textContent = t("kpi_free_label");
  value.textContent = fmtMoney(free);

  let tone = "ok";
  let statusText = t("kpi_ok");
  if (free < 0) {
    tone = "warn";
    statusText = t("kpi_neg");
  } else if (free < income * 0.1) {
    tone = "tight";
    statusText = t("kpi_tight");
  } else if (free === 0) {
    tone = "tight";
    statusText = t("kpi_warn");
  }
  host.dataset.tone = tone;
  status.textContent = statusText;
}

function renderHealth(snap) {
  renderKpiHero(snap);
  els.healthRing.className = `health-ring ${snap.tone}`;
  els.healthLabel.textContent = snap.label;
  els.healthNarrative.textContent = snap.narrative;
  const goalRows =
    snap.savingsGoalsMonthly > 0
      ? `
    <li><strong>${fmtMoney(snap.savingsGoalsMonthly)}</strong>${t("health_goal_monthly")}</li>
    <li><strong>${fmtMoney(snap.freeAfterGoals)}</strong>${t("health_free_after_goals")}</li>`
      : "";
  els.healthMetrics.innerHTML = `
    <li><strong>${fmtMoney(snap.income)}</strong>${t("health_income")} (${snap.incomeMonthLabel})</li>
    <li><strong>${fmtMoney(snap.monthlyExpenses)}</strong>${t("health_expenses")}</li>
    <li><strong>${fmtMoney(snap.monthlyDebtPay)}</strong>${t("health_debt_min")}</li>
    <li><strong>${fmtMoney(snap.freeAfter)}</strong>${t("health_free_after")}</li>
    ${goalRows}
    <li><strong>${fmtMoney(snap.savings)}</strong>${t("health_savings")}</li>
    <li><strong>${fmtMoney(snap.totalDebt)}</strong>${t("health_debt_total")}</li>
  `;
}

function renderTacticalDash(snap) {
  const host = els.dashTacticalGrid;
  if (!host) return;

  const labels = [t("dyn_spend"), t("dyn_debt"), t("dyn_goals"), t("dyn_free"), t("dyn_cushion")];
  const rp = snap.radarPercents || [0, 0, 0, 0, 0];
  const cx = 100;
  const cy = 100;
  const maxR = 78;
  const poly = tacticalRadarPolygon(rp, cx, cy, maxR);
  const gridPoly = tacticalRadarPolygon([100, 100, 100, 100, 100], cx, cy, maxR);

  const dynCells = labels
    .map(
      (lab, i) => `
    <div class="dyn-cell" title="${escapeHtml(lab)}: ${rp[i].toFixed(0)}% ${escapeHtml(t("dash_dyn_pct_title"))}">
      <div class="dyn-bar-wrap" aria-hidden="true"><div class="dyn-bar" style="height:${Math.max(4, rp[i])}%"></div></div>
      <span>${escapeHtml(lab)}</span>
      <strong>${rp[i].toFixed(0)}%</strong>
    </div>`
    )
    .join("");

  const maxCat =
    snap.expenseTop && snap.expenseTop.length ? Math.max(...snap.expenseTop.map((c) => c.amount), 1) : 1;
  const catRows =
    snap.expenseTop && snap.expenseTop.length
      ? snap.expenseTop
          .map(
            (c) => `
    <div class="dash-cat-row">
      <span class="dash-cat-name">${escapeHtml(c.category)}</span>
      <div class="dash-cat-track" role="presentation"><i style="width:${(c.amount / maxCat) * 100}%"></i></div>
      <strong class="dash-cat-amt">${fmtMoney(c.amount)}</strong>
    </div>`
          )
          .join("")
      : `<p class="dash-empty">${escapeHtml(t("dash_cat_empty"))}</p>`;

  const goalRows =
    snap.goalsForTactical && snap.goalsForTactical.length
      ? snap.goalsForTactical
          .map(
            (g) => `
    <div class="dash-goal-row">
      <span class="dash-goal-name">${escapeHtml(g.label)}</span>
      <div class="dash-goal-arc" title="${escapeHtml(t("dash_goal_arc_title"))}">
        <i style="width:${g.pct.toFixed(1)}%"></i>
      </div>
      <span class="dash-goal-pct">${g.pct.toFixed(0)}%</span>
    </div>`
          )
          .join("")
      : `<p class="dash-empty">${escapeHtml(t("dash_goal_empty"))}</p>`;

  const orbitNote =
    snap.income > 0
      ? UI_LOCALE === "en"
        ? `Scale: month income (${fmtMoney(snap.income)}). Segments: spend, minimums, goal set-aside, free after goals, remainder.`
        : UI_LOCALE === "zh"
          ? `比例：当月收入（${fmtMoney(snap.income)}）。分段：支出、最低还款、目标预留、目标后结余、其余。`
          : `Escala: ingreso del mes (${fmtMoney(snap.income)}). Tramos: gastos, mínimos, apartado metas, libre tras metas, resto.`
      : UI_LOCALE === "en"
        ? "No income this calendar month: the ring uses monthly totals as reference."
        : UI_LOCALE === "zh"
          ? "本月尚无收入：环形图以月化合计为参考。"
          : "Sin ingreso del mes en curso: el anillo usa totales mensualizados como referencia.";

  host.innerHTML = `
    <div class="dash-card dash-card--dyn">
      <h3 class="dash-card-title">${escapeHtml(t("dash_dyn_title"))}</h3>
      <p class="dash-card-hint">${escapeHtml(t("dash_dyn_hint"))} (${escapeHtml(snap.incomeMonthLabel)})</p>
      <div class="dash-dynamics">${dynCells}</div>
    </div>
    <div class="dash-card dash-card--radar">
      <h3 class="dash-card-title">${escapeHtml(t("dash_radar_title"))}</h3>
      <p class="dash-card-hint">${escapeHtml(t("dash_radar_hint"))}</p>
      <div class="dash-radar-wrap">
        <svg class="dash-radar-svg" viewBox="0 0 200 200" role="img" aria-label="${escapeHtml(t("dash_radar_aria"))}">
          <polygon class="dash-radar-grid" points="${gridPoly}" />
          <polygon class="dash-radar-fill" points="${poly}" />
          ${rp.map((_, i) => {
            const a = -Math.PI / 2 + (2 * Math.PI * i) / rp.length;
            const x2 = cx + maxR * Math.cos(a);
            const y2 = cy + maxR * Math.sin(a);
            return `<line class="dash-radar-axis" x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" />`;
          }).join("")}
        </svg>
        <ul class="dash-radar-legend">
          ${labels.map((lab, i) => `<li><span class="dash-dot dash-dot--${i}"></span>${escapeHtml(lab)} ${rp[i].toFixed(0)}%</li>`).join("")}
        </ul>
      </div>
    </div>
    <div class="dash-card dash-card--orbit">
      <h3 class="dash-card-title">${escapeHtml(t("dash_orbit_title"))}</h3>
      <p class="dash-card-hint">${escapeHtml(orbitNote)}</p>
        <div class="dash-orbit-stage">
        <div class="dash-orbit-ring"></div>
        <ul class="dash-orbit-legend">
          <li><span class="dash-dot dash-dot--0"></span>${escapeHtml(t("dash_orbit_leg_spend"))}</li>
          <li><span class="dash-dot dash-dot--1"></span>${escapeHtml(t("dash_orbit_leg_debt"))}</li>
          <li><span class="dash-dot dash-dot--2"></span>${escapeHtml(t("dash_orbit_leg_goals"))}</li>
          <li><span class="dash-dot dash-dot--3"></span>${escapeHtml(t("dash_orbit_leg_free"))}</li>
          <li><span class="dash-dot dash-dot--4"></span>${escapeHtml(t("dash_orbit_leg_rest"))}</li>
        </ul>
      </div>
    </div>
    <div class="dash-card dash-card--cat">
      <h3 class="dash-card-title">${escapeHtml(t("dash_cat_title"))}</h3>
      <p class="dash-card-hint">${escapeHtml(t("dash_cat_hint"))}</p>
      <div class="dash-cat-list">${catRows}</div>
    </div>
    <div class="dash-card dash-card--fin">
      <h3 class="dash-card-title">${escapeHtml(t("dash_goal_title"))}</h3>
      <p class="dash-card-hint">${escapeHtml(t("dash_goal_hint"))}</p>
      <div class="dash-goal-list">${goalRows}</div>
    </div>
  `;
  const ring = host.querySelector(".dash-orbit-ring");
  if (ring) {
    ring.style.setProperty("--orbit-conic", snap.orbitConic || "conic-gradient(#2a2d35 0deg 360deg)");
  }
}

function renderDonut(snap) {
  const inc = snap.income || 1;
  const exp = Math.min(inc, snap.monthlyExpenses);
  const debtMin = Math.min(Math.max(0, inc - exp), snap.monthlyDebtPay);
  const rest = Math.max(0, inc - exp - debtMin);
  const pExp = (exp / inc) * 100;
  const pDebt = (debtMin / inc) * 100;
  const pRest = (rest / inc) * 100;
  els.donutFlow.style.background = `conic-gradient(
    var(--donut-exp) 0deg ${pExp * 3.6}deg,
    var(--donut-debt) ${pExp * 3.6}deg ${(pExp + pDebt) * 3.6}deg,
    var(--donut-free) ${(pExp + pDebt) * 3.6}deg 360deg
  )`;
  els.donutLegend.innerHTML = `
    <li><span class="swatch" style="background:var(--donut-exp)"></span>${escapeHtml(t("donut_leg_exp"))} (${pExp.toFixed(0)}% ${escapeHtml(t("donut_leg_exp_pct"))})</li>
    <li><span class="swatch" style="background:var(--donut-debt)"></span>${escapeHtml(t("donut_leg_debt"))} (${pDebt.toFixed(0)}% ${escapeHtml(t("donut_leg_debt_pct"))})</li>
    <li><span class="swatch" style="background:var(--donut-free)"></span>${escapeHtml(t("donut_leg_free"))} (${pRest.toFixed(0)}%)</li>
  `;
  const wrap = els.donutLegend.parentElement;
  if (wrap) {
    let foot = wrap.querySelector("#donutIncomeFootnote");
    if (!foot) {
      foot = document.createElement("p");
      foot.id = "donutIncomeFootnote";
      wrap.appendChild(foot);
    }
    foot.className = "chart-footnote donut-footnote";
    foot.textContent = `${t("donut_footnote")} ${snap.incomeMonthLabel}.`;
  }
}

function renderBarCompare(snap) {
  const total = snap.savings + snap.totalDebt || 1;
  const wS = (snap.savings / total) * 100;
  const wD = (snap.totalDebt / total) * 100;
  els.barCompare.innerHTML = `
    <div class="seg-savings" style="width:${wS}%"></div>
    <div class="seg-debt" style="width:${wD}%"></div>
  `;
  if (snap.totalDebt <= 0) {
    els.cushionFootnote.textContent = t("cushion_none");
  } else if (snap.savings >= snap.totalDebt) {
    els.cushionFootnote.textContent = tFill("cushion_ok", { s: fmtMoney(snap.savings), d: fmtMoney(snap.totalDebt) });
  } else {
    els.cushionFootnote.textContent = tFill("cushion_low", { s: fmtMoney(snap.savings), d: fmtMoney(snap.totalDebt) });
  }
}

function renderCadence(state, snap) {
  let daily = 0;
  let weekly = 0;
  let monthly = 0;
  for (const e of state.expenses) {
    const m = monthlyFromExpense(e);
    if (e.cadence === "weekly") weekly += m;
    else if (e.cadence === "monthly") monthly += m;
    else daily += m;
  }
  const max = Math.max(daily, weekly, monthly, 1);
  els.cadenceBars.innerHTML = `
    <div class="cadence-row">
      <span>${escapeHtml(t("cadence_d_label"))}</span>
      <div class="bar"><i style="width:${(daily / max) * 100}%"></i></div>
      <strong>${fmtMoney(daily)}</strong>
    </div>
    <div class="cadence-row">
      <span>${escapeHtml(t("cadence_w_label"))}</span>
      <div class="bar"><i style="width:${(weekly / max) * 100}%"></i></div>
      <strong>${fmtMoney(weekly)}</strong>
    </div>
    <div class="cadence-row">
      <span>${escapeHtml(t("cadence_m_label"))}</span>
      <div class="bar"><i style="width:${(monthly / max) * 100}%"></i></div>
      <strong>${fmtMoney(monthly)}</strong>
    </div>
    <p class="sub cadence-total">${escapeHtml(t("cadence_total"))} ${fmtMoney(snap.monthlyExpenses)}</p>
  `;
}

function renderCardDebtChart(snap) {
  if (!els.cardDebtChart) return;
  const maxV = Math.max(snap.income, snap.cardDebtBalance, 1);
  const wI = (snap.income / maxV) * 100;
  const wC = (snap.cardDebtBalance / maxV) * 100;
  const ratio = snap.income > 0 ? snap.cardDebtBalance / snap.income : 0;
  const ratioNote =
    snap.cardDebtBalance <= 0
      ? t("card_ratio_none")
      : ratio < 1
        ? tFill("card_ratio_lt", { p: (ratio * 100).toFixed(0), m: snap.incomeMonthLabel })
        : tFill("card_ratio_gte", { r: ratio.toFixed(1), m: snap.incomeMonthLabel });
  els.cardDebtChart.innerHTML = `
    <div class="vs-bars">
      <div class="vs-bar-row">
        <span class="vs-label">${escapeHtml(t("card_income"))}</span>
        <div class="vs-track"><div class="vs-fill vs-fill--income" style="width:${wI}%"></div></div>
        <strong class="vs-amt">${fmtMoney(snap.income)}</strong>
      </div>
      <div class="vs-bar-row">
        <span class="vs-label">${escapeHtml(t("card_debt"))}</span>
        <div class="vs-track"><div class="vs-fill vs-fill--card" style="width:${wC}%"></div></div>
        <strong class="vs-amt">${fmtMoney(snap.cardDebtBalance)}</strong>
      </div>
    </div>
    <p class="chart-footnote">${escapeHtml(ratioNote)}</p>
  `;
}

function categoryOptions(selected) {
  return EXPENSE_CATEGORIES.map(
    (c) =>
      `<option value="${escapeHtml(c)}" ${c === selected ? "selected" : ""}>${escapeHtml(categoryDisplayLabel(c))}</option>`
  ).join("");
}

function sortedIncomeLines(state) {
  return [...(state.incomeLines || [])].sort((a, b) => {
    const byDate = String(b.date || "").localeCompare(String(a.date || ""));
    if (byDate !== 0) return byDate;
    return String(b.id).localeCompare(String(a.id));
  });
}

function renderIncomeLines() {
  if (!els.incomeList) return;
  const lines = sortedIncomeLines(state);
  if (!lines.length) {
    els.incomeList.innerHTML = `
      <div class="empty-state" data-empty="income">
        <p>${escapeHtml(t("income_empty_title"))}</p>
        <span>${escapeHtml(t("income_empty_sub"))}</span>
        <button type="button" class="btn-ghost" data-empty-add="income">${escapeHtml(t("income_empty_cta"))}</button>
      </div>`;
    return;
  }
  els.incomeList.innerHTML = lines
    .map(
      (line) => `
    <div class="income-row" data-id="${line.id}">
      <label>${escapeHtml(t("income_date"))}<input type="date" data-field="date" value="${escapeHtml(line.date)}" /></label>
      <label>${escapeHtml(t("income_cadence"))}<select data-field="cadence">
        <option value="monthly" ${(line.cadence || "monthly") === "monthly" ? "selected" : ""}>${escapeHtml(t("cadence_m"))}</option>
        <option value="biweekly" ${line.cadence === "biweekly" ? "selected" : ""}>${escapeHtml(t("cadence_b"))}</option>
        <option value="weekly" ${line.cadence === "weekly" ? "selected" : ""}>${escapeHtml(t("cadence_w"))}</option>
        <option value="one-off" ${line.cadence === "one-off" ? "selected" : ""}>${escapeHtml(t("cadence_o"))}</option>
      </select></label>
      <label>${escapeHtml(t("income_label"))}<input type="text" data-field="label" value="${escapeHtml(line.label)}" /></label>
      <label>${escapeHtml(t("income_amount"))}<input type="text" inputmode="decimal" data-field="amount" value="${escapeHtml(String(line.amount))}" /></label>
      <button type="button" class="row-remove" data-remove-income="${line.id}" aria-label="${escapeHtml(t("remove_aria"))}">×</button>
    </div>
  `
    )
    .join("");
}

function renderExpenses() {
  if (!els.expenseList) return;
  if (!state.expenses.length) {
    els.expenseList.innerHTML = `
      <div class="empty-state" data-empty="expenses">
        <p>${escapeHtml(t("expense_empty_title"))}</p>
        <span>${escapeHtml(t("expense_empty_sub"))}</span>
        <button type="button" class="btn-ghost" data-empty-add="expense">${escapeHtml(t("expense_empty_cta"))}</button>
      </div>`;
    return;
  }
  els.expenseList.innerHTML = state.expenses
    .map(
      (e) => `
    <div class="expense-row" data-id="${e.id}">
      <label>${escapeHtml(t("expense_category"))}<select data-field="category" class="expense-category">${categoryOptions(e.category)}</select></label>
      <label>${escapeHtml(t("expense_label"))}<input type="text" data-field="label" value="${escapeHtml(e.label)}" /></label>
      <label>${escapeHtml(t("expense_amount"))}<input type="text" inputmode="decimal" data-field="amount" value="${escapeHtml(String(e.amount))}" /></label>
      <label>${escapeHtml(t("expense_cadence"))}<select data-field="cadence">
        <option value="daily" ${e.cadence === "daily" ? "selected" : ""}>${escapeHtml(t("cadence_d"))}</option>
        <option value="weekly" ${e.cadence === "weekly" ? "selected" : ""}>${escapeHtml(t("cadence_w"))}</option>
        <option value="monthly" ${e.cadence === "monthly" ? "selected" : ""}>${escapeHtml(t("cadence_m"))}</option>
      </select></label>
      <button type="button" class="row-remove" data-remove-expense="${e.id}" aria-label="${escapeHtml(t("remove_aria"))}">×</button>
    </div>
  `
    )
    .join("");
}

function goalMonthlyApartado(g) {
  const t = Math.max(0, Number(g.targetAmount) || 0);
  const mo = Math.max(1, Math.min(600, Math.floor(Number(g.months) || 1)));
  return t <= 0 ? 0 : t / mo;
}

function updateGoalsSummary() {
  const el = els.goalsSummary;
  if (!el) return;
  const g = (state.savingsGoals || [])[0];
  if (!g) {
    el.innerHTML = `<span class="post-dash-summary-muted">${escapeHtml(t("goals_summary_empty"))}</span>`;
    return;
  }
  const goalTarget = Math.max(0, Number(g.targetAmount) || 0);
  const mo = Math.max(1, Math.min(600, Math.floor(Number(g.months) || 1)));
  const per = goalMonthlyApartado(g);
  const name = (g.label || "").trim() || "—";
  el.innerHTML = `<strong>${escapeHtml(t("goals_last_label"))}</strong> ${escapeHtml(name)} · <strong>${escapeHtml(fmtMoney(goalTarget))}</strong> / ${mo} ${escapeHtml(t("goal_months"))} · <strong>${escapeHtml(fmtMoney(per))}</strong> ${escapeHtml(t("goal_apart_hint"))}`;
}

function renderGoals() {
  if (!els.goalsList) return;
  const rows = state.savingsGoals || [];
  if (!rows.length) {
    els.goalsList.innerHTML = `<p class="chart-footnote goals-empty">${sanitizeI18nHtml(t("goals_empty_html"))}</p>`;
    updateGoalsSummary();
    return;
  }
  els.goalsList.innerHTML = rows
    .map((g) => {
      const per = goalMonthlyApartado(g);
      return `
    <div class="goal-row" data-id="${escapeHtml(g.id)}">
      <label>${escapeHtml(t("goal_name"))}<input type="text" data-field="label" value="${escapeHtml(g.label)}" /></label>
      <label>${escapeHtml(t("goal_target"))}<input type="text" inputmode="decimal" data-field="targetAmount" value="${escapeHtml(String(g.targetAmount))}" /></label>
      <label>${escapeHtml(t("goal_months"))}<input type="number" min="1" max="240" step="1" data-field="months" value="${g.months}" /></label>
      <div class="goal-apart" title="${escapeHtml(t("goal_apart_title"))}">
        <span class="goal-apart-hint">${escapeHtml(t("goal_apart_hint"))}</span>
        <strong>${fmtMoney(per)}</strong>
      </div>
      <button type="button" class="row-remove" data-remove-goal="${escapeHtml(g.id)}" aria-label="${escapeHtml(t("remove_goal_aria"))}">×</button>
    </div>`;
    })
    .join("");
  updateGoalsSummary();
}

/* extracted to comfort-ledger-notifications.js */

/* extracted to comfort-ledger-reminders.js: comfortStripLedgerHashIfRowRemoved */

/* extracted to comfort-ledger-reminders.js: handleRecurringHash */

function utilityCategoryOptions(selectedKey) {
  return UTILITY_CATEGORY_KEYS.map(
    (k) =>
      `<option value="${escapeHtml(k)}" ${k === selectedKey ? "selected" : ""}>${escapeHtml(utilityCategoryLabel(k))}</option>`
  ).join("");
}

function buildUtilityReminderLine(bill, now = new Date()) {
  const due = nextRecurringDueDate(bill.dayOfMonth, now);
  const days = calendarDaysBetween(now, due);
  if (days === 0) {
    return `${t("utility_reminder_next")}: ${formatRecurringShortDate(due)} (${t("recurring_today")})`;
  }
  return `${t("utility_reminder_next")}: ${formatRecurringShortDate(due)} (${tFill("recurring_in_days", { n: String(days) })})`;
}

function monthlyAmountSubscription(s) {
  const a = Number(s.amount) || 0;
  if (s.cadence === "weekly") return a * (52 / 12);
  if (s.cadence === "monthly") return a;
  return a * 30;
}

function buildSubReminderLine(s, now = new Date()) {
  const due = nextRecurringDueDate(s.dayOfMonth, now);
  const days = calendarDaysBetween(now, due);
  const cad = s.cadence === "weekly" ? t("cadence_w") : s.cadence === "monthly" ? t("cadence_m") : t("cadence_d");
  const approx = `${t("sub_monthly_equiv")}: ${fmtMoney(monthlyAmountSubscription(s))}`;
  const duePart =
    days === 0
      ? `${formatRecurringShortDate(due)} (${t("recurring_today")})`
      : `${formatRecurringShortDate(due)} (${tFill("recurring_in_days", { n: String(days) })})`;
  return `${cad} · ${approx} · ${t("utility_reminder_next")}: ${duePart}`;
}

function syncUtilityRowFromDom(rowEl, bill) {
  const labelInp = rowEl.querySelector('[data-field="label"]');
  if (labelInp) bill.label = labelInp.value;
  const cat = rowEl.querySelector('[data-field="categoryKey"]');
  if (cat) bill.categoryKey = UTILITY_CATEGORY_KEYS.includes(cat.value) ? cat.value : "other";
  const amt = rowEl.querySelector('[data-field="amount"]');
  if (amt) bill.amount = coerceParsedNumber(amt.value);
  const dt = rowEl.querySelector('[data-field="date"]');
  if (dt) bill.date = sanitizeISODate(dt.value);
  const dm = rowEl.querySelector('[data-field="dayOfMonth"]');
  if (dm) bill.dayOfMonth = Math.max(1, Math.min(31, Math.floor(Number(dm.value) || 1)));
  const pu = rowEl.querySelector('[data-field="payUrl"]');
  if (pu) bill.payUrl = pu.value.trim();
}

function syncSubRowFromDom(rowEl, s) {
  const svc = rowEl.querySelector('[data-field="serviceKey"]');
  if (svc) {
    const v = svc.value;
    s.serviceKey = SUBSCRIPTION_SERVICES.some((x) => x.id === v) ? v : "custom";
  }
  const cl = rowEl.querySelector('[data-field="customLabel"]');
  if (cl) s.customLabel = cl.value;
  const cu = rowEl.querySelector('[data-field="customUnsubUrl"]');
  if (cu) s.customUnsubUrl = cu.value.trim();
  const amt = rowEl.querySelector('[data-field="amount"]');
  if (amt) s.amount = coerceParsedNumber(amt.value);
  const cad = rowEl.querySelector('[data-field="cadence"]');
  if (cad) s.cadence = normalizeSubscriptionCadence(cad.value);
  const dm = rowEl.querySelector('[data-field="dayOfMonth"]');
  if (dm) s.dayOfMonth = Math.max(1, Math.min(31, Math.floor(Number(dm.value) || 1)));
}

function patchUtilityRowMeta(rowEl, bill) {
  const meta = rowEl.querySelector(".post-dash-utility-meta");
  if (meta) meta.textContent = buildUtilityReminderLine(bill);
}

function patchSubRowMeta(rowEl, s) {
  const meta = rowEl.querySelector(".post-dash-sub-meta");
  if (meta) meta.textContent = buildSubReminderLine(s);
}

function updatePostDashSummaries() {
  const uEl = els.utilityBillsSummary;
  const sEl = els.subscriptionsSummary;
  if (uEl) {
    const u = (state.utilityBills || [])[0];
    if (!u) uEl.innerHTML = `<span class="post-dash-summary-muted">${escapeHtml(t("utility_summary_empty"))}</span>`;
    else {
      const cat = utilityCategoryLabel(u.categoryKey);
      const note = u.label ? ` — ${escapeHtml(u.label)}` : "";
      uEl.innerHTML = `<strong>${escapeHtml(t("utility_last_label"))}</strong> ${escapeHtml(cat)}${note} · <strong>${escapeHtml(fmtMoney(u.amount))}</strong> · ${escapeHtml(u.date)}`;
    }
  }
  if (sEl) {
    const s = (state.subscriptions || [])[0];
    if (!s) sEl.innerHTML = `<span class="post-dash-summary-muted">${escapeHtml(t("sub_summary_empty"))}</span>`;
    else {
      const name = escapeHtml(subscriptionDisplayName(s));
      const cad = s.cadence === "weekly" ? t("cadence_w") : s.cadence === "monthly" ? t("cadence_m") : t("cadence_d");
      sEl.innerHTML = `<strong>${escapeHtml(t("sub_last_label"))}</strong> ${name} · ${escapeHtml(cad)} · <strong>${escapeHtml(fmtMoney(s.amount))}</strong>`;
    }
  }
}

function renderUtilityBills() {
  if (!els.utilityBillsList) return;
  const rows = state.utilityBills || [];
  if (!rows.length) {
    els.utilityBillsList.innerHTML = `<p class="chart-footnote">${escapeHtml(t("utility_list_empty"))}</p>`;
    updatePostDashSummaries();
    return;
  }
  const now = new Date();
  els.utilityBillsList.innerHTML = rows
    .map((bill) => {
      const pay = safeExternalPayUrl(bill.payUrl);
      const cancelled = Boolean(bill.cancelled);
      const rowClass = `post-dash-utility-row${cancelled ? " post-dash-utility-row--cancelled" : ""}`;
      const meta = buildUtilityReminderLine(bill, now);
      return `
    <div class="${rowClass}" id="utility-${escapeHtml(bill.id)}" data-id="${escapeHtml(bill.id)}">
      <div class="post-dash-row-grid">
        <label><span>${escapeHtml(t("utility_category"))}</span><select data-field="categoryKey">${utilityCategoryOptions(bill.categoryKey)}</select></label>
        <label><span>${escapeHtml(t("utility_notes"))}</span><input type="text" data-field="label" value="${escapeHtml(bill.label)}" autocomplete="off" /></label>
        <label><span>${escapeHtml(t("utility_amount"))}</span><input type="text" inputmode="decimal" data-field="amount" value="${bill.amount ? escapeHtml(String(bill.amount)) : ""}" autocomplete="off" /></label>
        <label><span>${escapeHtml(t("utility_date"))}</span><input type="date" data-field="date" value="${escapeHtml(bill.date)}" /></label>
        <label><span>${escapeHtml(t("utility_reminder_day"))}</span><input type="number" min="1" max="31" step="1" data-field="dayOfMonth" value="${bill.dayOfMonth}" /></label>
        <label style="grid-column:1/-1"><span>${escapeHtml(t("recurring_pay_url"))}</span><input type="url" data-field="payUrl" value="${escapeHtml(bill.payUrl)}" placeholder="https://…" autocomplete="off" /></label>
      </div>
      <p class="post-dash-utility-meta">${escapeHtml(meta)}</p>
      <div class="post-dash-row-actions">
        ${cancelled ? `<span class="post-dash-badge">${escapeHtml(t("recurring_status_cancelled"))}</span>` : ""}
        ${pay ? `<a class="btn-ghost" href="${escapeHtml(pay)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("recurring_go_pay"))}</a>` : ""}
        ${
          cancelled
            ? `<button type="button" class="btn-ghost" data-uncancel-utility="${escapeHtml(bill.id)}">${escapeHtml(t("recurring_reactivate"))}</button>`
            : `<button type="button" class="btn-ghost" data-cancel-utility="${escapeHtml(bill.id)}">${escapeHtml(t("recurring_cancel"))}</button>`
        }
        <button type="button" class="row-remove" data-remove-utility="${escapeHtml(bill.id)}" aria-label="${escapeHtml(t("remove_aria"))}">×</button>
      </div>
    </div>`;
    })
    .join("");
  updatePostDashSummaries();
}

function renderSubscriptions() {
  if (!els.subscriptionsList) return;
  const rows = state.subscriptions || [];
  if (!rows.length) {
    els.subscriptionsList.innerHTML = `<p class="chart-footnote">${escapeHtml(t("sub_list_empty"))}</p>`;
    updatePostDashSummaries();
    return;
  }
  const now = new Date();
  els.subscriptionsList.innerHTML = rows
    .map((s) => {
      const unsub = subscriptionUnsubUrl(s);
      const cancelled = Boolean(s.cancelled);
      const rowClass = `post-dash-sub-row${cancelled ? " post-dash-sub-row--cancelled" : ""}`;
      const meta = buildSubReminderLine(s, now);
      const svcOpts = SUBSCRIPTION_SERVICES.map(
        (def) =>
          `<option value="${escapeHtml(def.id)}" ${def.id === s.serviceKey ? "selected" : ""}>${escapeHtml(subscriptionServiceLabel(def.id))}</option>`
      ).join("");
      const customBlock =
        s.serviceKey === "custom"
          ? `<label style="grid-column:1/-1"><span>${escapeHtml(t("sub_custom_name"))}</span><input type="text" data-field="customLabel" value="${escapeHtml(s.customLabel)}" autocomplete="off" /></label>
             <label style="grid-column:1/-1"><span>${escapeHtml(t("sub_custom_unsub"))}</span><input type="url" data-field="customUnsubUrl" value="${escapeHtml(s.customUnsubUrl)}" placeholder="https://…" autocomplete="off" /></label>`
          : "";
      return `
    <div class="${rowClass}" id="sub-${escapeHtml(s.id)}" data-id="${escapeHtml(s.id)}">
      <div class="post-dash-row-grid">
        <label style="grid-column:1/-1"><span>${escapeHtml(t("sub_service"))}</span><select data-field="serviceKey">${svcOpts}</select></label>
        ${customBlock}
        <label><span>${escapeHtml(t("sub_amount"))}</span><input type="text" inputmode="decimal" data-field="amount" value="${s.amount ? escapeHtml(String(s.amount)) : ""}" autocomplete="off" /></label>
        <label><span>${escapeHtml(t("expense_cadence"))}</span><select data-field="cadence">
          <option value="daily" ${s.cadence === "daily" ? "selected" : ""}>${escapeHtml(t("cadence_d"))}</option>
          <option value="weekly" ${s.cadence === "weekly" ? "selected" : ""}>${escapeHtml(t("cadence_w"))}</option>
          <option value="monthly" ${s.cadence === "monthly" ? "selected" : ""}>${escapeHtml(t("cadence_m"))}</option>
        </select></label>
        <label style="grid-column:1/-1"><span>${escapeHtml(t("sub_charge_day"))}</span><input type="number" min="1" max="31" step="1" data-field="dayOfMonth" value="${s.dayOfMonth}" /></label>
      </div>
      <p class="post-dash-sub-meta">${escapeHtml(meta)}</p>
      <div class="post-dash-row-actions">
        ${cancelled ? `<span class="post-dash-badge">${escapeHtml(t("recurring_status_cancelled"))}</span>` : ""}
        ${unsub && !cancelled ? `<a class="btn-dash-unsub" href="${escapeHtml(unsub)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("sub_unsubscribe_btn"))}</a>` : ""}
        ${
          cancelled
            ? `<button type="button" class="btn-ghost" data-uncancel-sub="${escapeHtml(s.id)}">${escapeHtml(t("recurring_reactivate"))}</button>`
            : `<button type="button" class="btn-ghost" data-cancel-sub="${escapeHtml(s.id)}">${escapeHtml(t("recurring_cancel"))}</button>`
        }
        <button type="button" class="row-remove" data-remove-sub="${escapeHtml(s.id)}" aria-label="${escapeHtml(t("remove_aria"))}">×</button>
      </div>
    </div>`;
    })
    .join("");
  updatePostDashSummaries();
}

function renderDebts() {
  if (!els.debtList) return;
  if (!state.debts.length) {
    els.debtList.innerHTML = `
      <div class="empty-state empty-state--ok" data-empty="debts">
        <p>${escapeHtml(t("debt_empty_title"))}</p>
        <span>${escapeHtml(t("debt_empty_sub"))}</span>
        <button type="button" class="btn-ghost" data-empty-add="debt">${escapeHtml(t("debt_empty_cta"))}</button>
      </div>`;
    return;
  }
  els.debtList.innerHTML = state.debts
    .map(
      (d) => `
    <div class="debt-row" data-id="${d.id}">
      <label>${escapeHtml(t("debt_type"))}<select data-field="debtType">
        <option value="card" ${d.debtType === "card" ? "selected" : ""}>${escapeHtml(t("debt_type_card"))}</option>
        <option value="other" ${d.debtType === "other" ? "selected" : ""}>${escapeHtml(t("debt_type_other"))}</option>
      </select></label>
      <label>${escapeHtml(t("debt_label"))}<input type="text" data-field="label" value="${escapeHtml(d.label)}" /></label>
      <label>${escapeHtml(t("debt_balance"))}<input type="text" inputmode="decimal" data-field="balance" value="${escapeHtml(String(d.balance))}" /></label>
      <label>${escapeHtml(t("debt_min"))}<input type="text" inputmode="decimal" data-field="minPayment" value="${escapeHtml(String(d.minPayment))}" /></label>
      <button type="button" class="row-remove" data-remove-debt="${d.id}" aria-label="${escapeHtml(t("remove_aria"))}">×</button>
    </div>
  `
    )
    .join("");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

let worldClockTimer = null;
let worldClockVisibilityBound = false;

/**
 * HH:mm en zona IANA.
 * 1) sv-SE + timeZone suele devolver "YYYY-MM-DD HH:mm:ss" (muy estable en Safari / file://).
 * 2) formatToParts / toLocaleTimeString como respaldo.
 */
function zonedHourMinute(date, timeZone) {
  const clean = (s) =>
    String(s || "")
      .replace(/[\u200e\u200f\u202a-\u202e]/g, "")
      .replace(/\u202f|\u00a0/g, " ")
      .trim();
  /** Último token tipo HH:mm o HH:mm:ss (evita fallar con "YYYY-MM-DDTHH:mm:ss" y evita tomar "30:00"). */
  const hourMinuteFromZonedFull = (raw) => {
    const full = clean(String(raw || "").replace(/T/g, " "));
    const toks = full.split(/\s+/).filter(Boolean);
    const timeToks = toks.filter((tok) => /^\d{1,2}:\d{2}(:\d{2})?$/.test(tok));
    const tail = timeToks[timeToks.length - 1] || "";
    const m0 = tail.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (m0) return `${String(m0[1]).padStart(2, "0")}:${m0[2]}`;
    return null;
  };
  try {
    const parsed = hourMinuteFromZonedFull(date.toLocaleString("sv-SE", { timeZone }));
    if (parsed) return parsed;
  } catch {
    /* fall through */
  }
  const fromParts = (loc) => {
    try {
      const parts = new Intl.DateTimeFormat(loc, {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).formatToParts(date);
      const h = parts.find((p) => p.type === "hour")?.value;
      const m = parts.find((p) => p.type === "minute")?.value;
      if (h == null || m == null) return null;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    } catch {
      return null;
    }
  };
  try {
    const s = clean(
      date.toLocaleTimeString("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      })
    );
    const m = s.match(/(\d{1,2})[:.](\d{2})/);
    if (m) return `${String(m[1]).padStart(2, "0")}:${m[2]}`;
  } catch {
    /* fall through */
  }
  try {
    const p = fromParts("en-GB");
    if (p) return p;
  } catch {
    /* fall through */
  }
  try {
    const s = clean(
      new Intl.DateTimeFormat("sv-SE", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).format(date)
    );
    const m = s.match(/(\d{1,2})[:.](\d{2})/);
    if (m) return `${String(m[1]).padStart(2, "0")}:${m[2]}`;
  } catch {
    /* fall through */
  }
  return "--:--";
}

function zonedShortDate(date, timeZone) {
  try {
    return new Intl.DateTimeFormat(getIntlLocale(), {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric"
    }).format(date);
  } catch {
    try {
      const full = String(date.toLocaleString("sv-SE", { timeZone }))
        .replace(/T/g, " ")
        .replace(/\u202f|\u00a0/g, " ")
        .trim();
      const dayPart = full.split(/\s+/)[0] || "";
      const md = dayPart.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (md) return `${md[3]}/${md[2]}`;
    } catch {
      /* noop */
    }
    return "—";
  }
}

function coachClocksInnerHtml() {
  return `
      <article class="neo-clock" aria-labelledby="neoClockChiLbl2">
        <div class="neo-clock-ring" aria-hidden="true"></div>
        <div class="neo-clock-face">
          <span class="neo-clock-city" id="neoClockChiLbl2" data-i18n="world_chicago">Chicago</span>
          <span class="neo-clock-time" id="clockChicagoTime">--:--</span>
          <span class="neo-clock-date" id="clockChicagoDate">—</span>
        </div>
      </article>
      <article class="neo-clock" aria-labelledby="neoClockNyLbl2">
        <div class="neo-clock-ring" aria-hidden="true"></div>
        <div class="neo-clock-face">
          <span class="neo-clock-city" id="neoClockNyLbl2" data-i18n="world_newyork">Nueva York</span>
          <span class="neo-clock-time" id="clockNYTime">--:--</span>
          <span class="neo-clock-date" id="clockNYDate">—</span>
        </div>
      </article>`;
}

function patchCoachClocksI18n(root) {
  if (!root) return;
  try {
    const attrHost = root.hasAttribute("data-i18n-attr") ? root : root.querySelector("[data-i18n-attr]");
    if (attrHost) {
      const raw = attrHost.getAttribute("data-i18n-attr");
      if (raw) {
        const [a, k] = raw.split("|").map((s) => s && s.trim());
        if (a && k) attrHost.setAttribute(a, t(k));
      }
    }
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      const k = el.getAttribute("data-i18n");
      if (k) el.textContent = t(k);
    });
  } catch {
    /* ignore */
  }
}

function ensureCoachClocksDom() {
  if (document.getElementById("clockChicagoTime") && document.getElementById("clockNYTime")) return true;
  const inner = coachClocksInnerHtml();
  const existing = document.querySelector(".coach-clocks");
  if (existing) {
    existing.innerHTML = inner;
    patchCoachClocksI18n(existing);
    return !!(document.getElementById("clockChicagoTime") && document.getElementById("clockNYTime"));
  }
  const col = document.querySelector(".coach-column");
  if (!col) return false;
  col.insertAdjacentHTML(
    "beforeend",
    `<div class="coach-clocks" role="group" data-i18n-attr="aria-label|twin_clocks_title" aria-label="Chicago y Nueva York">${inner}</div>`
  );
  const wrap = col.querySelector(".coach-clocks");
  patchCoachClocksI18n(wrap);
  return !!(document.getElementById("clockChicagoTime") && document.getElementById("clockNYTime"));
}

function renderWorldClocks() {
  ensureCoachClocksDom();
  const tChi = document.getElementById("clockChicagoTime");
  const dChi = document.getElementById("clockChicagoDate");
  const tNy = document.getElementById("clockNYTime");
  const dNy = document.getElementById("clockNYDate");
  if (!tChi || !dChi || !tNy || !dNy) return;
  const now = new Date();
  try {
    tChi.textContent = zonedHourMinute(now, "America/Chicago");
  } catch {
    tChi.textContent = "--:--";
  }
  try {
    dChi.textContent = zonedShortDate(now, "America/Chicago");
  } catch {
    dChi.textContent = "—";
  }
  try {
    tNy.textContent = zonedHourMinute(now, "America/New_York");
  } catch {
    tNy.textContent = "--:--";
  }
  try {
    dNy.textContent = zonedShortDate(now, "America/New_York");
  } catch {
    dNy.textContent = "—";
  }
}

function onWorldClockVisibility() {
  if (!document.hidden) renderWorldClocks();
}

function startWorldClocks() {
  const tick = () => {
    if (!ensureCoachClocksDom()) return;
    renderWorldClocks();
    if (!worldClockTimer) {
      worldClockTimer = setInterval(renderWorldClocks, 1000);
    }
    if (!worldClockVisibilityBound) {
      document.addEventListener("visibilitychange", onWorldClockVisibility);
      worldClockVisibilityBound = true;
    }
  };
  tick();
  [0, 32, 160, 720].forEach((ms) => setTimeout(tick, ms));
}

/* extracted to comfort-ledger-ui.js: syncLiquidityFromState */

/* extracted to comfort-ledger-ui.js: renderChartsAndHealth */

/* extracted to comfort-ledger-ui.js: renderAll */

/* extracted to comfort-ledger-reminders.js: collectUpcomingRecurringRows */

/* extracted to comfort-ledger-reminders.js: renderTodayBanner */

/* extracted to comfort-ledger-modules.js */

/**
 * Hogar/servicios y Suscripciones: un listener en captura por panel (lista + botón agregar).
 * La captura en el panel evita que el clic en × quede “comido” por labels/inputs o por el hash #utility-…
 */
/* extracted to comfort-ledger-post-dash.js: comfortWirePostDashOnce */

/* extracted to comfort-ledger-bindings.js: bind */

function coerceParsedNumber(raw) {
  const n = parseNum(raw);
  return Number.isFinite(n) ? n : 0;
}

function bootComfortLedger() {
  if (window.__comfortBootLedgerRan) {
    return;
  }
  window.__comfortBootLedgerRan = true;
  els = collectEls();
  UI_LOCALE = loadLocale();
  document.documentElement.lang = UI_LOCALE === "zh" ? "zh-Hans" : UI_LOCALE === "en" ? "en" : "es";
  document.body.classList.toggle("lang-zh", UI_LOCALE === "zh");
  document.title = t("page_title");
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", t("meta_description"));
  applyStaticI18n();
  renderHostedProfileCard();
  updateLangButtons();
  applyHostedCoachCopy();
  comfortApplyTrustPills();
  comfortWirePostDashOnce();

  const coreOk =
    els.liquidSavings &&
    els.donutFlow &&
    els.addExpenseBtn &&
    els.utilityBillsList &&
    els.subscriptionsList;
  if (coreOk) {
    try {
      bind();
      renderAll();
      startRecurringReminders();
      handleRecurringHash();
      if (!window.__comfortHashListener) {
        window.__comfortHashListener = true;
        window.addEventListener("hashchange", handleRecurringHash);
      }
    } catch {
      /* El núcleo puede fallar en DOM parcial; los relojes y lectura básica siguen activos. */
    }
  }
  startWorldClocks();
  window.addEventListener("load", () => {
    ensureCoachClocksDom();
    renderWorldClocks();
  });
}

async function comfortEntry() {
  UI_LOCALE = loadLocale();
  await initComfortHostedMode();
  bootComfortLedger();
  installGlobalEscapeHandler();
}

function installGlobalEscapeHandler() {
  if (window.__COMFORT_ESC_INSTALLED) return;
  window.__COMFORT_ESC_INSTALLED = true;
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    const overlays = Array.from(document.querySelectorAll(".comfort-beta-overlay"));
    for (let i = overlays.length - 1; i >= 0; i--) {
      const node = overlays[i];
      if (node.classList.contains("comfort-beta-overlay--hidden")) continue;
      if (node.getAttribute("data-dismissible") !== "true") continue;
      node.classList.add("comfort-beta-overlay--hidden");
      node.setAttribute("aria-hidden", "true");
      event.preventDefault();
      return;
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void comfortEntry());
} else {
  void comfortEntry();
}
