/**
 * Comfort Ledger — standalone demo. No imports from BlackLedger Omega.
 */

const STORAGE_KEY = "comfort_ledger_v1";

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
    hint_offline_html:
      "¿No carga? En la carpeta del proyecto abre <strong>COMFORT-LEDGER-abrir-aqui.html</strong> (un solo archivo, sin servidor).",
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
    world_title: "Horarios en calma",
    world_sub: "Chicago · Nueva York. Solo tu dispositivo, sin red. El icono indica día o noche local.",
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
    world_day: "Día",
    world_night: "Noche",
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
    default_goal_name: "Meta"
  },
  en: {
    page_title: "Comfort Ledger — Summary & coach",
    meta_description: "Minimal finance snapshot: income, expenses, and debt with a local AI-style coach.",
    lang_label: "Language",
    brand_eyebrow: "Wealth snapshot",
    tagline: "Less noise. More clarity.",
    pill_local: "100% on-device",
    pill_offline: "No network",
    hint_offline_html:
      "If this page does not load, open <strong>COMFORT-LEDGER-abrir-aqui.html</strong> in the project folder (single file, no server).",
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
    world_title: "Quiet clocks",
    world_sub: "Chicago · New York. On-device only, no network. Icon shows local day or night.",
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
    world_day: "Day",
    world_night: "Night",
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
    default_goal_name: "Goal"
  },
  zh: {
    page_title: "Comfort Ledger — 概览与顾问",
    meta_description: "简洁财务概览：收入、支出与债务，并配备本地规则型顾问。",
    lang_label: "语言",
    brand_eyebrow: "资产视图",
    tagline: "少噪音，更清晰。",
    pill_local: "100% 本地",
    pill_offline: "离线",
    hint_offline_html:
      "若页面无法打开，请在项目文件夹中打开 <strong>COMFORT-LEDGER-abrir-aqui.html</strong>（单文件，无需服务器）。",
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
    world_title: "安静时钟",
    world_sub: "芝加哥 · 纽约。仅本机，不联网。图标表示当地昼/夜。",
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
    world_day: "白天",
    world_night: "夜间",
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
    default_goal_name: "目标"
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

function applyStaticI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (!key) return;
    el.innerHTML = t(key);
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
  updateLangButtons();
  renderAll();
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
  incomeLines: [{ id: "inc-main", label: "Cobro principal", amount: 6000, date: formatDateInput() }],
  liquidSavings: 10000,
  expenses: [
    {
      id: "e1",
      category: "Comida fuera",
      label: "Delivery",
      amount: 25,
      cadence: "daily"
    },
    {
      id: "e2",
      category: "Transporte publico",
      label: "Gas / metro",
      amount: 60,
      cadence: "weekly"
    }
  ],
  debts: [
    {
      id: "d1",
      debtType: "card",
      label: "Tarjeta",
      balance: 9200,
      minPayment: 280
    }
  ],
  savingsGoals: []
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
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeCadence(c) {
  return c === "weekly" || c === "monthly" ? c : "daily";
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
    date: line.date ? sanitizeISODate(line.date) : formatDateInput()
  };
}

function normalizeSavingsGoal(g) {
  const months = Math.max(1, Math.min(600, Math.floor(Number(g.months) || 1)));
  return {
    id: typeof g.id === "string" ? g.id : createId("goal"),
    label: String(g.label ?? "Meta"),
    targetAmount: Math.max(0, Number(g.targetAmount) || 0),
    months
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const data = JSON.parse(raw);
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
    const lsParsed = parseNum(data.liquidSavings);
    const liquidSavings = Number.isFinite(lsParsed) ? lsParsed : base.liquidSavings;
    return {
      ...base,
      incomeLines,
      liquidSavings,
      expenses,
      debts,
      savingsGoals
    };
  } catch {
    return defaultState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

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

function sumIncomeForCalendarMonth(state, refDate = new Date()) {
  const y = refDate.getFullYear();
  const m = refDate.getMonth();
  let income = 0;
  for (const line of state.incomeLines || []) {
    const raw = line.date;
    if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(String(raw))) continue;
    const [yy, mm, dd] = String(raw).split("-").map(Number);
    const dt = new Date(yy, mm - 1, dd);
    if (dt.getFullYear() === y && dt.getMonth() === m) {
      income += Math.max(0, Number(line.amount) || 0);
    }
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
  const orbitColors = ["#6b7f8f", "#9b4c5c", "#c4a574", "#3d8f72", "rgba(36, 38, 46, 0.92)"];
  const orbitConic = tacticalOrbitConic(orbitWeights, orbitColors);

  const goalsForTactical = (state.savingsGoals || [])
    .filter((g) => (Number(g.targetAmount) || 0) > 0)
    .map((g) => {
      const t = Math.max(Number(g.targetAmount) || 0, 1);
      return {
        label: String(g.label || t("default_goal_name")).slice(0, 32),
        pct: Math.min(100, (savings / t) * 100)
      };
    })
    .slice(0, 6);

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
    spendShare,
    expenseTop,
    radarPercents,
    orbitConic,
    goalsForTactical
  };
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
    addIncomeBtn: document.getElementById("addIncomeBtn"),
    addExpenseBtn: document.getElementById("addExpenseBtn"),
    addDebtBtn: document.getElementById("addDebtBtn"),
    worldClocks: document.getElementById("worldClocks"),
    goalsList: document.getElementById("goalsList"),
    addGoalBtn: document.getElementById("addGoalBtn"),
    dashTacticalGrid: document.getElementById("dashTacticalGrid")
  };
}

function renderHealth(snap) {
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
  els.incomeList.innerHTML = sortedIncomeLines(state)
    .map(
      (line) => `
    <div class="income-row" data-id="${line.id}">
      <label>${escapeHtml(t("income_date"))}<input type="date" data-field="date" value="${escapeHtml(line.date)}" /></label>
      <label>${escapeHtml(t("income_label"))}<input type="text" data-field="label" value="${escapeHtml(line.label)}" /></label>
      <label>${escapeHtml(t("income_amount"))}<input type="text" inputmode="decimal" data-field="amount" value="${escapeHtml(String(line.amount))}" /></label>
      <button type="button" class="row-remove" data-remove-income="${line.id}" aria-label="${escapeHtml(t("remove_aria"))}">×</button>
    </div>
  `
    )
    .join("");
}

function renderExpenses() {
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

function renderGoals() {
  if (!els.goalsList) return;
  const rows = state.savingsGoals || [];
  if (!rows.length) {
    els.goalsList.innerHTML = `<p class="chart-footnote goals-empty">${t("goals_empty_html")}</p>`;
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
}

function renderDebts() {
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

function worldZones() {
  return [
    { label: t("world_chicago"), tz: "America/Chicago" },
    { label: t("world_newyork"), tz: "America/New_York" }
  ];
}

let worldClockTimer = null;
let worldClockVisibilityBound = false;

function formatClockTime(date, timeZone) {
  return new Intl.DateTimeFormat(getIntlLocale(), {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function formatClockDate(date, timeZone) {
  return new Intl.DateTimeFormat(getIntlLocale(), {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(date);
}

function getTimePartsInZone(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  });
  const parts = dtf.formatToParts(date);
  const pick = (t) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { h: pick("hour"), m: pick("minute"), s: pick("second") };
}

function isDaylightHour(h) {
  return h >= 6 && h < 18;
}

function clockStateFigureSvg(h) {
  const day = isDaylightHour(h);
  if (day) {
    return `<svg class="clock-state-icon clock-state-day" viewBox="0 0 32 32" width="28" height="28" role="img" aria-label="${escapeHtml(t("world_day"))}">
      <circle cx="16" cy="16" r="5.5" fill="#f59e0b" stroke="#fde68a" stroke-width="1" />
      <g stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round">
        <line x1="16" y1="3" x2="16" y2="6" /><line x1="16" y1="26" x2="16" y2="29" />
        <line x1="3" y1="16" x2="6" y2="16" /><line x1="26" y1="16" x2="29" y2="16" />
        <line x1="7" y1="7" x2="9" y2="9" /><line x1="23" y1="23" x2="25" y2="25" />
        <line x1="25" y1="7" x2="23" y2="9" /><line x1="9" y1="23" x2="7" y2="25" />
      </g>
    </svg>`;
  }
  return `<svg class="clock-state-icon clock-state-night" viewBox="0 0 32 32" width="28" height="28" role="img" aria-label="${escapeHtml(t("world_night"))}">
    <path fill="#93c5fd" stroke="#bfdbfe" stroke-width="0.75" d="M22 9.5a8.5 8.5 0 1 1-12.4 11.4 7 7 0 0 0 12.4-11.4z" />
    <circle cx="10" cy="11" r="1" fill="#e2e8f0" opacity="0.7" />
    <circle cx="23" cy="20" r="0.8" fill="#e2e8f0" opacity="0.5" />
  </svg>`;
}

function renderWorldClocks() {
  const host = els.worldClocks;
  if (!host) return;
  const now = new Date();
  host.innerHTML = worldZones().map((z) => {
    const { h } = getTimePartsInZone(now, z.tz);
    const stateLabel = isDaylightHour(h) ? t("world_day") : t("world_night");
    return `
    <article class="clock-tile">
      <span class="clock-city">${escapeHtml(z.label)}</span>
      <div class="clock-line" title="${escapeHtml(stateLabel)} — ${escapeHtml(z.label)}">
        <span class="clock-time">${escapeHtml(formatClockTime(now, z.tz))}</span>
        ${clockStateFigureSvg(h)}
      </div>
      <span class="clock-date">${escapeHtml(formatClockDate(now, z.tz))}</span>
    </article>`;
  }).join("");
}

function onWorldClockVisibility() {
  if (!document.hidden) renderWorldClocks();
}

function startWorldClocks() {
  if (!els.worldClocks) return;
  if (worldClockTimer) clearInterval(worldClockTimer);
  renderWorldClocks();
  worldClockTimer = setInterval(renderWorldClocks, 30000);
  if (!worldClockVisibilityBound) {
    document.addEventListener("visibilitychange", onWorldClockVisibility);
    worldClockVisibilityBound = true;
  }
}

function syncLiquidityFromState() {
  els.liquidSavings.value = state.liquidSavings ?? "";
}

function renderChartsAndHealth() {
  const snap = compute(state);
  renderHealth(snap);
  renderDonut(snap);
  renderBarCompare(snap);
  renderCadence(state, snap);
  renderCardDebtChart(snap);
  renderTacticalDash(snap);
  saveState(state);
  return snap;
}

function renderAll() {
  syncLiquidityFromState();
  renderChartsAndHealth();
  renderIncomeLines();
  renderExpenses();
  renderDebts();
  renderGoals();
}

function bind() {
  if (!els.liquidSavings || !els.addExpenseBtn || !els.donutFlow) {
    return;
  }
  const onSavings = () => {
    const v = parseNum(els.liquidSavings.value);
    state.liquidSavings = Number.isFinite(v) ? v : 0;
    renderChartsAndHealth();
  };
  els.liquidSavings.addEventListener("input", onSavings);
  els.liquidSavings.addEventListener("blur", onSavings);

  els.addIncomeBtn?.addEventListener("click", () => {
    state.incomeLines.unshift({ id: createId("inc"), label: t("new_income_label"), amount: 0, date: formatDateInput() });
    renderAll();
  });

  els.incomeList?.addEventListener("input", (ev) => {
    const row = ev.target.closest(".income-row");
    if (!row) return;
    const line = state.incomeLines.find((x) => x.id === row.dataset.id);
    if (!line) return;
    const field = ev.target.dataset.field;
    if (!field) return;
    if (field === "amount") line.amount = coerceParsedNumber(ev.target.value);
    else if (field === "label") line.label = ev.target.value;
    renderChartsAndHealth();
  });
  els.incomeList?.addEventListener("change", (ev) => {
    if (ev.target.dataset.field !== "date") return;
    const row = ev.target.closest(".income-row");
    if (!row) return;
    const line = state.incomeLines.find((x) => x.id === row.dataset.id);
    if (!line) return;
    line.date = sanitizeISODate(ev.target.value);
    renderChartsAndHealth();
  });
  els.incomeList?.addEventListener("click", (ev) => {
    const id = ev.target.getAttribute?.("data-remove-income");
    if (!id) return;
    if (state.incomeLines.length <= 1) return;
    state.incomeLines = state.incomeLines.filter((x) => x.id !== id);
    renderAll();
  });

  els.addExpenseBtn.addEventListener("click", () => {
    state.expenses.unshift({
      id: createId("e"),
      category: "Otros",
      label: t("new_expense_label"),
      amount: 10,
      cadence: "daily"
    });
    renderAll();
  });
  els.addDebtBtn.addEventListener("click", () => {
    state.debts.unshift({
      id: createId("d"),
      debtType: "other",
      label: t("new_debt_label"),
      balance: 0,
      minPayment: 0
    });
    renderAll();
  });

  if (!state.savingsGoals) state.savingsGoals = [];
  els.addGoalBtn?.addEventListener("click", () => {
    state.savingsGoals.unshift({
      id: createId("goal"),
      label: t("new_goal_label"),
      targetAmount: 0,
      months: 12
    });
    renderAll();
  });
  els.goalsList?.addEventListener("input", (ev) => {
    const row = ev.target.closest(".goal-row");
    if (!row) return;
    const g = state.savingsGoals.find((x) => x.id === row.dataset.id);
    if (!g) return;
    const field = ev.target.dataset.field;
    if (!field) return;
    if (field === "label") g.label = ev.target.value;
    else if (field === "targetAmount") g.targetAmount = coerceParsedNumber(ev.target.value);
    else if (field === "months") {
      const raw = ev.target.value.trim();
      if (raw !== "") {
        const m = Math.floor(Number(raw) || 1);
        g.months = Math.max(1, Math.min(600, m));
      }
    }
    renderChartsAndHealth();
    const apartEl = row.querySelector(".goal-apart strong");
    if (apartEl) apartEl.textContent = fmtMoney(goalMonthlyApartado(g));
  });
  els.goalsList?.addEventListener("click", (ev) => {
    const id = ev.target.getAttribute?.("data-remove-goal");
    if (!id) return;
    state.savingsGoals = state.savingsGoals.filter((x) => x.id !== id);
    renderAll();
  });

  els.expenseList.addEventListener("input", (ev) => {
    const row = ev.target.closest(".expense-row");
    if (!row) return;
    const exp = state.expenses.find((x) => x.id === row.dataset.id);
    if (!exp) return;
    const field = ev.target.dataset.field;
    if (!field) return;
    if (field === "amount") exp.amount = coerceParsedNumber(ev.target.value);
    else if (field === "label") exp.label = ev.target.value;
    renderChartsAndHealth();
  });
  els.expenseList.addEventListener("change", (ev) => {
    const row = ev.target.closest(".expense-row");
    if (!row) return;
    const exp = state.expenses.find((x) => x.id === row.dataset.id);
    if (!exp) return;
    const field = ev.target.dataset.field;
    if (field === "cadence") exp.cadence = normalizeCadence(ev.target.value);
    if (field === "category") exp.category = EXPENSE_CATEGORIES.includes(ev.target.value) ? ev.target.value : "Otros";
    renderChartsAndHealth();
  });
  els.expenseList.addEventListener("click", (ev) => {
    const id = ev.target.getAttribute?.("data-remove-expense");
    if (!id) return;
    state.expenses = state.expenses.filter((x) => x.id !== id);
    renderAll();
  });

  els.debtList.addEventListener("input", (ev) => {
    const row = ev.target.closest(".debt-row");
    if (!row) return;
    const d = state.debts.find((x) => x.id === row.dataset.id);
    if (!d) return;
    const field = ev.target.dataset.field;
    if (!field) return;
    if (field === "balance" || field === "minPayment") d[field] = coerceParsedNumber(ev.target.value);
    else if (field === "label") d.label = ev.target.value;
    renderChartsAndHealth();
  });
  els.debtList.addEventListener("change", (ev) => {
    const row = ev.target.closest(".debt-row");
    if (!row) return;
    const d = state.debts.find((x) => x.id === row.dataset.id);
    if (!d) return;
    if (ev.target.dataset.field === "debtType") {
      d.debtType = ev.target.value === "card" ? "card" : "other";
      renderChartsAndHealth();
    }
  });
  els.debtList.addEventListener("click", (ev) => {
    const id = ev.target.getAttribute?.("data-remove-debt");
    if (!id) return;
    state.debts = state.debts.filter((x) => x.id !== id);
    renderAll();
  });

  els.coachForm.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const text = els.coachInput.value.trim();
    if (!text) return;
    const snap = renderChartsAndHealth();
    const answer = coachReply(text, snap);
    const userDiv = document.createElement("div");
    userDiv.className = "coach-msg user";
    userDiv.textContent = text;
    const botDiv = document.createElement("div");
    botDiv.className = "coach-msg bot";
    botDiv.textContent = answer;
    els.coachThread.append(userDiv, botDiv);
    els.coachThread.scrollTop = els.coachThread.scrollHeight;
    els.coachInput.value = "";
    els.coachStatus.textContent = t("coach_status");
  });

  document.querySelectorAll("[data-set-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const loc = btn.getAttribute("data-set-lang");
      setLocale(loc);
    });
  });
}

function coerceParsedNumber(raw) {
  const n = parseNum(raw);
  return Number.isFinite(n) ? n : 0;
}

function bootComfortLedger() {
  els = collectEls();
  if (!els.liquidSavings || !els.donutFlow || !els.addExpenseBtn) {
    return;
  }
  UI_LOCALE = loadLocale();
  document.documentElement.lang = UI_LOCALE === "zh" ? "zh-Hans" : UI_LOCALE === "en" ? "en" : "es";
  document.body.classList.toggle("lang-zh", UI_LOCALE === "zh");
  document.title = t("page_title");
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", t("meta_description"));
  bind();
  applyStaticI18n();
  updateLangButtons();
  renderAll();
  startWorldClocks();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootComfortLedger);
} else {
  bootComfortLedger();
}
