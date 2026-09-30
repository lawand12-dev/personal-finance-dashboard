import { findTransactionCategory, getTransactionCategories } from "../domain/categories.js";

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
});

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

export function renderDashboard(summary, state, root = document) {
  validateInputs(summary, state);

  const balanceElement = requireElement(root, ".balance-value");
  const balanceNoteElement = requireElement(root, ".balance-note");
  const monthlyValues = root.querySelectorAll(".metrics-grid .metric-value");

  if (monthlyValues.length !== 2) {
    throw new Error("Dashboard markup must contain income and expense values.");
  }

  balanceElement.textContent = formatCurrency(summary.totalBalanceCents);
  balanceNoteElement.textContent = getBalanceNote(state.openingBalanceCents);
  monthlyValues[0].textContent = formatCurrency(summary.monthlyIncomeCents);
  monthlyValues[1].textContent = formatCurrency(summary.monthlyExpenseCents);
  renderBudgets(root, state.budgets ?? []);
  renderTransactions(root, state.transactions ?? []);
  renderTransactionDeleteChoices(root, state.transactions ?? []);
  syncQuickActions(root, state.transactions ?? []);
}

export function renderTransactionDeleteChoices(root, transactions) {
  const listElement = root.querySelector("#delete-transaction-list");

  if (!listElement) {
    return;
  }

  listElement.innerHTML = "";

  if (transactions.length === 0) {
    const emptyItem = (root.ownerDocument ?? root).createElement("li");
    emptyItem.className = "empty-panel compact-empty";
    emptyItem.textContent = "No transactions to delete.";
    listElement.appendChild(emptyItem);
    return;
  }

  const documentRef = root.ownerDocument ?? root;
  const fragment = documentRef.createDocumentFragment();

  for (const transaction of [...transactions].reverse()) {
    const item = documentRef.createElement("li");
    const button = documentRef.createElement("button");
    const details = documentRef.createElement("span");
    const amount = documentRef.createElement("span");
    const category = findTransactionCategory(transaction.type, transaction.category);
    const type = transaction.type === "income" ? "Income" : "Expense";

    item.className = "delete-transaction-item";
    button.className = "delete-transaction-option";
    button.type = "button";
    button.dataset.transactionId = transaction.id;
    details.className = "delete-transaction-details";
    details.textContent = `${type} · ${category?.label ?? "Other"}${transaction.description ? ` · ${transaction.description}` : ""} · ${transaction.date}`;
    amount.className = `delete-transaction-amount ${transaction.type === "income" ? "text-green" : "text-red"}`;
    amount.textContent = `${transaction.type === "income" ? "+" : "−"}${formatCurrency(transaction.amountCents)}`;

    button.append(details, amount);
    item.appendChild(button);
    fragment.appendChild(item);
  }

  listElement.appendChild(fragment);
}

export function bindBudgetForm(root = document, onAddBudget) {
  const form = root.querySelector("#budget-form");

  if (!form || form.dataset.bound === "true") {
    return;
  }

  form.dataset.bound = "true";

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const amountValue = Number.parseFloat(String(formData.get("amount") ?? ""));

    if (!name || !Number.isFinite(amountValue) || amountValue <= 0) {
      form.reportValidity?.();
      return;
    }

    const nextBudget = {
      id: createBudgetId(),
      name,
      amountCents: Math.round(amountValue * 100),
      month: getCurrentMonthKey(new Date()),
    };

    onAddBudget?.(nextBudget);
    form.reset();

    const firstInput = form.querySelector('input[name="name"]');
    firstInput?.focus();
  });
}

export function bindTransactionForm(root = document, onAddTransaction) {
  const form = root.querySelector("#transaction-form");

  if (!form || form.dataset.bound === "true") {
    return;
  }

  form.dataset.bound = "true";

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const typeValue = String(formData.get("type") ?? "expense");
    const categoryId = String(formData.get("category") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const amountValue = Number.parseFloat(String(formData.get("amount") ?? ""));
    const dateValue = String(formData.get("date") ?? "").trim();
    const category = findTransactionCategory(typeValue, categoryId);

    if (!category || !dateValue || !Number.isFinite(amountValue) || amountValue <= 0) {
      form.reportValidity?.();
      return;
    }

    const nextTransaction = {
      id: createTransactionId(),
      type: typeValue === "income" ? "income" : "expense",
      category: category.id,
      description,
      amountCents: Math.round(amountValue * 100),
      date: dateValue,
    };

    onAddTransaction?.(nextTransaction);
    form.reset();
  });
}

export function syncTransactionCategories(root, type) {
  const select = root.querySelector('#transaction-form select[name="category"]');
  if (!select) {
    return;
  }

  const categories = getTransactionCategories(type);
  select.innerHTML = categories
    .map((category) => `<option value="${category.id}">${category.label}</option>`)
    .join("");
  select.value = categories[0]?.id ?? "";
}

function validateInputs(summary, state) {
  if (
    summary === null ||
    typeof summary !== "object" ||
    !Number.isSafeInteger(summary.totalBalanceCents) ||
    !Number.isSafeInteger(summary.monthlyIncomeCents) ||
    !Number.isSafeInteger(summary.monthlyExpenseCents)
  ) {
    throw new TypeError("Dashboard summary must contain safe integer totals in cents.");
  }

  if (state === null || typeof state !== "object" || !Array.isArray(state.transactions)) {
    throw new TypeError("Dashboard profile must contain a transactions array.");
  }
}

function renderBudgets(root, budgets) {
  const listElement = root.querySelector("#budget-list");

  if (!listElement) {
    return;
  }

  if (!Array.isArray(budgets) || budgets.length === 0) {
    listElement.innerHTML = `
      <div class="empty-panel compact-empty">
        <p class="empty-title">No budgets yet</p>
        <p>Your monthly budget totals will appear here.</p>
      </div>
    `;
    return;
  }

  const documentRef = root.ownerDocument ?? root;
  const fragment = documentRef.createDocumentFragment();

  for (const budget of budgets) {
    const item = documentRef.createElement("article");
    item.className = "budget-card";
    item.innerHTML = `
      <div>
        <h3>${escapeHtml(budget.name)}</h3>
        <p class="budget-meta">${formatMonthLabel(budget.month)}</p>
      </div>
      <div class="budget-amount">${formatCurrency(budget.amountCents)}</div>
    `;
    fragment.appendChild(item);
  }

  listElement.innerHTML = "";
  listElement.appendChild(fragment);
}

function renderTransactions(root, transactions) {
  const listElement = root.querySelector("#transaction-list");

  if (!listElement) {
    return;
  }

  if (!Array.isArray(transactions) || transactions.length === 0) {
    listElement.innerHTML = `
      <div class="empty-panel compact-empty">
        <p class="empty-title">No transactions yet</p>
        <p>Your recorded income and expenses will appear here.</p>
      </div>
    `;
    return;
  }

  const documentRef = root.ownerDocument ?? root;
  const fragment = documentRef.createDocumentFragment();

  for (const transaction of [...transactions].reverse()) {
    const item = documentRef.createElement("article");
    item.className = "budget-card";
    const sign = transaction.type === "income" ? "+" : "-";
    const toneClass = transaction.type === "income" ? "text-green" : "text-red";
    const category = findTransactionCategory(transaction.type, transaction.category);
    item.innerHTML = `
      <div class="transaction-leading">
        <span class="transaction-category-icon"><i data-lucide="${category?.icon ?? "circle-ellipsis"}" aria-hidden="true"></i></span>
        <span>
          <h3>${escapeHtml(category?.label ?? "Other")}</h3>
          <p class="budget-meta">${escapeHtml(transaction.description || transaction.date)}</p>
          ${transaction.description ? `<p class="budget-meta">${escapeHtml(transaction.date)}</p>` : ""}
        </span>
      </div>
      <div class="budget-amount ${toneClass}">${sign}${formatCurrency(transaction.amountCents)}</div>
    `;
    fragment.appendChild(item);
  }

  listElement.innerHTML = "";
  listElement.appendChild(fragment);
}

function syncQuickActions(root, transactions) {
  const hasTransactions = transactions.length > 0;
  const helper = root.querySelector("#quick-actions-help");

  const deleteButton = root.querySelector('[data-action="delete-transaction"]');

  if (deleteButton) {
    deleteButton.disabled = !hasTransactions;
  }

  if (helper) {
    helper.textContent = hasTransactions
      ? "Add or remove a transaction."
      : "Add income or an expense. There are no transactions to delete yet.";
  }
}

function requireElement(root, selector) {
  const element = root.querySelector(selector);

  if (!element) {
    throw new Error(`Dashboard markup is missing the ${selector} element.`);
  }

  return element;
}

function formatCurrency(cents) {
  return currencyFormatter.format(cents / 100);
}

function getBalanceNote(openingBalanceCents = 0) {
  return openingBalanceCents === 0
    ? "Based on recorded income and expenses"
    : "Includes your saved opening balance";
}

function getCurrentMonthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function createBudgetId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `budget-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createTransactionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `transaction-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatMonthLabel(monthKey) {
  if (typeof monthKey !== "string" || !/^\d{4}-\d{2}$/.test(monthKey)) {
    return "Month";
  }

  const date = new Date(`${monthKey}-01T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return "Month";
  }

  return monthFormatter.format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
