const STORAGE_KEY = "finova:state";
const CURRENT_SCHEMA_VERSION = 2;
const MIN_TRANSACTION_YEAR = 1900;
const MAX_TRANSACTION_YEAR = 2100;

export class FinanceStorageError extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    this.name = "FinanceStorageError";
    this.code = code;
  }
}

export function loadState() {
  const storage = getStorage();
  let savedState;

  try {
    savedState = storage.getItem(STORAGE_KEY);
  } catch (cause) {
    throw storageUnavailableError(cause);
  }

  if (savedState === null) {
    return createEmptyState();
  }

  let state;

  try {
    state = JSON.parse(savedState);
  } catch (cause) {
    throw new FinanceStorageError(
      "INVALID_JSON",
      "Saved finance data is not valid JSON. It has not been overwritten.",
      cause,
    );
  }

  validateState(state);

  if (state.schemaVersion === 1) {
    state = migrateLegacyState(state);
    saveState(state);
  }

  return state;
}

export function saveState(state) {
  validateState(state);

  let serializedState;

  try {
    serializedState = JSON.stringify(state);
  } catch (cause) {
    throw new FinanceStorageError(
      "INVALID_STATE",
      "Finance data could not be serialized for storage.",
      cause,
    );
  }

  const storage = getStorage();

  try {
    storage.setItem(STORAGE_KEY, serializedState);
  } catch (cause) {
    if (isQuotaError(cause)) {
      throw new FinanceStorageError(
        "STORAGE_QUOTA_EXCEEDED",
        "Browser storage is full. Remove saved data or export it before saving again.",
        cause,
      );
    }

    throw storageUnavailableError(cause);
  }
}

function createEmptyState() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    activeProfileId: null,
    profiles: [],
  };
}

function validateState(state) {
  if (state === null || typeof state !== "object" || Array.isArray(state)) {
    invalidState("state", "expected an object");
  }

  if (!Number.isInteger(state.schemaVersion)) {
    invalidState("schemaVersion", "expected an integer");
  }

  if (state.schemaVersion !== 1 && state.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new FinanceStorageError(
      "UNSUPPORTED_SCHEMA_VERSION",
      `Saved finance data uses schema version ${state.schemaVersion}; this app supports version ${CURRENT_SCHEMA_VERSION}.`,
    );
  }

  if (state.schemaVersion === 1) {
    validateLegacyState(state);
    return;
  }

  if (!Array.isArray(state.profiles)) {
    invalidState("profiles", "expected an array");
  }

  const profileIds = new Set();
  for (const [index, profile] of state.profiles.entries()) {
    validateProfile(profile, index, profileIds);
  }

  if (state.profiles.length === 0) {
    if (state.activeProfileId !== null) {
      invalidState("activeProfileId", "must be null when there are no profiles");
    }
  } else if (!profileIds.has(state.activeProfileId)) {
    invalidState("activeProfileId", "does not match a saved profile");
  }
}

function validateLegacyState(state) {
  if (!Array.isArray(state.accounts) || !Array.isArray(state.transactions)) {
    invalidState("state", "legacy data must include accounts and transactions arrays");
  }

  for (const [index, account] of state.accounts.entries()) {
    if (account === null || typeof account !== "object" || Array.isArray(account)) {
      invalidState(`accounts[${index}]`, "expected an object");
    }

    requireNonEmptyString(account.id, `accounts[${index}].id`);
    requireNonEmptyString(account.name, `accounts[${index}].name`);
    if (!Number.isSafeInteger(account.openingBalanceCents)) {
      invalidState(
        `accounts[${index}].openingBalanceCents`,
        "expected a safe integer amount in cents",
      );
    }
  }

  const accountIds = new Set(state.accounts.map((account) => account.id));
  const transactionIds = new Set();
  for (const [index, transaction] of state.transactions.entries()) {
    const path = `transactions[${index}]`;
    if (transaction === null || typeof transaction !== "object" || Array.isArray(transaction)) {
      invalidState(path, "expected an object");
    }

    requireNonEmptyString(transaction.id, `${path}.id`);
    requireNonEmptyString(transaction.accountId, `${path}.accountId`);
    if (!accountIds.has(transaction.accountId)) {
      invalidState(`${path}.accountId`, "does not match a saved account");
    }
    if (transactionIds.has(transaction.id)) {
      invalidState(`${path}.id`, "must be unique");
    }
    transactionIds.add(transaction.id);
    validateTransactionFields(transaction, path, false);
  }

  for (const [index, budget] of (Array.isArray(state.budgets) ? state.budgets : []).entries()) {
    validateBudget(budget, index);
  }
}

function migrateLegacyState(state) {
  const openingBalanceCents = state.accounts.reduce((total, account) => {
    const nextTotal = total + account.openingBalanceCents;
    if (!Number.isSafeInteger(nextTotal)) {
      invalidState("accounts", "combined opening balance exceeds the safe integer range");
    }
    return nextTotal;
  }, 0);

  const profile = {
    id: "default-profile",
    name: "Me",
    openingBalanceCents,
    transactions: state.transactions.map(({ accountId, ...transaction }) => ({
      ...transaction,
      category: "other",
      description: "",
    })),
    budgets: Array.isArray(state.budgets) ? state.budgets : [],
  };

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    activeProfileId: profile.id,
    profiles: [profile],
  };
}

function validateProfile(profile, index, profileIds) {
  const path = `profiles[${index}]`;

  if (profile === null || typeof profile !== "object" || Array.isArray(profile)) {
    invalidState(path, "expected an object");
  }

  requireNonEmptyString(profile.id, `${path}.id`);
  requireNonEmptyString(profile.name, `${path}.name`);
  if (!Number.isSafeInteger(profile.openingBalanceCents)) {
    invalidState(`${path}.openingBalanceCents`, "expected a safe integer amount in cents");
  }

  if (profileIds.has(profile.id)) {
    invalidState(`${path}.id`, "must be unique");
  }
  profileIds.add(profile.id);

  if (!Array.isArray(profile.transactions)) {
    invalidState(`${path}.transactions`, "expected an array");
  }
  if (!Array.isArray(profile.budgets)) {
    invalidState(`${path}.budgets`, "expected an array");
  }

  const transactionIds = new Set();
  for (const [transactionIndex, transaction] of profile.transactions.entries()) {
    const transactionPath = `${path}.transactions[${transactionIndex}]`;
    validateTransactionFields(transaction, transactionPath, true);
    if (transactionIds.has(transaction.id)) {
      invalidState(`${transactionPath}.id`, "must be unique within its profile");
    }
    transactionIds.add(transaction.id);
  }

  for (const [budgetIndex, budget] of profile.budgets.entries()) {
    validateBudget(budget, budgetIndex, `${path}.budgets`);
  }
}

function validateTransactionFields(transaction, path, includeCategory) {
  if (transaction === null || typeof transaction !== "object" || Array.isArray(transaction)) {
    invalidState(path, "expected an object");
  }

  requireNonEmptyString(transaction.id, `${path}.id`);

  if (transaction.type !== "income" && transaction.type !== "expense") {
    invalidState(`${path}.type`, "expected income or expense");
  }

  if (includeCategory) {
    requireNonEmptyString(transaction.category, `${path}.category`);
    if (typeof transaction.description !== "string") {
      invalidState(`${path}.description`, "expected a string");
    }
  }

  if (!Number.isSafeInteger(transaction.amountCents) || transaction.amountCents <= 0) {
    invalidState(`${path}.amountCents`, "expected a positive safe integer amount in cents");
  }

  if (!isCalendarDate(transaction.date)) {
    invalidState(
      `${path}.date`,
      `expected a valid date in YYYY-MM-DD format between ${MIN_TRANSACTION_YEAR} and ${MAX_TRANSACTION_YEAR}`,
    );
  }
}

function validateBudget(budget, index, parentPath = "budgets") {
  const path = `${parentPath}[${index}]`;

  if (budget === null || typeof budget !== "object" || Array.isArray(budget)) {
    invalidState(path, "expected an object");
  }

  requireNonEmptyString(budget.id, `${path}.id`);
  requireNonEmptyString(budget.name, `${path}.name`);

  if (!Number.isSafeInteger(budget.amountCents) || budget.amountCents <= 0) {
    invalidState(`${path}.amountCents`, "expected a positive safe integer amount in cents");
  }

  if (!isMonthKey(budget.month)) {
    invalidState(
      `${path}.month`,
      `expected a valid month in YYYY-MM format between ${MIN_TRANSACTION_YEAR} and ${MAX_TRANSACTION_YEAR}`,
    );
  }
}

function requireNonEmptyString(value, path) {
  if (typeof value !== "string" || value.trim() === "") {
    invalidState(path, "expected a non-empty string");
  }
}

function isCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const year = Number(value.slice(0, 4));

  if (year < MIN_TRANSACTION_YEAR || year > MAX_TRANSACTION_YEAR) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
}

function isMonthKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) {
    return false;
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));

  if (year < MIN_TRANSACTION_YEAR || year > MAX_TRANSACTION_YEAR) {
    return false;
  }

  return month >= 1 && month <= 12;
}

function invalidState(path, reason) {
  throw new FinanceStorageError("INVALID_STATE", `Invalid finance data at ${path}: ${reason}.`);
}

function getStorage() {
  try {
    const storage = globalThis.localStorage;

    if (
      !storage ||
      typeof storage.getItem !== "function" ||
      typeof storage.setItem !== "function"
    ) {
      throw new Error("Browser storage is not available.");
    }

    return storage;
  } catch (cause) {
    throw storageUnavailableError(cause);
  }
}

function storageUnavailableError(cause) {
  return new FinanceStorageError(
    "STORAGE_UNAVAILABLE",
    "Browser storage is unavailable or blocked. Finance data could not be saved or loaded.",
    cause,
  );
}

function isQuotaError(error) {
  return error?.name === "QuotaExceededError" || error?.code === 22 || error?.code === 1014;
}
