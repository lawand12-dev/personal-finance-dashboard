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
  balanceNoteElement.textContent = getBalanceNote(state.accounts.length);
  monthlyValues[0].textContent = formatCurrency(summary.monthlyIncomeCents);
  monthlyValues[1].textContent = formatCurrency(summary.monthlyExpenseCents);
  renderBudgets(root, state.budgets ?? []);
  renderAccounts(root, state.accounts ?? []);
  renderTransactions(root, state.transactions ?? [], state.accounts ?? []);
  renderTransactionDeleteChoices(root, state.transactions ?? [], state.accounts ?? []);
  syncAccountSelect(root, state.accounts ?? []);
  syncQuickActions(root, state.accounts ?? [], state.transactions ?? []);
}

export function renderTransactionDeleteChoices(root, transactions, accounts) {
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
  const accountMap = new Map((accounts ?? []).map((account) => [account.id, account.name]));
  const fragment = documentRef.createDocumentFragment();

  for (const transaction of [...transactions].reverse()) {
    const item = documentRef.createElement("li");
    const button = documentRef.createElement("button");
    const details = documentRef.createElement("span");
    const amount = documentRef.createElement("span");
    const type = transaction.type === "income" ? "Income" : "Expense";

    item.className = "delete-transaction-item";
    button.className = "delete-transaction-option";
    button.type = "button";
    button.dataset.transactionId = transaction.id;
    details.className = "delete-transaction-details";
    details.textContent = `${type} · ${accountMap.get(transaction.accountId) ?? "Unknown account"} · ${transaction.date}`;
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

export function bindAccountForm(root = document, onAddAccount) {
  const form = root.querySelector("#account-form");

  if (!form || form.dataset.bound === "true") {
    return;
  }

  form.dataset.bound = "true";

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const balanceValue = Number.parseFloat(String(formData.get("balance") ?? ""));

    if (!name || !Number.isFinite(balanceValue)) {
      form.reportValidity?.();
      return;
    }

    const nextAccount = {
      id: createAccountId(),
      name,
      openingBalanceCents: Math.round(balanceValue * 100),
    };

    onAddAccount?.(nextAccount);
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

    const accountSelect = form.querySelector('select[name="accountId"]');
    const formData = new FormData(form);
    const accountId = String(formData.get("accountId") ?? "").trim();
    const typeValue = String(formData.get("type") ?? "expense");
    const amountValue = Number.parseFloat(String(formData.get("amount") ?? ""));
    const dateValue = String(formData.get("date") ?? "").trim();

    if (!accountId || !dateValue || !Number.isFinite(amountValue) || amountValue <= 0) {
      form.reportValidity?.();
      return;
    }

    const nextTransaction = {
      id: createTransactionId(),
      accountId,
      type: typeValue === "income" ? "income" : "expense",
      amountCents: Math.round(amountValue * 100),
      date: dateValue,
    };

    onAddTransaction?.(nextTransaction);
    form.reset();
    if (accountSelect) {
      accountSelect.value = accountId;
    }
  });
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

  if (state === null || typeof state !== "object" || !Array.isArray(state.accounts)) {
    throw new TypeError("Dashboard state must contain an accounts array.");
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

function renderAccounts(root, accounts) {
  const listElement = root.querySelector("#account-list");

  if (!listElement) {
    return;
  }

  if (!Array.isArray(accounts) || accounts.length === 0) {
    listElement.innerHTML = `
      <div class="empty-panel compact-empty">
        <p class="empty-title">No accounts yet</p>
        <p>Your linked account balances will appear here.</p>
      </div>
    `;
    return;
  }

  const documentRef = root.ownerDocument ?? root;
  const fragment = documentRef.createDocumentFragment();

  for (const account of accounts) {
    const item = documentRef.createElement("article");
    item.className = "budget-card";
    item.innerHTML = `
      <div>
        <h3>${escapeHtml(account.name)}</h3>
        <p class="budget-meta">Account</p>
      </div>
      <div class="budget-amount">${formatCurrency(account.openingBalanceCents)}</div>
    `;
    fragment.appendChild(item);
  }

  listElement.innerHTML = "";
  listElement.appendChild(fragment);
}

function renderTransactions(root, transactions, accounts) {
  const listElement = root.querySelector("#transaction-list");

  if (!listElement) {
    return;
  }

  if (!Array.isArray(transactions) || transactions.length === 0) {
    listElement.innerHTML = `
      <div class="empty-panel compact-empty">
        <p class="empty-title">No transactions yet</p>
        <p>Your recent account activity will appear here.</p>
      </div>
    `;
    return;
  }

  const accountMap = new Map((accounts ?? []).map((account) => [account.id, account.name]));
  const documentRef = root.ownerDocument ?? root;
  const fragment = documentRef.createDocumentFragment();

  for (const transaction of [...transactions].reverse()) {
    const item = documentRef.createElement("article");
    item.className = "budget-card";
    const sign = transaction.type === "income" ? "+" : "-";
    const toneClass = transaction.type === "income" ? "text-green" : "text-red";
    item.innerHTML = `
      <div>
        <h3>${escapeHtml(accountMap.get(transaction.accountId) ?? "Unknown account")}</h3>
        <p class="budget-meta">${escapeHtml(transaction.type)} • ${escapeHtml(transaction.date)}</p>
      </div>
      <div class="budget-amount ${toneClass}">${sign}${formatCurrency(transaction.amountCents)}</div>
    `;
    fragment.appendChild(item);
  }

  listElement.innerHTML = "";
  listElement.appendChild(fragment);
}

function syncAccountSelect(root, accounts) {
  const form = root.querySelector("#transaction-form");

  if (!form) {
    return;
  }

  const select = form.querySelector('select[name="accountId"]');

  if (!select) {
    return;
  }

  const currentValue = select.value;
  const nextAccounts = accounts ?? [];
  const options = [
    '<option value="">Select an account</option>',
    ...nextAccounts.map(
      (account) => `<option value="${escapeHtml(account.id)}">${escapeHtml(account.name)}</option>`,
    ),
  ];

  select.innerHTML = options.join("");
  select.disabled = nextAccounts.length === 0;

  if (nextAccounts.length === 1) {
    select.value = nextAccounts[0].id;
    return;
  }

  if (currentValue && nextAccounts.some((account) => account.id === currentValue)) {
    select.value = currentValue;
  }
}

function syncQuickActions(root, accounts, transactions) {
  const hasAccounts = accounts.length > 0;
  const hasTransactions = transactions.length > 0;
  const helper = root.querySelector("#quick-actions-help");

  root
    .querySelectorAll('[data-action="add-income"], [data-action="add-expense"]')
    .forEach((button) => {
      button.disabled = !hasAccounts;
    });

  const deleteButton = root.querySelector('[data-action="delete-transaction"]');

  if (deleteButton) {
    deleteButton.disabled = !hasTransactions;
  }

  if (helper) {
    helper.textContent = hasAccounts
      ? hasTransactions
        ? "Add or remove a transaction."
        : "No transactions to delete."
      : "Add an account before adding transactions.";
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

function getBalanceNote(accountCount) {
  if (accountCount === 0) {
    return "No accounts added yet";
  }

  return `Across ${accountCount} ${accountCount === 1 ? "account" : "accounts"}`;
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

function createAccountId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `account-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
