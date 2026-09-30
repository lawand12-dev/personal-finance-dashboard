import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateDashboardSummary, removeTransactionById } from "./finance.js";

test("calculates a profile balance from manual income and expenses", () => {
  const summary = calculateDashboardSummary(
    {
      openingBalanceCents: 10000,
      transactions: [
        {
          id: "income-1",
          type: "income",
          category: "salary",
          description: "September pay",
          amountCents: 50000,
          date: "2026-09-01",
        },
        {
          id: "expense-1",
          type: "expense",
          category: "groceries",
          description: "Weekly shop",
          amountCents: 12500,
          date: "2026-09-02",
        },
      ],
    },
    "2026-09",
  );

  assert.deepEqual(summary, {
    totalBalanceCents: 47500,
    monthlyIncomeCents: 50000,
    monthlyExpenseCents: 12500,
  });
});

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
