/* ============================================================
   FINOVA — Utilities
   Global helpers used across the app. No dependencies.
   ============================================================ */
"use strict";

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function esc(s) {
  return String(s == null ? "" : s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function round2(n) {
  return Math.round(n * 100) / 100;
}

function parseISO(iso) {
  const p = String(iso).split("-").map(Number);
  return new Date(p[0], (p[1] || 1) - 1, p[2] || 1);
}
function toISO(d) {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}
function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}
function todayISO() {
  return toISO(new Date());
}

function fmtDate(iso) {
  return parseISO(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function fmtDateShort(iso) {
  const d = parseISO(iso);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const diff = Math.round((t - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function currentMonthKey() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}
function prevMonthKey(mk) {
  const [y, m] = mk.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}
function monthLabel(mk) {
  const [y, m] = mk.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
}
function monthLabelLong(mk) {
  const [y, m] = mk.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
function lastMonthKeys(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"));
  }
  return out;
}

function currencySymbol() {
  const c =
    (Store.data && Store.data.settings && Store.data.settings.currency) ||
    "USD";
  return (
    { USD: "$", EUR: "€", GBP: "£", INR: "₹", JPY: "¥", CAD: "C$", AUD: "A$" }[
      c
    ] || "$"
  );
}
function money(n, opts) {
  opts = opts || {};
  const cents = opts.cents !== false;
  const cur =
    (Store.data && Store.data.settings && Store.data.settings.currency) ||
    "USD";
  const abs = Math.abs(Number(n) || 0);
  let str;
  try {
    str = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      minimumFractionDigits: cents ? 2 : 0,
      maximumFractionDigits: cents ? 2 : 0,
    }).format(abs);
  } catch (e) {
    str = currencySymbol() + abs.toFixed(cents ? 2 : 0);
  }
  if (opts.sign && n > 0) return "+" + str;
  if (n < 0) return "−" + str;
  return str;
}
function compactMoney(v) {
  const sym = currencySymbol();
  if (v >= 1000) {
    const k = v / 1000;
    return sym + (k % 1 === 0 ? k : k.toFixed(1)) + "k";
  }
  return sym + Math.round(v);
}

function hexToRgba(hex, a) {
  let h = String(hex).replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const num = parseInt(h, 16);
  return (
    "rgba(" +
    ((num >> 16) & 255) +
    "," +
    ((num >> 8) & 255) +
    "," +
    (num & 255) +
    "," +
    a +
    ")"
  );
}
function cssVar(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

function debounce(fn, wait) {
  let t;
  return function () {
    const args = arguments,
      ctx = this;
    clearTimeout(t);
    t = setTimeout(() => fn.apply(ctx, args), wait);
  };
}
function uid() {
  return (
    "tx_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 7)
  );
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

Object.assign(globalThis, {
  $,
  $$,
  esc,
  round2,
  parseISO,
  toISO,
  daysInMonth,
  todayISO,
  fmtDate,
  fmtDateShort,
  currentMonthKey,
  prevMonthKey,
  monthLabel,
  monthLabelLong,
  lastMonthKeys,
  currencySymbol,
  money,
  compactMoney,
  hexToRgba,
  cssVar,
  debounce,
  uid,
  greeting,
});
