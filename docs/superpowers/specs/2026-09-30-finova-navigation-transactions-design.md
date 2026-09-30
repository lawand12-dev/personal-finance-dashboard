# Finova Navigation and Transactions Design

## Goal

People using Finova should be able to move between focused Overview, Activity, Budgets, and Accounts pages without seeing every section at once. Every transaction add or delete must start from the center plus action.

## Interaction

- Keep the shared Finova header and bottom navigation, with four labeled destinations and the central plus action.
- Treat `#overview`, `#activity`, `#budgets`, and `#accounts` as separate views in the shared shell. Direct links, back/forward navigation, and refresh should select the matching view. Only the selected page is visible, and the active navigation item exposes `aria-current="page"`.
- Keep each page's existing purpose and forms: Overview summarizes balances and cash flow; Activity lists transactions; Budgets adds and lists budgets; Accounts adds and lists accounts.
- Remove transaction creation controls from Activity. The plus action opens choices for Add expense, Add income, and Delete transaction. Add choices open the transaction form with the chosen type preselected.
- Delete transaction opens a list of existing transactions from the plus flow. A specific transaction must be selected, then confirmed before removal. Empty transaction lists show an empty state; cancel leaves data unchanged.
- Use the installed Lucide library for consistent labeled bottom-navigation icons and clear expense, income, delete, close, and plus actions. Keep icons and labels high-contrast on opaque surfaces.

## Responsive Layout

- Support narrow phones from 320px, tablets, and desktop screens without horizontal overflow or clipped labels.
- Keep the bottom navigation fixed and centered at every size, with touch targets at least 44px high and safe-area padding on mobile.
- On phones, keep page content single-column and forms stacked; the transaction action surface enters as a bottom sheet.
- On tablets, expand the content width and use two-column layouts for summary metrics and suitable form fields.
- On desktop, use a wider centered content area, more spacious multi-column summary/list layouts, and a centered dialog or popover for transaction actions rather than an oversized bottom sheet.
- Preserve readable line lengths, visible keyboard focus, and clear active navigation state across breakpoints.

## State and Accessibility

Navigation supports default, hover, active, and keyboard focus-visible states. Transaction actions support closed/open menu, add form validation, empty account/transaction lists, selection, confirmation, cancellation, and successful update. Use semantic buttons and navigation landmarks, accessible labels, visible focus styles, dialog labeling, Escape-to-close where appropriate, and return focus to the triggering control.

## Data Flow and Error Handling

Transactions remain in the existing persisted state and are rendered through the existing dashboard renderer. Add actions append a validated transaction; confirmed delete removes only the selected transaction ID. The shared render updates summary totals and the transaction list after either mutation. Existing localStorage error handling remains unchanged.

## Verification

- Run the focused storage tests, lint, and production build.
- Verify direct hash navigation, back/forward, active nav state, and responsive bottom navigation in the browser.
- Verify the page at phone, tablet, and desktop widths for clipping, overflow, and appropriate layout changes.
- Verify add expense/income preselection and persistence, plus delete selection, confirmation, cancel, and empty states.
