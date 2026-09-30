import assert from "node:assert/strict";
import { test } from "node:test";
import { removeTransactionById } from "./finance.js";

test("removes only the transaction with the selected id", () => {
  const transactions = [{ id: "first" }, { id: "selected" }, { id: "last" }];

  const remaining = removeTransactionById(transactions, "selected");

  assert.deepEqual(remaining, [{ id: "first" }, { id: "last" }]);
  assert.equal(transactions.length, 3);
});

test("leaves transactions unchanged when the id is unknown", () => {
  const transactions = [{ id: "first" }];

  assert.deepEqual(removeTransactionById(transactions, "missing"), transactions);
});
