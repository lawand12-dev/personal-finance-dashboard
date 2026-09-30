const STORAGE_KEY = "finova:state";
const CURRENT_SCHEMA_VERSION = 1;
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
    accounts: [],
    transactions: [],
    budgets: [],
  };
}

function normalizeState(state) {
  if (state === null || typeof state !== "object" || Array.isArray(state)) {
    invalidState("state", "expected an object");
  }

  if (!Array.isArray(state.accounts)) {
    state.accounts = [];
  }

  if (!Array.isArray(state.transactions)) {
    state.transactions = [];
  }

  if (!Array.isArray(state.budgets)) {
    state.budgets = [];
  }

  return state;
}

function validateState(state) {
  normalizeState(state);

  if (!Number.isInteger(state.schemaVersion)) {
    invalidState("schemaVersion", "expected an integer");
  }

  if (state.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new FinanceStorageError(
      "UNSUPPORTED_SCHEMA_VERSION",
      `Saved finance data uses schema version ${state.schemaVersion}; this app supports version ${CURRENT_SCHEMA_VERSION}.`,
    );
  }

  const accountIds = new Set();

  for (const [index, account] of state.accounts.entries()) {
    validateAccount(account, index, accountIds);
  }

  const transactionIds = new Set();

  for (const [index, transaction] of state.transactions.entries()) {
    validateTransaction(transaction, index, accountIds, transactionIds);
  }

  for (const [index, budget] of state.budgets.entries()) {
    validateBudget(budget, index);
  }
}

function validateAccount(account, index, accountIds) {
  const path = `accounts[${index}]`;

  if (account === null || typeof account !== "object" || Array.isArray(account)) {
    invalidState(path, "expected an object");
  }

  requireNonEmptyString(account.id, `${path}.id`);
  requireNonEmptyString(account.name, `${path}.name`);

  if (!Number.isSafeInteger(account.openingBalanceCents)) {
    invalidState(`${path}.openingBalanceCents`, "expected a safe integer amount in cents");
  }

  if (accountIds.has(account.id)) {
    invalidState(`${path}.id`, "must be unique");
  }

  accountIds.add(account.id);
}

function validateTransaction(transaction, index, accountIds, transactionIds) {
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

  if (transaction.type !== "income" && transaction.type !== "expense") {
    invalidState(`${path}.type`, "expected income or expense");
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

function validateBudget(budget, index) {
  const path = `budgets[${index}]`;

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
