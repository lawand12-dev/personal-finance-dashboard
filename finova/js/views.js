/* ============================================================
   FINOVA — Views
   Each view is a pure function that returns an HTML string.
   Views that need interactivity expose an `after*` hook.
   ============================================================ */
"use strict";

const PAGE_TITLES = {
  dashboard: "Dashboard",
  transactions: "Transactions",
  categories: "Categories",
  reports: "Reports",
  settings: "Settings",
};

/* ---------- Shared fragments ---------- */
function deltaHTML(current, previous, invert) {
  const change = pctChange(current, previous);
  if (!isFinite(change))
    return '<span class="delta flat">' + icon("minus", "icon-sm") + "—</span>";
  const up = change >= 0;
  const good = invert ? !up : up;
  const cls = Math.abs(change) < 0.05 ? "flat" : good ? "up" : "down";
  const arrow =
    Math.abs(change) < 0.05 ? "minus" : up ? "arrowUpRight" : "arrowDownRight";
  return (
    '<span class="delta ' +
    cls +
    '">' +
    icon(arrow, "icon-sm") +
    Math.abs(change).toFixed(1) +
    "%</span>"
  );
}

function statCard(cfg) {
  return (
    "" +
    '<div class="card stat rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">' +
    '<div class="stat-top flex items-start justify-between gap-3">' +
    '<span class="stat-label text-[13px] font-medium text-[var(--text-2)]">' +
    esc(cfg.label) +
    "</span>" +
    '<span class="chip ' +
    cfg.chip +
    ' flex h-10 w-10 items-center justify-center rounded-xl">' +
    icon(cfg.icon) +
    "</span>" +
    "</div>" +
    '<div class="stat-value text-[28px] font-bold tracking-[-0.03em] text-[var(--text)]">' +
    esc(cfg.value) +
    "</div>" +
    (cfg.delta
      ? '<div class="stat-foot flex items-center gap-2 text-sm text-[var(--text-2)]">' +
        cfg.delta +
        '<span class="small muted">vs last month</span></div>'
      : "") +
    "</div>"
  );
}

function emptyState(title, message, iconName) {
  return (
    '<div class="empty flex flex-col items-center justify-center gap-3 py-14 text-center">' +
    '<div class="empty-icon flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg)] text-[var(--text-3)]">' +
    icon(iconName || "inbox") +
    "</div>" +
    '<h3 class="text-[15px] font-semibold text-[var(--text)]">' +
    esc(title) +
    "</h3>" +
    '<p class="max-w-[330px] text-[13.5px] text-[var(--text-2)]">' +
    esc(message) +
    "</p>" +
    "</div>"
  );
}

function txRowHTML(t, opts) {
  opts = opts || {};
  const cat = getCategory(t.category);
  const isIncome = t.type === "income";
  const soft = hexToRgba(cat.color, 0.13);
  const statusBadge =
    t.status === "pending"
      ? '<span class="badge badge-amber">' +
        icon("clock", "icon-sm") +
        "Pending</span>"
      : '<span class="badge badge-green">' +
        icon("check", "icon-sm") +
        "Completed</span>";

  return (
    "" +
    "<tr>" +
    "<td>" +
    '<div class="tx-cell">' +
    '<span class="tx-icon" style="background:' +
    soft +
    ";color:" +
    cat.color +
    '">' +
    icon(cat.icon) +
    "</span>" +
    '<div style="min-width:0">' +
    '<div class="tx-name">' +
    esc(t.name) +
    "</div>" +
    '<div class="tx-sub">' +
    esc(t.description || cat.name) +
    "</div>" +
    "</div>" +
    "</div>" +
    "</td>" +
    '<td><span class="badge badge-gray">' +
    esc(cat.name) +
    "</span></td>" +
    '<td class="muted">' +
    esc(opts.short ? fmtDateShort(t.date) : fmtDate(t.date)) +
    "</td>" +
    (opts.showType
      ? '<td><span class="badge ' +
        (isIncome ? "badge-green" : "badge-red") +
        '">' +
        (isIncome ? "Income" : "Expense") +
        "</span></td>"
      : "") +
    '<td class="num amount ' +
    (isIncome ? "income" : "expense") +
    '">' +
    (isIncome ? "+" : "−") +
    money(t.amount) +
    "</td>" +
    (opts.showStatus ? "<td>" + statusBadge + "</td>" : "") +
    (opts.showActions
      ? '<td><div class="row-actions">' +
        '<button class="icon-btn sm" type="button" data-action="edit-tx" data-id="' +
        t.id +
        '" aria-label="Edit transaction">' +
        icon("edit") +
        "</button>" +
        '<button class="icon-btn sm danger" type="button" data-action="delete-tx" data-id="' +
        t.id +
        '" aria-label="Delete transaction">' +
        icon("trash") +
        "</button>" +
        "</div></td>"
      : "") +
    "</tr>"
  );
}

/* ---------- Dashboard ---------- */
function viewDashboard() {
  const all = Store.data.transactions;
  const mk = currentMonthKey();
  const pmk = prevMonthKey(mk);
  const cur = txInMonth(mk);
  const prev = txInMonth(pmk);

  const income = sumByType(cur, "income");
  const expense = sumByType(cur, "expense");
  const pIncome = sumByType(prev, "income");
  const pExpense = sumByType(prev, "expense");
  const savings = income - expense;
  const pSavings = pIncome - pExpense;

  const balNow = totalBalance();
  const balPrev = balanceAtMonthEnd(pmk);

  const recent = all.slice(0, 6);
  const profile = Store.data.profile;

  let html = "";

  /* Header */
  html +=
    '<div class="page-head flex flex-wrap items-end justify-between gap-5">' +
    "<div>" +
    '<h2 class="page-title text-[32px] font-bold tracking-[-0.025em] text-[var(--text)]">' +
    greeting() +
    ", " +
    esc((profile.name || "there").split(" ")[0]) +
    "</h2>" +
    '<p class="page-sub mt-1.5 text-[15px] text-[var(--text-2)]">Here\u2019s your financial overview for ' +
    monthLabelLong(mk) +
    ".</p>" +
    "</div>" +
    '<button class="btn btn-primary inline-flex items-center gap-2 rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--green-hover)]" type="button" data-action="add-tx">' +
    icon("plus") +
    "Add Transaction</button>" +
    "</div>";

  /* Summary cards */
  html += '<div class="grid grid-4" style="margin-bottom:20px;">';
  html += statCard({
    label: "Total Balance",
    value: money(balNow),
    icon: "wallet",
    chip: "chip-green",
    delta: deltaHTML(balNow, balPrev, false),
  });
  html += statCard({
    label: "Monthly Income",
    value: money(income),
    icon: "trendingUp",
    chip: "chip-blue",
    delta: deltaHTML(income, pIncome, false),
  });
  html += statCard({
    label: "Monthly Expenses",
    value: money(expense),
    icon: "trendingDown",
    chip: "chip-red",
    delta: deltaHTML(expense, pExpense, true),
  });
  html += statCard({
    label: "Savings",
    value: money(savings),
    icon: "target",
    chip: "chip-amber",
    delta: deltaHTML(savings, pSavings, false),
  });
  html += "</div>";

  /* Charts row */
  html += '<div class="grid grid-dash" style="margin-bottom:20px;">';

  html +=
    '<div class="card">' +
    '<div class="card-head">' +
    "<div>" +
    '<h3 class="card-title">Spending Overview</h3>' +
    '<p class="card-sub">Income vs expenses · last 6 months</p>' +
    "</div>" +
    '<ul class="chart-legend">' +
    '<li><span class="lg-dot" style="background:' +
    cssVar("--green") +
    '"></span>Income</li>' +
    '<li><span class="lg-dot" style="background:' +
    cssVar("--red") +
    '"></span>Expenses</li>' +
    "</ul>" +
    "</div>" +
    '<div class="card-body"><div class="chart" id="overviewChart"></div></div>' +
    "</div>";

  html +=
    '<div class="card">' +
    '<div class="card-head">' +
    "<div>" +
    '<h3 class="card-title">Spending by Category</h3>' +
    '<p class="card-sub">' +
    monthLabelLong(mk) +
    "</p>" +
    "</div>" +
    "</div>" +
    '<div class="donut-wrap">' +
    '<div class="donut" id="categoryDonut"></div>' +
    '<ul class="donut-legend" id="donutLegend"></ul>' +
    "</div>" +
    "</div>";

  html += "</div>";

  /* Recent transactions */
  html +=
    '<div class="card">' +
    '<div class="card-head">' +
    "<div>" +
    '<h3 class="card-title">Recent Transactions</h3>' +
    '<p class="card-sub">Your latest account activity</p>' +
    "</div>" +
    '<button class="btn btn-secondary btn-sm" type="button" data-action="go-transactions">View all</button>' +
    "</div>";

  if (!recent.length) {
    html += emptyState(
      "No transactions yet",
      "Add your first transaction to see it appear here.",
      "inbox",
    );
  } else {
    html +=
      '<div class="table-wrap"><table class="data">' +
      "<thead><tr>" +
      '<th>Transaction</th><th>Category</th><th>Date</th><th class="num">Amount</th><th>Status</th>' +
      "</tr></thead><tbody>" +
      recent
        .map((t) => txRowHTML(t, { short: true, showStatus: true }))
        .join("") +
      "</tbody></table></div>";
  }
  html += "</div>";

  return html;
}

function afterDashboard() {
  const series = monthlySeries(6);

  renderAreaChart($("#overviewChart"), {
    id: "ov",
    height: 292,
    labels: series.map((s) => s.label),
    tipLabels: series.map((s) => monthLabelLong(s.key)),
    ariaLabel: "Income and expenses over the last six months",
    series: [
      {
        name: "Income",
        color: cssVar("--green"),
        values: series.map((s) => s.income),
      },
      {
        name: "Expenses",
        color: cssVar("--red"),
        values: series.map((s) => s.expense),
      },
    ],
  });

  const mk = currentMonthKey();
  const breakdown = categoryBreakdown([mk]);
  const total = breakdown.reduce((a, c) => a + c.value, 0);

  renderDonut($("#categoryDonut"), breakdown, total);

  const legend = $("#donutLegend");
  if (!breakdown.length) {
    legend.innerHTML =
      '<li class="leg-item"><span class="leg-name">No spending recorded this month.</span></li>';
  } else {
    legend.innerHTML = breakdown
      .map((c) => {
        const pct = total > 0 ? (c.value / total) * 100 : 0;
        return (
          '<li class="leg-item">' +
          '<span class="leg-dot" style="background:' +
          c.color +
          '"></span>' +
          '<span class="leg-name">' +
          esc(c.name) +
          "</span>" +
          '<span class="leg-amt">' +
          money(c.value, { cents: false }) +
          "</span>" +
          '<span class="leg-pct">' +
          pct.toFixed(0) +
          "%</span>" +
          "</li>"
        );
      })
      .join("");
  }
}

/* ---------- Transactions ---------- */
function filteredTransactions() {
  const f = ui.tx;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let list = Store.data.transactions.slice();

  if (f.q) {
    const q = f.q.toLowerCase();
    list = list.filter(
      (t) =>
        t.name.toLowerCase().indexOf(q) > -1 ||
        (t.description || "").toLowerCase().indexOf(q) > -1 ||
        getCategory(t.category).name.toLowerCase().indexOf(q) > -1,
    );
  }
  if (f.category !== "all")
    list = list.filter((t) => t.category === f.category);
  if (f.type !== "all") list = list.filter((t) => t.type === f.type);

  if (f.range !== "all") {
    let from = null;
    if (f.range === "7d")
      from = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 6,
      );
    if (f.range === "30d")
      from = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 29,
      );
    if (f.range === "month")
      from = new Date(today.getFullYear(), today.getMonth(), 1);
    if (f.range === "3m")
      from = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    if (f.range === "year") from = new Date(today.getFullYear(), 0, 1);
    if (from) list = list.filter((t) => parseISO(t.date) >= from);
  }
  return list;
}

function txTableHTML() {
  const list = filteredTransactions();
  const visible = list.slice(0, ui.tx.limit);

  if (!list.length) {
    return emptyState(
      "No transactions found",
      "Try adjusting your filters or search terms, or add a new transaction.",
      "search",
    );
  }

  let html =
    '<div class="table-wrap"><table class="data">' +
    "<thead><tr>" +
    '<th>Name</th><th>Category</th><th>Date</th><th>Type</th><th class="num">Amount</th><th style="text-align:right">Actions</th>' +
    "</tr></thead><tbody>" +
    visible
      .map((t) => txRowHTML(t, { showType: true, showActions: true }))
      .join("") +
    "</tbody></table></div>";

  html +=
    '<div class="load-more">' +
    '<span class="small muted">Showing <strong>' +
    visible.length +
    "</strong> of <strong>" +
    list.length +
    "</strong> transactions</span>";
  if (visible.length < list.length) {
    html +=
      '<button class="btn btn-secondary btn-sm" type="button" data-action="load-more">Load more</button>';
  } else if (list.length > 10) {
    html +=
      '<button class="btn btn-ghost btn-sm" type="button" data-action="collapse-list">Show less</button>';
  }
  html += "</div>";

  return html;
}

function viewTransactions() {
  const cats = Store.data.categories;
  let html = "";

  html +=
    '<div class="page-head flex flex-wrap items-end justify-between gap-5">' +
    "<div>" +
    '<h2 class="page-title text-[32px] font-bold tracking-[-0.025em] text-[var(--text)]">Transactions</h2>' +
    '<p class="page-sub mt-1.5 text-[15px] text-[var(--text-2)]">Manage, filter and review every transaction on your account.</p>' +
    "</div>" +
    '<button class="btn btn-primary inline-flex items-center gap-2 rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--green-hover)]" type="button" data-action="add-tx">' +
    icon("plus") +
    "Add Transaction</button>" +
    "</div>";

  html +=
    '<div class="card filter-bar mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm" style="margin-bottom:20px;">' +
    '<div class="search relative flex-1 min-w-[180px]">' +
    icon("search") +
    '<input class="input h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-10 text-sm text-[var(--text)] placeholder:text-[var(--text-3)]" id="txSearch" type="search" placeholder="Search by name, note or category…" value="' +
    esc(ui.tx.q) +
    '" aria-label="Search transactions">' +
    "</div>" +
    '<select class="select" id="fRange" aria-label="Date range">' +
    '<option value="all">All time</option>' +
    '<option value="7d">Last 7 days</option>' +
    '<option value="30d">Last 30 days</option>' +
    '<option value="month">This month</option>' +
    '<option value="3m">Last 3 months</option>' +
    '<option value="year">This year</option>' +
    "</select>" +
    '<select class="select" id="fCategory" aria-label="Category">' +
    '<option value="all">All categories</option>' +
    cats
      .map((c) => '<option value="' + c.id + '">' + esc(c.name) + "</option>")
      .join("") +
    '<option value="income">Income</option>' +
    "</select>" +
    '<select class="select" id="fType" aria-label="Type">' +
    '<option value="all">All types</option>' +
    '<option value="income">Income</option>' +
    '<option value="expense">Expense</option>' +
    "</select>" +
    '<button class="btn btn-ghost btn-sm" type="button" data-action="reset-filters">' +
    icon("refresh", "icon-sm") +
    "Reset</button>" +
    "</div>";

  html += '<div class="card" id="txTableCard">' + txTableHTML() + "</div>";

  return html;
}

function afterTransactions() {
  const s = $("#txSearch");
  const r = $("#fRange");
  const c = $("#fCategory");
  const t = $("#fType");
  if (r) r.value = ui.tx.range;
  if (c) c.value = ui.tx.category;
  if (t) t.value = ui.tx.type;

  if (s) {
    s.addEventListener(
      "input",
      debounce(() => {
        ui.tx.q = s.value.trim();
        ui.tx.limit = 10;
        const card = $("#txTableCard");
        if (card) card.innerHTML = txTableHTML();
      }, 180),
    );
  }
  [r, c, t].forEach((el) => {
    if (!el) return;
    el.addEventListener("change", () => {
      ui.tx.range = r ? r.value : "all";
      ui.tx.category = c ? c.value : "all";
      ui.tx.type = t ? t.value : "all";
      ui.tx.limit = 10;
      const card = $("#txTableCard");
      if (card) card.innerHTML = txTableHTML();
    });
  });
}

/* ---------- Categories ---------- */
function viewCategories() {
  const cats = Store.data.categories;
  const mk = currentMonthKey();
  const spentMap = {};
  txInMonth(mk).forEach((t) => {
    if (t.type !== "expense") return;
    spentMap[t.category] = (spentMap[t.category] || 0) + t.amount;
  });

  let html = "";
  html +=
    '<div class="page-head">' +
    "<div>" +
    '<h2 class="page-title">Categories</h2>' +
    '<p class="page-sub">Track monthly budgets and spending across your categories.</p>' +
    "</div>" +
    '<button class="btn btn-primary" type="button" data-action="add-category">' +
    icon("plus") +
    "New Category</button>" +
    "</div>";

  if (!cats.length) {
    return (
      html +
      '<div class="card">' +
      emptyState(
        "No categories yet",
        "Create a category to start organising your spending.",
        "tag",
      ) +
      "</div>"
    );
  }

  html += '<div class="grid grid-3">';
  cats.forEach((c) => {
    const spent = spentMap[c.id] || 0;
    const budget = c.budget || 0;
    const pct = budget > 0 ? (spent / budget) * 100 : 0;
    const barCls = pct >= 100 ? "over" : pct >= 80 ? "warn" : "";
    const remaining = budget - spent;
    const count = Store.data.transactions.filter(
      (t) => t.category === c.id,
    ).length;

    html +=
      '<div class="card cat-card">' +
      '<div class="cat-head">' +
      '<span class="chip" style="background:' +
      hexToRgba(c.color, 0.13) +
      ";color:" +
      c.color +
      '">' +
      icon(c.icon) +
      "</span>" +
      "<div>" +
      '<div class="cat-name">' +
      esc(c.name) +
      "</div>" +
      '<div class="cat-meta">' +
      count +
      " transaction" +
      (count === 1 ? "" : "s") +
      "</div>" +
      "</div>" +
      '<div class="cat-actions">' +
      '<button class="icon-btn sm" type="button" data-action="edit-category" data-id="' +
      c.id +
      '" aria-label="Edit category">' +
      icon("edit") +
      "</button>" +
      '<button class="icon-btn sm danger" type="button" data-action="delete-category" data-id="' +
      c.id +
      '" aria-label="Delete category">' +
      icon("trash") +
      "</button>" +
      "</div>" +
      "</div>" +
      "<div>" +
      '<div class="cat-amounts"><strong>' +
      money(spent, { cents: false }) +
      "</strong><span>/ " +
      money(budget, { cents: false }) +
      " budget</span></div>" +
      '<div class="progress" style="margin-top:10px;"><div class="progress-bar ' +
      barCls +
      '" style="width:' +
      Math.min(100, pct).toFixed(1) +
      '%"></div></div>' +
      '<div class="cat-foot" style="margin-top:8px;">' +
      "<span>" +
      (budget > 0 ? pct.toFixed(0) + "% of budget" : "No budget set") +
      "</span>" +
      "<span>" +
      (budget > 0
        ? remaining >= 0
          ? money(remaining, { cents: false }) + " left"
          : money(Math.abs(remaining), { cents: false }) + " over"
        : "") +
      "</span>" +
      "</div>" +
      "</div>" +
      "</div>";
  });
  html += "</div>";

  return html;
}

/* ---------- Reports ---------- */
function viewReports() {
  const n = ui.reportRange;
  const series = monthlySeries(n);
  const keys = series.map((s) => s.key);

  const totalIncome = series.reduce((a, s) => a + s.income, 0);
  const totalExpense = series.reduce((a, s) => a + s.expense, 0);
  const net = totalIncome - totalExpense;
  const avgSavings = series.length ? net / series.length : 0;
  const savingsRate = totalIncome > 0 ? (net / totalIncome) * 100 : 0;

  const breakdown = categoryBreakdown(keys);
  const catTotal = breakdown.reduce((a, c) => a + c.value, 0);

  let html = "";

  html +=
    '<div class="page-head">' +
    "<div>" +
    '<h2 class="page-title">Reports</h2>' +
    '<p class="page-sub">Understand where your money goes over time.</p>' +
    "</div>" +
    '<div class="segmented" role="group" aria-label="Date range">' +
    [3, 6, 12]
      .map(
        (v) =>
          '<button class="seg' +
          (ui.reportRange === v ? " active" : "") +
          '" type="button" data-action="report-range" data-range="' +
          v +
          '">' +
          (v === 12 ? "12 months" : v + " months") +
          "</button>",
      )
      .join("") +
    "</div>" +
    "</div>";

  /* Summary strip */
  html +=
    '<div class="grid grid-4" style="margin-bottom:20px;">' +
    statCard({
      label: "Total Income",
      value: money(totalIncome),
      icon: "trendingUp",
      chip: "chip-green",
    }) +
    statCard({
      label: "Total Expenses",
      value: money(totalExpense),
      icon: "trendingDown",
      chip: "chip-red",
    }) +
    statCard({
      label: "Net Savings",
      value: money(net),
      icon: "target",
      chip: "chip-blue",
    }) +
    statCard({
      label: "Avg. Monthly Savings",
      value: money(avgSavings),
      icon: "wallet",
      chip: "chip-amber",
    }) +
    "</div>";

  html += '<div class="grid grid-2" style="margin-bottom:20px;">';

  html +=
    '<div class="card">' +
    '<div class="card-head">' +
    '<div><h3 class="card-title">Income vs Expenses</h3><p class="card-sub">Monthly comparison</p></div>' +
    '<ul class="chart-legend">' +
    '<li><span class="lg-dot" style="background:' +
    cssVar("--green") +
    '"></span>Income</li>' +
    '<li><span class="lg-dot" style="background:' +
    cssVar("--red") +
    '"></span>Expenses</li>' +
    "</ul>" +
    "</div>" +
    '<div class="card-body"><div class="chart" id="reportBars"></div></div>' +
    "</div>";

  html +=
    '<div class="card">' +
    '<div class="card-head">' +
    '<div><h3 class="card-title">Savings Trend</h3><p class="card-sub">Net saved each month · ' +
    savingsRate.toFixed(0) +
    "% savings rate</p></div>" +
    "</div>" +
    '<div class="card-body"><div class="chart" id="reportSavings"></div></div>' +
    "</div>";

  html += "</div>";

  /* Category breakdown */
  html +=
    '<div class="card">' +
    '<div class="card-head">' +
    '<div><h3 class="card-title">Spending by Category</h3><p class="card-sub">Across the selected period</p></div>' +
    "</div>" +
    '<div class="card-body">';

  if (!breakdown.length) {
    html += emptyState(
      "No spending in this period",
      "Try selecting a longer date range.",
      "barChart",
    );
  } else {
    breakdown.forEach((c) => {
      const pct = catTotal > 0 ? (c.value / catTotal) * 100 : 0;
      html +=
        '<div class="bar-row">' +
        '<div class="bar-row-top">' +
        '<span class="bar-name"><span class="lg-dot" style="display:inline-block;background:' +
        c.color +
        ';margin-right:8px;"></span>' +
        esc(c.name) +
        "</span>" +
        '<span class="bar-val">' +
        money(c.value) +
        " · " +
        pct.toFixed(0) +
        "%</span>" +
        "</div>" +
        '<div class="progress"><div class="progress-bar" style="width:' +
        pct.toFixed(1) +
        "%;background:" +
        c.color +
        '"></div></div>' +
        "</div>";
    });
  }

  html += "</div></div>";

  return html;
}

function afterReports() {
  const n = ui.reportRange;
  const series = monthlySeries(n);

  renderBarChart($("#reportBars"), {
    height: 300,
    ariaLabel: "Income versus expenses by month",
    labels: series.map((s) => s.label),
    groups: [
      {
        name: "Income",
        color: cssVar("--green"),
        values: series.map((s) => s.income),
      },
      {
        name: "Expenses",
        color: cssVar("--red"),
        values: series.map((s) => s.expense),
      },
    ],
  });

  renderAreaChart($("#reportSavings"), {
    id: "sav",
    height: 300,
    labels: series.map((s) => s.label),
    tipLabels: series.map((s) => monthLabelLong(s.key)),
    ariaLabel: "Savings trend over time",
    series: [
      {
        name: "Saved",
        color: cssVar("--green"),
        values: series.map((s) => Math.max(0, s.savings)),
      },
    ],
  });
}

/* ---------- Settings ---------- */
function viewSettings() {
  const s = Store.data.settings;
  const p = Store.data.profile;

  function row(title, desc, control) {
    return (
      '<div class="setting-row">' +
      '<div class="setting-info"><h4>' +
      esc(title) +
      "</h4><p>" +
      esc(desc) +
      "</p></div>" +
      '<div class="setting-control">' +
      control +
      "</div>" +
      "</div>"
    );
  }
  function toggle(id, checked) {
    return (
      '<label class="switch"><input type="checkbox" id="' +
      id +
      '"' +
      (checked ? " checked" : "") +
      ">" +
      '<span class="track"><span class="thumb"></span></span></label>'
    );
  }

  let html = "";

  html +=
    '<div class="page-head">' +
    "<div>" +
    '<h2 class="page-title">Settings</h2>' +
    '<p class="page-sub">Manage your profile, preferences and stored data.</p>' +
    "</div>" +
    "</div>";

  html += '<div class="grid grid-2">';

  /* Profile */
  html +=
    '<div class="card">' +
    '<div class="card-head"><div><h3 class="card-title">Profile</h3><p class="card-sub">How your name appears across FINOVA</p></div></div>' +
    '<div class="settings-section">' +
    '<div class="setting-row" style="align-items:center;">' +
    '<div class="setting-info" style="display:flex;align-items:center;gap:14px;">' +
    '<span class="avatar" style="width:48px;height:48px;font-size:16px;">' +
    esc(p.initials || "AR") +
    "</span>" +
    "<div><h4>" +
    esc(p.name) +
    "</h4><p>" +
    esc(p.email) +
    "</p></div>" +
    "</div>" +
    "</div>" +
    '<div class="setting-row" style="display:block;">' +
    '<div class="form-grid" style="margin-top:8px;">' +
    '<div class="field"><label class="label" for="setName">Full name</label>' +
    '<input class="input" id="setName" value="' +
    esc(p.name) +
    '" maxlength="48"></div>' +
    '<div class="field"><label class="label" for="setEmail">Email address</label>' +
    '<input class="input" id="setEmail" type="email" value="' +
    esc(p.email) +
    '" maxlength="64"></div>' +
    '<div><button class="btn btn-primary btn-sm" type="button" data-action="save-profile">Save changes</button></div>' +
    "</div>" +
    "</div>" +
    "</div>" +
    "</div>";

  /* Appearance + currency */
  html +=
    '<div class="card">' +
    '<div class="card-head"><div><h3 class="card-title">Appearance &amp; Currency</h3><p class="card-sub">Personalise how FINOVA looks</p></div></div>' +
    '<div class="settings-section">' +
    row(
      "Dark mode",
      "Use a darker palette that is easier on the eyes at night.",
      toggle("setDark", s.theme === "dark"),
    ) +
    row(
      "Currency",
      "Applies to every amount displayed in the app.",
      '<select class="select" id="setCurrency">' +
        ["USD", "EUR", "GBP", "INR", "JPY", "CAD", "AUD"]
          .map(
            (c) =>
              '<option value="' +
              c +
              '"' +
              (s.currency === c ? " selected" : "") +
              ">" +
              c +
              "</option>",
          )
          .join("") +
        "</select>",
    ) +
    "</div>" +
    "</div>";

  /* Notifications */
  html +=
    '<div class="card">' +
    '<div class="card-head"><div><h3 class="card-title">Notifications</h3><p class="card-sub">Choose what FINOVA tells you about</p></div></div>' +
    '<div class="settings-section">' +
    row(
      "Monthly report",
      "Receive a summary of your spending each month.",
      toggle("setNotifyReport", s.notifyReport),
    ) +
    row(
      "Budget alerts",
      "Get notified when a category reaches 80% of its budget.",
      toggle("setNotifyBudget", s.notifyBudget),
    ) +
    row(
      "Large transactions",
      "Alert me for any transaction above $500.",
      toggle("setNotifyLarge", s.notifyLarge),
    ) +
    "</div>" +
    "</div>";

  /* Budget preferences */
  html +=
    '<div class="card">' +
    '<div class="card-head"><div><h3 class="card-title">Budget Preferences</h3><p class="card-sub">Set your monthly savings target</p></div></div>' +
    '<div class="settings-section">' +
    '<div class="setting-row">' +
    '<div class="setting-info"><h4>Monthly savings goal</h4><p>Used to measure your progress on the dashboard.</p></div>' +
    '<div class="setting-control"><input class="input" id="setGoal" type="number" min="0" step="50" value="' +
    s.savingsGoal +
    '" style="width:140px;"></div>' +
    "</div>" +
    row(
      "Roll over unused budget",
      "Carry remaining category budget into the next month.",
      toggle("setRollover", s.rollover),
    ) +
    "</div>" +
    "</div>";

  /* Data management */
  html +=
    '<div class="card">' +
    '<div class="card-head"><div><h3 class="card-title">Data Management</h3><p class="card-sub">Your data never leaves this browser</p></div></div>' +
    '<div class="settings-section danger-zone">' +
    row(
      "Export data",
      "Download all transactions and settings as a JSON file.",
      '<button class="btn btn-secondary btn-sm" type="button" data-action="export-data">' +
        icon("download", "icon-sm") +
        "Export</button>",
    ) +
    row(
      "Reset to demo data",
      "Restore the original sample dataset.",
      '<button class="btn btn-secondary btn-sm" type="button" data-action="reset-demo">' +
        icon("refresh", "icon-sm") +
        "Reset</button>",
    ) +
    row(
      "Clear all data",
      "Permanently remove every transaction stored in this browser.",
      '<button class="btn btn-danger btn-sm" type="button" data-action="clear-data">' +
        icon("trash", "icon-sm") +
        "Clear data</button>",
    ) +
    "</div>" +
    "</div>";

  html += "</div>";

  html +=
    '<p class="small muted" style="text-align:center;margin-top:24px;">FINOVA · Personal finance dashboard · Data stored locally in your browser</p>';

  return html;
}

/* ---------- Skeleton ---------- */
function skeletonView() {
  return (
    '<div style="margin-bottom:24px;">' +
    '<div class="sk sk-line" style="width:280px;height:30px;margin-bottom:10px;"></div>' +
    '<div class="sk sk-line" style="width:380px;"></div>' +
    "</div>" +
    '<div class="grid grid-4" style="margin-bottom:20px;">' +
    '<div class="sk sk-card"></div><div class="sk sk-card"></div>' +
    '<div class="sk sk-card"></div><div class="sk sk-card"></div>' +
    "</div>" +
    '<div class="grid grid-dash">' +
    '<div class="sk sk-chart"></div><div class="sk sk-chart"></div>' +
    "</div>"
  );
}

/* ---------- Registry ---------- */
const VIEWS = {
  dashboard: viewDashboard,
  transactions: viewTransactions,
  categories: viewCategories,
  reports: viewReports,
  settings: viewSettings,
};
const AFTER = {
  dashboard: afterDashboard,
  transactions: afterTransactions,
  reports: afterReports,
};

Object.assign(globalThis, {
  PAGE_TITLES,
  deltaHTML,
  statCard,
  emptyState,
  txRowHTML,
  viewDashboard,
  afterDashboard,
  filteredTransactions,
  txTableHTML,
  viewTransactions,
  afterTransactions,
  viewCategories,
  viewReports,
  afterReports,
  viewSettings,
  skeletonView,
  VIEWS,
  AFTER,
});
