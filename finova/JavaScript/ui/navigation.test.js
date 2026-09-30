import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveCurrentPage } from "./navigation.js";

test("resolves supported page hashes", () => {
  assert.equal(resolveCurrentPage("#activity"), "activity");
  assert.equal(resolveCurrentPage("#budgets"), "budgets");
});

test("uses overview for empty and unsupported hashes", () => {
  assert.equal(resolveCurrentPage(""), "overview");
  assert.equal(resolveCurrentPage("#unknown"), "overview");
  assert.equal(resolveCurrentPage("#accounts"), "overview");
});
