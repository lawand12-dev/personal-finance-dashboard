import assert from "node:assert/strict";
import { test } from "node:test";
import { findTransactionCategory, getTransactionCategories } from "./categories.js";

test("provides labeled icon categories for expenses and income", () => {
  assert.deepEqual(
    getTransactionCategories("expense").map(({ id, label, icon }) => [id, label, icon]),
    [
      ["groceries", "Groceries", "shopping-cart"],
      ["shopping", "Shopping", "shopping-bag"],
      ["bills", "Bills", "receipt-text"],
      ["transport", "Transport", "car-front"],
      ["dining", "Dining", "utensils"],
      ["health", "Health", "heart-pulse"],
      ["entertainment", "Entertainment", "clapperboard"],
      ["other", "Other", "circle-ellipsis"],
    ],
  );
  assert.deepEqual(
    getTransactionCategories("income").map(({ id, label, icon }) => [id, label, icon]),
    [
      ["salary", "Salary", "briefcase-business"],
      ["freelance", "Freelance", "laptop"],
      ["gift", "Gift", "gift"],
      ["refund", "Refund", "rotate-ccw"],
      ["benefits", "Benefits", "hand-coins"],
      ["other", "Other", "circle-ellipsis"],
    ],
  );
});

test("looks up a category by transaction type and id", () => {
  assert.equal(findTransactionCategory("expense", "shopping")?.label, "Shopping");
  assert.equal(findTransactionCategory("income", "shopping"), null);
  assert.deepEqual(getTransactionCategories("unknown"), []);
});
