/* ============================================================
   FINOVA — Icon set
   Uses Lucide for consistent, open-source SVG icons.
   ============================================================ */
"use strict";

const LUCIDE_ICON_MAP = {
  wallet: "wallet",
  trendingUp: "trending-up",
  trendingDown: "trending-down",
  target: "target",
  arrowUpRight: "arrow-up-right",
  arrowDownRight: "arrow-down-right",
  minus: "minus",
  plus: "plus",
  edit: "pencil",
  trash: "trash-2",
  x: "x",
  check: "check",
  alert: "triangle-alert",
  info: "info",
  inbox: "inbox",
  download: "download",
  refresh: "rotate-cw",
  user: "user",
  tag: "tag",
  home: "house",
  utensils: "utensils-crossed",
  car: "car",
  film: "film",
  bag: "shopping-bag",
  zap: "zap",
  sun: "sun",
  moon: "moon",
  calendar: "calendar",
  clock: "clock-3",
  creditCard: "credit-card",
  shield: "shield",
  bell: "bell",
  search: "search",
  chevronLeft: "chevron-left",
  chevronRight: "chevron-right",
  barChart: "bar-chart-3",
  database: "database",
};

function toPascalCase(value) {
  return String(value || "")
    .trim()
    .replace(/[-_\s]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function icon(name, cls) {
  const fallback = '<span class="icon-fallback" aria-hidden="true">•</span>';
  const key = LUCIDE_ICON_MAP[name] || name;

  if (typeof window === "undefined" || !window.lucide) {
    return fallback;
  }

  try {
    const componentName = toPascalCase(key);
    const iconNode = window.lucide[componentName];

    if (!iconNode) {
      console.warn("Lucide icon not found:", key, componentName);
      return fallback;
    }

    const node = window.lucide.createElement(iconNode, {
      class: ["icon", cls].filter(Boolean).join(" "),
      stroke: "currentColor",
      fill: "none",
      "stroke-width": 2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
    });
    return node && node.outerHTML ? node.outerHTML : fallback;
  } catch (error) {
    console.warn("Lucide icon could not be rendered:", name, error);
    return fallback;
  }
}

if (
  typeof window !== "undefined" &&
  window.lucide &&
  typeof window.lucide.createIcons === "function"
) {
  window.addEventListener("DOMContentLoaded", () => {
    window.lucide.createIcons({
      attrs: { class: "icon" },
    });
  });
}
