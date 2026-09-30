import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { loadState, saveState } from "./storage.js";

const storedValues = new Map();
let storageError;
const storageMock = {
  getItem(key) {
    if (storageError) {
      throw storageError;
    }

    return storedValues.get(key) ?? null;
  },
  setItem(key, value) {
    if (storageError) {
      throw storageError;
    }

    storedValues.set(key, String(value));
  },
};

let originalStorageDescriptor;

beforeEach(() => {
  storedValues.clear();
  storageError = undefined;
  originalStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storageMock,
  });
});

afterEach(() => {
  if (originalStorageDescriptor) {
    Object.defineProperty(globalThis, "localStorage", originalStorageDescriptor);
  } else {
    delete globalThis.localStorage;
  }
});

test("returns a versioned empty state when nothing has been saved", () => {
  assert.deepEqual(loadState(), {
    schemaVersion: 1,
    accounts: [],
    transactions: [],
    budgets: [],
  });
});

test("saves and loads budgets with accounts and transactions", () => {
  const state = {
    schemaVersion: 1,
    accounts: [{ id: "account-1", name: "Checking", openingBalanceCents: 125000 }],
    transactions: [
      {
        id: "transaction-1",
        accountId: "account-1",
        type: "expense",
        amountCents: 4250,
        date: "2026-09-30",
      },
    ],
    budgets: [
      {
        id: "budget-1",
        name: "Groceries",
        amountCents: 60000,
        month: "2026-09",
      },
    ],
  };

  saveState(state);

  assert.deepEqual(loadState(), state);
});

test("saves and loads accounts and transactions", () => {
  const state = {
    schemaVersion: 1,
    accounts: [{ id: "account-1", name: "Checking", openingBalanceCents: 125000 }],
    transactions: [
      {
        id: "transaction-1",
        accountId: "account-1",
        type: "expense",
        amountCents: 4250,
        date: "2026-09-30",
      },
    ],
  };

  saveState(state);

  assert.deepEqual(loadState(), state);
});

test("rejects malformed saved JSON instead of silently replacing it", () => {
  storageMock.setItem("finova:state", "{");

  assert.throws(() => loadState(), { code: "INVALID_JSON" });
});

test("rejects state from an unsupported schema version", () => {
  storageMock.setItem(
    "finova:state",
    JSON.stringify({ schemaVersion: 2, accounts: [], transactions: [] }),
  );

  assert.throws(() => loadState(), { code: "UNSUPPORTED_SCHEMA_VERSION" });
});

test("reports the exact path of an invalid account field", () => {
  storageMock.setItem(
    "finova:state",
    JSON.stringify({
      schemaVersion: 1,
      accounts: [{ id: "account-1", name: "", openingBalanceCents: 125000 }],
      transactions: [],
    }),
  );

  assert.throws(() => loadState(), {
    code: "INVALID_STATE",
    message: /accounts\[0\]\.name/,
  });
});

test("reports the exact path of an invalid transaction field", () => {
  storageMock.setItem(
    "finova:state",
    JSON.stringify({
      schemaVersion: 1,
      accounts: [{ id: "account-1", name: "Checking", openingBalanceCents: 125000 }],
      transactions: [
        {
          id: "transaction-1",
          accountId: "account-1",
          type: "transfer",
          amountCents: 4250,
          date: "2026-09-30",
        },
      ],
    }),
  );

  assert.throws(() => loadState(), {
    code: "INVALID_STATE",
    message: /transactions\[0\]\.type/,
  });
});

test("rejects transactions that reference an unknown account", () => {
  storageMock.setItem(
    "finova:state",
    JSON.stringify({
      schemaVersion: 1,
      accounts: [],
      transactions: [
        {
          id: "transaction-1",
          accountId: "missing-account",
          type: "expense",
          amountCents: 4250,
          date: "2026-09-30",
        },
      ],
    }),
  );

  assert.throws(() => loadState(), {
    code: "INVALID_STATE",
    message: /transactions\[0\]\.accountId/,
  });
});

test("accepts transaction dates at the supported year boundaries", () => {
  const state = {
    schemaVersion: 1,
    accounts: [{ id: "account-1", name: "Checking", openingBalanceCents: 125000 }],
    transactions: [
      {
        id: "transaction-1",
        accountId: "account-1",
        type: "expense",
        amountCents: 100,
        date: "1900-01-01",
      },
      {
        id: "transaction-2",
        accountId: "account-1",
        type: "income",
        amountCents: 100,
        date: "2100-12-31",
      },
    ],
  };

  assert.doesNotThrow(() => saveState(state));
});

test("rejects transaction dates before the supported year range", () => {
  const state = {
    schemaVersion: 1,
    accounts: [{ id: "account-1", name: "Checking", openingBalanceCents: 125000 }],
    transactions: [
      {
        id: "transaction-1",
        accountId: "account-1",
        type: "expense",
        amountCents: 100,
        date: "1899-12-31",
      },
    ],
  };

  assert.throws(() => saveState(state), {
    code: "INVALID_STATE",
    message: /transactions\[0\]\.date/,
  });
});

test("rejects transaction dates after the supported year range", () => {
  const state = {
    schemaVersion: 1,
    accounts: [{ id: "account-1", name: "Checking", openingBalanceCents: 125000 }],
    transactions: [
      {
        id: "transaction-1",
        accountId: "account-1",
        type: "expense",
        amountCents: 100,
        date: "2101-01-01",
      },
    ],
  };

  assert.throws(() => saveState(state), {
    code: "INVALID_STATE",
    message: /transactions\[0\]\.date/,
  });
});

test("reports unavailable localStorage", () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: undefined,
  });

  assert.throws(() => loadState(), { code: "STORAGE_UNAVAILABLE" });
});

test("reports when localStorage is full", () => {
  storageError = Object.assign(new Error("Storage is full"), {
    name: "QuotaExceededError",
  });

  assert.throws(
    () =>
      saveState({
        schemaVersion: 1,
        accounts: [],
        transactions: [],
      }),
    { code: "STORAGE_QUOTA_EXCEEDED" },
  );
});
