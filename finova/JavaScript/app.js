import {
  Activity,
  BriefcaseBusiness,
  CarFront,
  ChartNoAxesColumnIncreasing,
  CircleEllipsis,
  Clapperboard,
  createIcons,
  Gift,
  HandCoins,
  HeartPulse,
  House,
  Laptop,
  Plus,
  ReceiptText,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  TrendingDown,
  TrendingUp,
  Utensils,
  X,
} from "lucide";
import { loadState, saveState } from "./data/storage.js";
import { calculateDashboardSummary, removeTransactionById } from "./domain/finance.js";
import {
  bindBudgetForm,
  bindTransactionForm,
  renderDashboard,
  syncTransactionCategories,
} from "./ui/dashboard.js";
import { bindPageNavigation } from "./ui/navigation.js";

const currentMonth = getCurrentMonthKey(new Date());
const iconSet = {
  Activity,
  BriefcaseBusiness,
  CarFront,
  ChartNoAxesColumnIncreasing,
  CircleEllipsis,
  Clapperboard,
  Gift,
  HandCoins,
  HeartPulse,
  House,
  Laptop,
  Plus,
  ReceiptText,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  TrendingDown,
  TrendingUp,
  Utensils,
  X,
};

function getCurrentMonthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function initializeApp() {
  bindPageNavigation(document);

  let workspace;
  try {
    workspace = loadState();
  } catch (error) {
    console.warn("Could not load saved finance data. Resetting to an empty dashboard.", error);
    workspace = { schemaVersion: 2, activeProfileId: null, profiles: [] };
  }

  const getActiveProfile = () =>
    workspace.profiles.find((profile) => profile.id === workspace.activeProfileId) ?? null;

  const render = () => {
    const profile = getActiveProfile();
    const viewState = profile ?? { openingBalanceCents: 0, transactions: [], budgets: [] };
    const summary = calculateDashboardSummary(viewState, currentMonth);
    renderDashboard(summary, viewState, document);
    renderProfileOptions(document, workspace);
    document
      .querySelectorAll('[data-action="add-income"], [data-action="add-expense"]')
      .forEach((button) => {
        button.disabled = !profile;
      });
    createIcons({ icons: iconSet });
  };

  const commitWorkspace = (nextWorkspace) => {
    workspace = nextWorkspace;
    saveState(workspace);
    render();
  };

  const commitProfile = (nextProfile) => {
    commitWorkspace({
      ...workspace,
      profiles: workspace.profiles.map((profile) =>
        profile.id === nextProfile.id ? nextProfile : profile,
      ),
    });
  };

  const transactionDialog = document.querySelector("#transaction-dialog");
  const deleteDialog = document.querySelector("#delete-dialog");
  const profileDialog = document.querySelector("#profile-dialog");
  const actionStatus = document.querySelector("#action-status");

  document.querySelectorAll(".app-dialog").forEach((dialog) => {
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dialog.close();
      }
    });
  });

  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => button.closest("dialog")?.close());
  });

  bindBudgetForm(document, (budget) => {
    const profile = getActiveProfile();
    if (profile) {
      commitProfile({ ...profile, budgets: [...profile.budgets, budget] });
    }
  });

  bindTransactionForm(document, (transaction) => {
    const profile = getActiveProfile();
    if (profile) {
      commitProfile({ ...profile, transactions: [...profile.transactions, transaction] });
    }
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
      const detailLabel = document.querySelector("#transaction-detail-label");

      if (!form || !transactionDialog || !getActiveProfile()) {
        return;
      }

      form.reset();
      syncTransactionCategories(document, type);

      if (typeField) {
        typeField.value = type;
      }
      if (detailLabel) {
        detailLabel.textContent = type === "expense" ? "What did you buy?" : "Source or note";
      }
      if (dateField) {
        dateField.value = getTodayDateString();
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
      amountField?.focus();
    },
    openDeletePicker() {
      if (!deleteDialog || !getActiveProfile()?.transactions.length) {
        return;
      }

      resetDeleteDialog(document);
      deleteDialog.showModal();
      document.querySelector("#delete-transaction-list button")?.focus();
    },
  });

  bindTransactionDeletion(document, {
    getState: getActiveProfile,
    commitState: commitProfile,
  });
  bindProfileControls(document, { getWorkspace: () => workspace, commitWorkspace });

  render();
  if (!workspace.profiles.length && profileDialog?.showModal) {
    profileDialog.showModal();
    document.querySelector('#profile-form input[name="name"]')?.focus();
  }
}

function renderProfileOptions(root, workspace) {
  const select = root.querySelector("#profile-select");
  if (!select) {
    return;
  }

  select.innerHTML = workspace.profiles
    .map(
      (profile) => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.name)}</option>`,
    )
    .join("");
  select.disabled = workspace.profiles.length === 0;
  select.value = workspace.activeProfileId ?? "";
}

function bindProfileControls(root, { getWorkspace, commitWorkspace }) {
  const select = root.querySelector("#profile-select");
  const addButton = root.querySelector("#add-profile");
  const dialog = root.querySelector("#profile-dialog");
  const form = root.querySelector("#profile-form");
  const nameField = form?.querySelector('input[name="name"]');
  const actionStatus = root.querySelector("#action-status");

  if (!select || !addButton || !dialog || !form || !nameField) {
    return;
  }

  select.addEventListener("change", () => {
    const workspace = getWorkspace();
    if (workspace.profiles.some((profile) => profile.id === select.value)) {
      commitWorkspace({ ...workspace, activeProfileId: select.value });
    }
  });

  addButton.addEventListener("click", () => {
    form.reset();
    dialog.showModal();
    nameField.focus();
  });

  dialog.addEventListener("close", () => addButton.focus());

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = String(new FormData(form).get("name") ?? "").trim();
    if (!name) {
      nameField.focus();
      form.reportValidity?.();
      return;
    }

    const workspace = getWorkspace();
    const profile = {
      id: createProfileId(),
      name,
      openingBalanceCents: 0,
      transactions: [],
      budgets: [],
    };
    commitWorkspace({
      ...workspace,
      activeProfileId: profile.id,
      profiles: [...workspace.profiles, profile],
    });
    dialog.close();
    if (actionStatus) {
      actionStatus.textContent = `${name} profile created.`;
    }
  });
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

function createProfileId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `profile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

initializeApp();
