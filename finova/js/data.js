/* ============================================================
   FINOVA — Data layer
   Local storage persistence + derived (computed) data.
   Swap the Store methods for fetch() calls to hook up an API.
   ============================================================ */
"use strict";

const STORAGE_KEY = "finova.data.v1";
const OPENING_BALANCE = 0;

const INCOME_CATEGORY = {
  id: "income",
  name: "Income",
  color: "#16A34A",
  icon: "trendingUp",
  budget: 0,
  isIncome: true,
};

const DEFAULT_CATEGORIES = [
  {
    id: "housing",
    name: "Housing",
    color: "#16A34A",
    icon: "home",
    budget: 1500,
  },
  { id: "food", name: "Food", color: "#F59E0B", icon: "utensils", budget: 600 },
  {
    id: "transport",
    name: "Transport",
    color: "#3B82F6",
    icon: "car",
    budget: 300,
  },
  {
    id: "entertainment",
    name: "Entertainment",
    color: "#8B5CF6",
    icon: "film",
    budget: 200,
  },
  {
    id: "shopping",
    name: "Shopping",
    color: "#EC4899",
    icon: "bag",
    budget: 400,
  },
  {
    id: "utilities",
    name: "Utilities",
    color: "#06B6D4",
    icon: "zap",
    budget: 250,
  },
];

const FALLBACK_CATEGORY = {
  id: "uncategorized",
  name: "Uncategorized",
  color: "#9CA3AF",
  icon: "tag",
  budget: 0,
};

/* ---------- Seed data ---------- */
function seedTransactions() {
  const out = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMonth = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  const rnd = (min, max) => min + Math.random() * (max - min);

  function push(name, category, type, amount, date, status, description) {
    if (date > today) return;
    out.push({
      id: uid(),
      name: name,
      category: category,
      type: type,
      amount: round2(amount),
      date: toISO(date),
      status: status || "completed",
      description: description || "",
    });
  }

  for (let m = 0; m < 12; m++) {
    const base = new Date(
      startMonth.getFullYear(),
      startMonth.getMonth() + m,
      1,
    );
    const y = base.getFullYear();
    const mo = base.getMonth();
    const dim = daysInMonth(y, mo);
    const D = (day) => new Date(y, mo, Math.min(day, dim));

    push(
      "Salary",
      "income",
      "income",
      4850,
      D(1),
      "completed",
      "Monthly salary — Nova Labs",
    );
    push(
      "Rent Payment",
      "housing",
      "expense",
      1450,
      D(3),
      "completed",
      "Apartment rent",
    );
    push(
      "Groceries",
      "food",
      "expense",
      rnd(92, 148),
      D(5),
      "completed",
      "Whole Foods Market",
    );
    push(
      "Coffee Shop",
      "food",
      "expense",
      rnd(4.5, 7.4),
      D(7),
      "completed",
      "Blue Bottle Coffee",
    );
    push(
      "Netflix",
      "entertainment",
      "expense",
      15.49,
      D(8),
      "completed",
      "Standard plan",
    );
    push(
      "Electricity Bill",
      "utilities",
      "expense",
      rnd(78, 134),
      D(12),
      "completed",
      "City Power & Light",
    );
    push(
      "Uber",
      "transport",
      "expense",
      rnd(14, 34),
      D(14),
      "completed",
      "Ride to downtown",
    );
    push(
      "Freelance Project",
      "income",
      "income",
      rnd(280, 920),
      D(15),
      "completed",
      "Design retainer",
    );
    push(
      "Groceries",
      "food",
      "expense",
      rnd(62, 112),
      D(17),
      "completed",
      "Trader Joe's",
    );
    push(
      "Internet",
      "utilities",
      "expense",
      59.99,
      D(18),
      "completed",
      "Fiber 500 plan",
    );
    push(
      "Shopping",
      "shopping",
      "expense",
      rnd(42, 186),
      D(20),
      "completed",
      "Amazon order",
    );
    push(
      "Gas Station",
      "transport",
      "expense",
      rnd(38, 64),
      D(22),
      "completed",
      "Shell",
    );
    push(
      "Spotify",
      "entertainment",
      "expense",
      9.99,
      D(24),
      "completed",
      "Premium subscription",
    );
    push(
      "Groceries",
      "food",
      "expense",
      rnd(70, 122),
      D(26),
      "completed",
      "Costco run",
    );
    push(
      "Restaurant",
      "food",
      "expense",
      rnd(28, 74),
      D(27),
      "completed",
      "Dinner with friends",
    );
  }

  const daysAgo = (k) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - k);
  push(
    "Amazon Order",
    "shopping",
    "expense",
    89.99,
    daysAgo(1),
    "pending",
    "Awaiting clearance",
  );
  push(
    "Coffee Shop",
    "food",
    "expense",
    5.4,
    daysAgo(0),
    "completed",
    "Morning coffee",
  );
  push(
    "Uber",
    "transport",
    "expense",
    18.75,
    daysAgo(2),
    "completed",
    "Airport ride",
  );

  out.sort((a, b) => b.date.localeCompare(a.date));
  return out;
}

function defaultData() {
  return {
    version: 1,
    transactions: seedTransactions(),
    categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
    settings: {
      currency: "USD",
      theme: "light",
      notifyReport: true,
      notifyBudget: true,
      notifyLarge: false,
      savingsGoal: 1500,
      rollover: false,
    },
    profile: {
      name: "Alex Rivera",
      email: "alex@finova.app",
      initials: "AR",
    },
  };
}

/* ---------- Store ---------- */
const Store = {
  data: null,
  _memOnly: false,

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.transactions)) {
          this.data = parsed;
        }
      }
    } catch (e) {
      this._memOnly = true;
      console.warn("FINOVA: localStorage unavailable, running in memory.", e);
    }
    if (!this.data) {
      this.data = defaultData();
      this.save();
    }
    const d = defaultData();
    this.data.settings = Object.assign(
      {},
      d.settings,
      this.data.settings || {},
    );
    this.data.profile = Object.assign({}, d.profile, this.data.profile || {});
  },

  save() {
    if (this._memOnly) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      this._memOnly = true;
      console.warn("FINOVA: could not persist data.", e);
    }
  },

  reset() {
    this.data = defaultData();
    this.save();
  },

  clearTransactions() {
    this.data.transactions = [];
    this.save();
  },

  addTransaction(tx) {
    this.data.transactions.unshift(tx);
    this.data.transactions.sort((a, b) => b.date.localeCompare(a.date));
    this.save();
  },

  updateTransaction(id, patch) {
    const i = this.data.transactions.findIndex((t) => t.id === id);
    if (i > -1) {
      this.data.transactions[i] = Object.assign(
        {},
        this.data.transactions[i],
        patch,
      );
      this.data.transactions.sort((a, b) => b.date.localeCompare(a.date));
      this.save();
    }
  },

  deleteTransaction(id) {
    this.data.transactions = this.data.transactions.filter((t) => t.id !== id);
    this.save();
  },

  getTransaction(id) {
    return this.data.transactions.find((t) => t.id === id);
  },

  addCategory(cat) {
    this.data.categories.push(cat);
    this.save();
  },

  updateCategory(id, patch) {
    const c = this.data.categories.find((c) => c.id === id);
    if (c) Object.assign(c, patch);
    this.save();
  },

  deleteCategory(id) {
    this.data.categories = this.data.categories.filter((c) => c.id !== id);
    this.save();
  },

  categoryCount(id) {
    return this.data.transactions.filter((t) => t.category === id).length;
  },
};

/* ---------- Category lookup ---------- */
function getCategory(id) {
  if (id === "income") return INCOME_CATEGORY;
  return Store.data.categories.find((c) => c.id === id) || FALLBACK_CATEGORY;
}
function allCategories() {
  return Store.data.categories.concat([INCOME_CATEGORY]);
}

/* ---------- Derived data ---------- */
function txInMonth(mk) {
  return Store.data.transactions.filter((t) => t.date.slice(0, 7) === mk);
}
function sumByType(list, type) {
  return list.reduce((acc, t) => (t.type === type ? acc + t.amount : acc), 0);
}
function totalBalance() {
  const all = Store.data.transactions;
  return OPENING_BALANCE + sumByType(all, "income") - sumByType(all, "expense");
}
function balanceAtMonthEnd(mk) {
  let bal = OPENING_BALANCE;
  Store.data.transactions.forEach((t) => {
    if (t.date.slice(0, 7) <= mk) {
      bal += t.type === "income" ? t.amount : -t.amount;
    }
  });
  return bal;
}
function monthlySeries(n) {
  const keys = lastMonthKeys(n);
  return keys.map((mk) => {
    const list = txInMonth(mk);
    const income = sumByType(list, "income");
    const expense = sumByType(list, "expense");
    return {
      key: mk,
      label: monthLabel(mk),
      income: income,
      expense: expense,
      savings: income - expense,
    };
  });
}
function categoryBreakdown(monthKeys) {
  const map = {};
  Store.data.transactions.forEach((t) => {
    if (t.type !== "expense") return;
    if (monthKeys && monthKeys.indexOf(t.date.slice(0, 7)) === -1) return;
    map[t.category] = (map[t.category] || 0) + t.amount;
  });
  return Object.keys(map)
    .map((id) => Object.assign({}, getCategory(id), { value: map[id] }))
    .sort((a, b) => b.value - a.value);
}
function pctChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

Object.assign(globalThis, {
  STORAGE_KEY,
  OPENING_BALANCE,
  INCOME_CATEGORY,
  DEFAULT_CATEGORIES,
  FALLBACK_CATEGORY,
  seedTransactions,
  defaultData,
  Store,
  getCategory,
  allCategories,
  txInMonth,
  sumByType,
  totalBalance,
  balanceAtMonthEnd,
  monthlySeries,
  categoryBreakdown,
  pctChange,
});
