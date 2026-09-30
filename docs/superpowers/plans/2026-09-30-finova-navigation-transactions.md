# Finova Navigation and Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Overview, Activity, Budgets, and Accounts independent responsive views while routing all transaction creation and deletion through the center plus action.

**Architecture:** Keep one HTML document and the existing local-storage state. Use hash navigation to select one page at a time, retain the existing summary/list renderers, and let the central action own the transaction add and confirmed-delete flows. Add Lucide icons through the installed package and responsive styles to the existing app shell.

**Tech Stack:** Vanilla JavaScript modules, HTML, CSS, Vite, Lucide, Node's built-in test runner.

---

## File Map

- Create `finova/JavaScript/ui/navigation.js` for a pure hash-to-page resolver and page/nav synchronization.
- Create `finova/JavaScript/ui/navigation.test.js` for route parsing tests.
- Modify `finova/html/finova.html` to split page sections, add Lucide targets, and define the central transaction dialogs.
- Modify `finova/JavaScript/app.js` to bind navigation, add transactions from the plus flow, and delete only the confirmed selected ID.
- Modify `finova/JavaScript/ui/dashboard.js` to continue rendering transaction rows and synchronize add/delete selection UI as needed.
- Modify `finova/css/finova.css` for icon navigation, modal/sheet states, and phone/tablet/desktop layout.

## Task 1: Test Hash Routing

**Files:**

- Create: `finova/JavaScript/ui/navigation.test.js`
- Create: `finova/JavaScript/ui/navigation.js`

- [ ] **Step 1: Add route resolution tests**

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveCurrentPage } from "./navigation.js";

test("resolves supported page hashes", () => {
  assert.equal(resolveCurrentPage("#activity"), "activity");
  assert.equal(resolveCurrentPage("#budgets"), "budgets");
  assert.equal(resolveCurrentPage("#accounts"), "accounts");
});

test("uses overview for empty and unsupported hashes", () => {
  assert.equal(resolveCurrentPage(""), "overview");
  assert.equal(resolveCurrentPage("#unknown"), "overview");
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `node --test finova/JavaScript/ui/navigation.test.js`
Expected: FAIL because `navigation.js` does not yet export `resolveCurrentPage`.

- [ ] **Step 3: Implement the resolver and page synchronization**

Export `resolveCurrentPage(hash)` using the allowed page IDs `overview`, `activity`, `budgets`, and `accounts`. Add `bindPageNavigation(root)` to update each `[data-page]` element's `hidden` state and the matching `[data-nav-page]` link's `aria-current` when the hash changes. Call it once at startup and listen for `hashchange`; do not scroll to hidden sections.

- [ ] **Step 4: Run the focused test**

Run: `node --test finova/JavaScript/ui/navigation.test.js`
Expected: PASS, 2 tests.

## Task 2: Split the HTML Views and Add Accessible Actions

**Files:**

- Modify: `finova/html/finova.html`

- [ ] **Step 1: Group markup into four page views**

Place the existing overview heading, balance, monthly totals, and cash-flow section in `[data-page="overview"]`. Place only the transaction list in `[data-page="activity"]`; keep the budget form/list in `[data-page="budgets"]` and account form/list in `[data-page="accounts"]`. Set the initially active page to Overview and leave non-active views hidden.

- [ ] **Step 2: Add labeled Lucide navigation targets**

Give the four destination links `data-nav-page` values and visible labels. Put a 20px icon target in each link using `data-lucide="house"`, `activity`, `chart-no-axes-column-increasing`, and `wallet-cards`. Keep the center button labeled for assistive technology and use `data-lucide="plus"`; do not use text glyphs as icons.

- [ ] **Step 3: Add central transaction dialogs**

Keep `#transaction-form` outside the Activity page in a labeled dialog so Add expense and Add income work from any page. The plus menu must contain Add expense, Add income, and Delete transaction actions. Add a separate delete-selection dialog with a list target and a confirmation dialog whose destructive button includes the selected transaction's identifying details. There must be no add or delete transaction control inside the Activity view.

- [ ] **Step 4: Preserve accessible structure**

Use native buttons, labeled forms, `aria-live` for refreshed lists/status, `aria-labelledby` for dialogs, explicit close/cancel buttons, and `aria-current="page"` for the active nav link. Set dialog open/close behavior from JavaScript rather than relying on hidden content alone.

## Task 3: Bind Transaction Add and Confirmed Delete

**Files:**

- Modify: `finova/JavaScript/app.js`
- Modify: `finova/JavaScript/ui/dashboard.js`

- [ ] **Step 1: Wire the add choices to the shared transaction form**

Import `createIcons` and only the icons used from `lucide`. Initialize icon targets after the static markup is available. From the center plus menu, Add expense and Add income open the transaction dialog, preset `type`, default the date to today, and preserve the existing single-account auto-selection. Focus the first editable transaction field.

- [ ] **Step 2: Keep account and form state in sync**

Continue using `bindTransactionForm` validation and the existing `commitState` persistence path. On submit, append the transaction, render all views, close the dialog, and announce success. When there are no accounts, disable the add choices and show a clear message directing the user to Accounts.

- [ ] **Step 3: Implement selected-transaction deletion**

The plus menu's Delete transaction action opens the delete-selection dialog. Render one selectable button per transaction showing type, date, account, and amount. Selecting one opens confirmation; cancel closes confirmation without changing state. Confirm removes only the selected transaction ID through `commitState`, updates totals/list, closes the dialogs, and announces success. With no transactions, show an empty state and disable further delete action.

- [ ] **Step 4: Verify focus and dismissal behavior**

Close dialogs on their close/cancel controls and Escape, return focus to the triggering button, and do not close when clicking inside a dialog. Ensure each dialog's initial focus lands on a useful control.

## Task 4: Style Navigation, Dialogs, and Responsive Pages

**Files:**

- Modify: `finova/css/finova.css`

- [ ] **Step 1: Style Lucide icons and selected navigation state**

Use a consistent 20px stroke icon above each persistent text label. Keep the selected destination high contrast with a clear active indicator; retain visible keyboard focus. Keep the bottom bar fixed and centered with minimum 44px nav hit areas and safe-area padding.

- [ ] **Step 2: Add transaction dialog surfaces**

Use an opaque white action surface with visible borders and dark text. At phone widths, show the action/dialog surface as a bottom sheet with safe-area padding. At desktop widths, center a compact dialog. Style expense, income, and destructive icons distinctly without using low-contrast backgrounds.

- [ ] **Step 3: Implement responsive content widths and grids**

At 320-639px keep page content and forms single-column. At 640-1023px widen the content and use two-column metric/form layouts where fields fit. At 1024px and above use a wider centered main area with desktop summary/list columns while preserving the fixed bottom navigation. Ensure all labels, buttons, and dialog content wrap without clipping or horizontal overflow.

- [ ] **Step 4: Respect reduced motion**

Keep any dialog transition brief and disable it under `prefers-reduced-motion: reduce`.

## Task 5: Verify Behavior and Responsive Layout

**Files:**

- No additional files.

- [ ] **Step 1: Run unit tests**

Run: `node --test finova/JavaScript/data/storage.test.js finova/JavaScript/ui/navigation.test.js`
Expected: all tests pass.

- [ ] **Step 2: Run lint and production build**

Run: `npm run lint`
Expected: exit code 0.

Run: `npm run build`
Expected: Vite completes a production build without errors.

- [ ] **Step 3: Verify navigation and transaction flows in the browser**

Check direct links and hash back/forward for all four pages. Confirm only the selected page is visible and the active nav state changes. Add income and expense from Overview and Accounts, confirm their type and account selection, reload to verify persistence, delete a selected transaction, and verify cancel leaves state unchanged.

- [ ] **Step 4: Verify responsive layouts**

At 375px, 768px, and 1280px viewport widths, verify there is no horizontal overflow or clipped nav label; confirm one-column mobile forms, tablet/desktop expansion, touch target sizing, the mobile bottom sheet, and the centered desktop dialog.

No commits are included in this plan; the workspace already contains uncommitted user changes.
