import {
  Activity,
  ChartNoAxesColumnIncreasing,
  createIcons,
  House,
  Plus,
  TrendingDown,
  TrendingUp,
  Trash2,
  WalletCards,
  X,
} from "lucide";
import { loadState, saveState } from "./data/storage.js";
import { calculateDashboardSummary, removeTransactionById } from "./domain/finance.js";
import {
  bindAccountForm,
  bindBudgetForm,
  bindTransactionForm,
  renderDashboard,
} from "./ui/dashboard.js";
import { bindPageNavigation } from "./ui/navigation.js";

const currentMonth = getCurrentMonthKey(new Date());

function getCurrentMonthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function initializeApp() {
  createIcons({
    icons: {
      Activity,
      ChartNoAxesColumnIncreasing,
      House,
      Plus,
      TrendingDown,
      TrendingUp,
      Trash2,
      WalletCards,
      X,
    },
  });
  bindPageNavigation(document);

  let state;

  try {
    state = loadState();
  } catch (error) {
    console.warn("Could not load saved finance data. Resetting to an empty dashboard.", error);
    state = {
      schemaVersion: 1,
      accounts: [],
      transactions: [],
      budgets: [],
    };
  }

  state = {
    schemaVersion: 1,
    accounts: Array.isArray(state.accounts) ? state.accounts : [],
    transactions: Array.isArray(state.transactions) ? state.transactions : [],
    budgets: Array.isArray(state.budgets) ? state.budgets : [],
  };

  const render = () => {
    const summary = calculateDashboardSummary(state, currentMonth);
    renderDashboard(summary, state, document);
  };

  const commitState = (nextState) => {
    state = nextState;
    saveState(state);
    render();
  };

  const transactionDialog = document.querySelector("#transaction-dialog");
  const deleteDialog = document.querySelector("#delete-dialog");
  const actionStatus = document.querySelector("#action-status");

  document.querySelectorAll(".app-dialog").forEach((dialog) => {
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dialog.close();
      }
    });
  });

  bindBudgetForm(document, (budget) => {
    commitState({
      ...state,
      budgets: [...state.budgets, budget],
    });
  });

  bindAccountForm(document, (account) => {
    commitState({
      ...state,
      accounts: [...state.accounts, account],
    });
  });

  bindTransactionForm(document, (transaction) => {
    commitState({
      ...state,
      transactions: [...state.transactions, transaction],
    });
    transactionDialog?.close();
    if (actionStatus) {
      actionStatus.textContent = `${capitalize(transaction.type)} added.`;
    }
  });

  bindQuickActions(document, {
    openTransactionForm(type) {
      const form = document.querySelector("#transaction-form");
      const typeField = form?.querySelector('input[name="type"]');
      const dateField = form?.querySelector('input[name="date"]');
      const amountField = form?.querySelector('input[name="amount"]');
      const accountSelect = form?.querySelector('select[name="accountId"]');

      if (!form || !transactionDialog || state.accounts.length === 0) {
        return;
      }

      form.reset();

      if (typeField) {
        typeField.value = type;
      }

      if (dateField) {
        dateField.value = getTodayDateString();
      }

      if (state.accounts.length === 1 && accountSelect) {
        accountSelect.value = state.accounts[0].id;
      }

      const title = document.querySelector("#transaction-dialog-title");
      const submitButton = form.querySelector('button[type="submit"]');
      const actionLabel = `Add ${type}`;

      if (title) {
        title.textContent = actionLabel;
      }

      if (submitButton) {
        submitButton.textContent = actionLabel;
      }

      transactionDialog.showModal();
      (state.accounts.length > 1 ? accountSelect : amountField)?.focus();
    },
    openDeletePicker() {
      if (!deleteDialog || state.transactions.length === 0) {
        return;
      }

      resetDeleteDialog(document);
      deleteDialog.showModal();
      document.querySelector("#delete-transaction-list button")?.focus();
    },
  });

  bindTransactionDeletion(document, {
    getState: () => state,
    commitState,
  });

  render();
}

function bindQuickActions(root, actions) {
  const trigger = root.querySelector(".nav-add");
  const dialog = root.querySelector("#quick-actions-dialog");

  if (!trigger || !dialog) {
    return;
  }

  dialog.addEventListener("close", () => {
    trigger.setAttribute("aria-expanded", "false");
    trigger.focus();
  });

  trigger.addEventListener("click", () => {
    dialog.showModal();
    trigger.setAttribute("aria-expanded", "true");
    dialog.querySelector("[data-action]:not(:disabled)")?.focus();
  });

  dialog.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => dialog.close());
  });

  dialog.querySelectorAll(".quick-action").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      dialog.close();

      if (action === "add-income" || action === "add-expense") {
        actions.openTransactionForm(action === "add-income" ? "income" : "expense");
      } else if (action === "delete-transaction") {
        actions.openDeletePicker();
      }
    });
  });
}

function bindTransactionDeletion(root, { getState, commitState }) {
  const dialog = root.querySelector("#delete-dialog");
  const picker = root.querySelector("#delete-picker");
  const confirmation = root.querySelector("#delete-confirmation");
  const list = root.querySelector("#delete-transaction-list");
  const summary = root.querySelector("#delete-transaction-summary");
  const cancelButton = root.querySelector("#cancel-transaction-delete");
  const confirmButton = root.querySelector("#confirm-transaction-delete");
  const trigger = root.querySelector(".nav-add");
  const actionStatus = root.querySelector("#action-status");
  let selectedTransactionId = null;

  if (!dialog || !picker || !confirmation || !list || !summary || !cancelButton || !confirmButton) {
    return;
  }

  dialog.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => dialog.close());
  });

  dialog.addEventListener("close", () => {
    resetDeleteDialog(root);
    trigger?.focus();
  });

  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-transaction-id]");

    if (!button) {
      return;
    }

    selectedTransactionId = button.dataset.transactionId;
    summary.textContent = button.textContent;
    picker.hidden = true;
    confirmation.hidden = false;
    cancelButton.focus();
  });

  cancelButton.addEventListener("click", () => {
    confirmation.hidden = true;
    picker.hidden = false;
    const selectedButton = [...list.querySelectorAll("[data-transaction-id]")].find(
      (button) => button.dataset.transactionId === selectedTransactionId,
    );
    selectedButton?.focus();
  });

  confirmButton.addEventListener("click", () => {
    if (!selectedTransactionId) {
      return;
    }

    const state = getState();
    const transactions = removeTransactionById(state.transactions, selectedTransactionId);

    if (transactions.length === state.transactions.length) {
      return;
    }

    commitState({ ...state, transactions });
    dialog.close();
    if (actionStatus) {
      actionStatus.textContent = "Transaction deleted.";
    }
  });
}

function resetDeleteDialog(root) {
  const picker = root.querySelector("#delete-picker");
  const confirmation = root.querySelector("#delete-confirmation");
  const summary = root.querySelector("#delete-transaction-summary");

  if (picker) {
    picker.hidden = false;
  }

  if (confirmation) {
    confirmation.hidden = true;
  }

  if (summary) {
    summary.textContent = "";
  }
}

function capitalize(value) {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

initializeApp();
