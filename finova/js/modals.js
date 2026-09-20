/* ============================================================
   FINOVA — Modals, dialogs and toasts
   ============================================================ */
"use strict";

/* ---------- Toasts ---------- */
function toast(message, type, title) {
  const host = $("#toasts");
  const el = document.createElement("div");
  el.className = "toast " + (type || "success");
  const ico = type === "error" ? "alert" : type === "warn" ? "alert" : "check";
  el.innerHTML =
    icon(ico) +
    '<div><div class="toast-title">' +
    esc(title || (type === "error" ? "Something went wrong" : "Success")) +
    "</div>" +
    '<div class="toast-msg">' +
    esc(message) +
    "</div></div>";
  host.appendChild(el);
  setTimeout(() => {
    el.classList.add("leaving");
    setTimeout(() => el.remove(), 200);
  }, 3400);
}

/* ---------- Confirm dialog (Promise<boolean>) ---------- */
function confirmDialog(opts) {
  return new Promise((resolve) => {
    const backdrop = $("#confirmBackdrop");
    const modal = $("#confirmModal");
    modal.innerHTML =
      '<div class="modal-head">' +
      '<h2 class="modal-title">' +
      esc(opts.title) +
      "</h2>" +
      '<button class="icon-btn sm" data-confirm="cancel" type="button" aria-label="Close">' +
      icon("x") +
      "</button>" +
      "</div>" +
      '<div class="modal-body"><p style="font-size:14px;color:var(--text-2);line-height:1.6;">' +
      esc(opts.message) +
      "</p></div>" +
      '<div class="modal-foot">' +
      '<button class="btn btn-secondary" data-confirm="cancel" type="button">' +
      esc(opts.cancelText || "Cancel") +
      "</button>" +
      '<button class="btn ' +
      (opts.danger ? "btn-danger" : "btn-primary") +
      '" data-confirm="ok" type="button">' +
      esc(opts.confirmText || "Confirm") +
      "</button>" +
      "</div>";

    backdrop.classList.add("open");
    backdrop.setAttribute("aria-hidden", "false");

    function done(val) {
      backdrop.classList.remove("open");
      backdrop.setAttribute("aria-hidden", "true");
      backdrop.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);
      resolve(val);
    }
    function onBackdrop(e) {
      if (e.target === backdrop) done(false);
    }
    function onKey(e) {
      if (e.key === "Escape") done(false);
    }

    modal.querySelectorAll("[data-confirm]").forEach((btn) => {
      btn.addEventListener("click", () => done(btn.dataset.confirm === "ok"));
    });
    backdrop.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);
  });
}

/* ---------- Generic modal ---------- */
function openModal(html, sizeClass) {
  const backdrop = $("#modalBackdrop");
  const modal = $("#modal");
  modal.className = "modal" + (sizeClass ? " " + sizeClass : "");
  modal.innerHTML = html;
  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  const focusable = modal.querySelector("input, select, textarea, button");
  if (focusable) setTimeout(() => focusable.focus(), 60);
}

function closeModal() {
  const backdrop = $("#modalBackdrop");
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function confirmCategoryModal(cat) {
  const name = cat ? cat.name : "this category";
  const count = cat ? Store.categoryCount(cat.id) : 0;

  return confirmDialog({
    title: 'Delete "' + name + '"?',
    message:
      count > 0
        ? count +
          " transaction" +
          (count === 1 ? "" : "s") +
          " will become uncategorized. This cannot be undone."
        : "This category will be permanently removed.",
    confirmText: "Delete category",
    danger: true,
  });
}

Object.assign(globalThis, {
  toast,
  confirmDialog,
  openModal,
  closeModal,
  categoryOptionsHTML,
  openTransactionModal,
  openCategoryModal,
  confirmCategoryModal,
});

/* ---------- Transaction modal ---------- */
function categoryOptionsHTML(type, selected) {
  if (type === "income") {
    return '<option value="income" selected>Income</option>';
  }
  return Store.data.categories
    .map(
      (c) =>
        '<option value="' +
        c.id +
        '"' +
        (c.id === selected ? " selected" : "") +
        ">" +
        esc(c.name) +
        "</option>",
    )
    .join("");
}

function openTransactionModal(tx) {
  const isEdit = !!tx;
  const type = isEdit ? tx.type : "expense";

  openModal(
    '<div class="modal-head">' +
      '<h2 class="modal-title">' +
      (isEdit ? "Edit Transaction" : "Add Transaction") +
      "</h2>" +
      '<button class="icon-btn sm" type="button" data-action="close-modal" aria-label="Close">' +
      icon("x") +
      "</button>" +
      "</div>" +
      '<form id="txForm" novalidate>' +
      '<div class="modal-body">' +
      '<div class="form-grid">' +
      '<div class="field">' +
      '<label class="label" for="txName">Transaction name</label>' +
      '<input class="input" id="txName" name="name" maxlength="60" placeholder="e.g. Grocery shopping" value="' +
      esc(isEdit ? tx.name : "") +
      '" required>' +
      '<span class="field-error" id="err-name"></span>' +
      "</div>" +
      '<div class="form-row">' +
      '<div class="field">' +
      '<label class="label" for="txAmount">Amount</label>' +
      '<input class="input" id="txAmount" name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" value="' +
      (isEdit ? tx.amount : "") +
      '" required>' +
      '<span class="field-error" id="err-amount"></span>' +
      "</div>" +
      '<div class="field">' +
      '<label class="label" for="txDate">Date</label>' +
      '<input class="input" id="txDate" name="date" type="date" value="' +
      (isEdit ? tx.date : todayISO()) +
      '" max="' +
      todayISO() +
      '" required>' +
      '<span class="field-error" id="err-date"></span>' +
      "</div>" +
      "</div>" +
      '<div class="field">' +
      '<span class="label">Type</span>' +
      '<div class="segmented" id="txType" role="group" aria-label="Transaction type">' +
      '<button type="button" class="seg' +
      (type === "expense" ? " active" : "") +
      '" data-type="expense">Expense</button>' +
      '<button type="button" class="seg' +
      (type === "income" ? " active" : "") +
      '" data-type="income">Income</button>' +
      "</div>" +
      "</div>" +
      '<div class="field">' +
      '<label class="label" for="txCategory">Category</label>' +
      '<select class="select" id="txCategory" name="category">' +
      categoryOptionsHTML(type, isEdit ? tx.category : null) +
      "</select>" +
      "</div>" +
      '<div class="field">' +
      '<label class="label" for="txDesc">Description <span class="opt">(optional)</span></label>' +
      '<textarea class="textarea" id="txDesc" name="description" maxlength="140" rows="2" placeholder="Add a short note…">' +
      esc(isEdit ? tx.description || "" : "") +
      "</textarea>" +
      "</div>" +
      "</div>" +
      "</div>" +
      '<div class="modal-foot">' +
      '<button class="btn btn-secondary" type="button" data-action="close-modal">Cancel</button>' +
      '<button class="btn btn-primary" type="submit">' +
      (isEdit ? "Save changes" : "Save transaction") +
      "</button>" +
      "</div>" +
      "</form>",
  );

  const form = $("#txForm");
  const typeWrap = $("#txType");
  const catSelect = $("#txCategory");
  let currentType = type;

  typeWrap.addEventListener("click", (e) => {
    const btn = e.target.closest(".seg");
    if (!btn) return;
    currentType = btn.dataset.type;
    $$(".seg", typeWrap).forEach((b) =>
      b.classList.toggle("active", b === btn),
    );
    const keep =
      currentType === "income"
        ? "income"
        : catSelect.value === "income"
          ? null
          : catSelect.value;
    catSelect.innerHTML = categoryOptionsHTML(currentType, keep);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = $("#txName").value.trim();
    const amountRaw = $("#txAmount").value;
    const amount = parseFloat(amountRaw);
    const date = $("#txDate").value;
    const category = catSelect.value;
    const description = $("#txDesc").value.trim();

    let valid = true;
    function setErr(field, msg) {
      const input = $("#tx" + field);
      const err = $("#err-" + field.toLowerCase());
      if (msg) {
        valid = false;
        if (input) input.classList.add("invalid");
        if (err) err.textContent = msg;
      } else {
        if (input) input.classList.remove("invalid");
        if (err) err.textContent = "";
      }
    }

    setErr("Name", name ? "" : "Please enter a transaction name.");
    setErr(
      "Amount",
      !amountRaw || isNaN(amount) || amount <= 0
        ? "Enter an amount greater than zero."
        : "",
    );
    setErr("Date", date ? "" : "Please choose a date.");

    if (!valid) return;

    const payload = {
      name: name,
      amount: round2(amount),
      type: currentType,
      category: currentType === "income" ? "income" : category,
      date: date,
      description: description,
      status: isEdit ? tx.status : "completed",
    };

    if (isEdit) {
      Store.updateTransaction(tx.id, payload);
      toast("Transaction updated successfully.", "success", "Saved");
    } else {
      payload.id = uid();
      Store.addTransaction(payload);
      toast("Transaction added to your account.", "success", "Saved");
    }

    closeModal();
    render();
  });
}

/* ---------- Category modal ---------- */
const CATEGORY_COLORS = [
  "#16A34A",
  "#F59E0B",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#EF4444",
  "#64748B",
];
const CATEGORY_ICONS = [
  "home",
  "utensils",
  "car",
  "film",
  "bag",
  "zap",
  "tag",
  "shield",
  "creditCard",
  "target",
];

function openCategoryModal(cat) {
  const isEdit = !!cat;
  const color = isEdit ? cat.color : CATEGORY_COLORS[0];
  const iconName = isEdit ? cat.icon : "tag";
  let selectedColor = color;
  let selectedIcon = iconName;

  openModal(
    '<div class="modal-head">' +
      '<h2 class="modal-title">' +
      (isEdit ? "Edit Category" : "New Category") +
      "</h2>" +
      '<button class="icon-btn sm" type="button" data-action="close-modal" aria-label="Close">' +
      icon("x") +
      "</button>" +
      "</div>" +
      '<form id="catForm" novalidate>' +
      '<div class="modal-body">' +
      '<div class="form-grid">' +
      '<div class="field">' +
      '<label class="label" for="catName">Category name</label>' +
      '<input class="input" id="catName" maxlength="32" placeholder="e.g. Subscriptions" value="' +
      esc(isEdit ? cat.name : "") +
      '" required>' +
      '<span class="field-error" id="err-cat-name"></span>' +
      "</div>" +
      '<div class="field">' +
      '<label class="label" for="catBudget">Monthly budget</label>' +
      '<input class="input" id="catBudget" type="number" min="0" step="10" placeholder="0" value="' +
      (isEdit ? cat.budget : 200) +
      '">' +
      "</div>" +
      '<div class="field">' +
      '<span class="label">Colour</span>' +
      '<div id="colorRow" style="display:flex;gap:8px;flex-wrap:wrap;">' +
      CATEGORY_COLORS.map(
        (c) =>
          '<button type="button" class="color-swatch" data-color="' +
          c +
          '" aria-label="Colour ' +
          c +
          '" ' +
          'style="width:30px;height:30px;border-radius:9px;border:2px solid ' +
          (c === selectedColor ? "var(--text)" : "transparent") +
          ";background:" +
          c +
          ';cursor:pointer;padding:0;"></button>',
      ).join("") +
      "</div>" +
      "</div>" +
      '<div class="field">' +
      '<span class="label">Icon</span>' +
      '<div id="iconRow" style="display:flex;gap:8px;flex-wrap:wrap;">' +
      CATEGORY_ICONS.map(
        (ic) =>
          '<button type="button" class="icon-pick" data-icon="' +
          ic +
          '" aria-label="Icon ' +
          ic +
          '" ' +
          'style="width:36px;height:36px;border-radius:9px;border:1px solid ' +
          (ic === selectedIcon ? "var(--green)" : "var(--border)") +
          ";background:" +
          (ic === selectedIcon ? "var(--green-soft)" : "var(--surface)") +
          ";color:" +
          (ic === selectedIcon ? "var(--green-text)" : "var(--text-2)") +
          ';display:grid;place-items:center;cursor:pointer;">' +
          icon(ic) +
          "</button>",
      ).join("") +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>" +
      '<div class="modal-foot">' +
      '<button class="btn btn-secondary" type="button" data-action="close-modal">Cancel</button>' +
      '<button class="btn btn-primary" type="submit">' +
      (isEdit ? "Save category" : "Create category") +
      "</button>" +
      "</div>" +
      "</form>",
  );

  const colorRow = $("#colorRow");
  const iconRow = $("#iconRow");

  colorRow.addEventListener("click", (e) => {
    const b = e.target.closest(".color-swatch");
    if (!b) return;
    selectedColor = b.dataset.color;
    $$(".color-swatch", colorRow).forEach((s) => {
      s.style.border =
        "2px solid " +
        (s.dataset.color === selectedColor ? "var(--text)" : "transparent");
    });
  });

  iconRow.addEventListener("click", (e) => {
    const b = e.target.closest(".icon-pick");
    if (!b) return;
    selectedIcon = b.dataset.icon;
    $$(".icon-pick", iconRow).forEach((s) => {
      const on = s.dataset.icon === selectedIcon;
      s.style.border = "1px solid " + (on ? "var(--green)" : "var(--border)");
      s.style.background = on ? "var(--green-soft)" : "var(--surface)";
      s.style.color = on ? "var(--green-text)" : "var(--text-2)";
    });
  });

  $("#catForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#catName").value.trim();
    const budget = Math.max(0, parseFloat($("#catBudget").value) || 0);
    const err = $("#err-cat-name");

    if (!name) {
      $("#catName").classList.add("invalid");
      err.textContent = "Please enter a category name.";
      return;
    }
    const dupe = Store.data.categories.some(
      (c) =>
        c.name.toLowerCase() === name.toLowerCase() &&
        (!isEdit || c.id !== cat.id),
    );
    if (dupe) {
      $("#catName").classList.add("invalid");
      err.textContent = "A category with this name already exists.";
      return;
    }

    if (isEdit) {
      Store.updateCategory(cat.id, {
        name: name,
        budget: budget,
        color: selectedColor,
        icon: selectedIcon,
      });
      toast("Category updated.", "success", "Saved");
    } else {
      Store.addCategory({
        id: "cat_" + Date.now().toString(36),
        name: name,
        budget: budget,
        color: selectedColor,
        icon: selectedIcon,
      });
      toast("Category created.", "success", "Saved");
    }

    closeModal();
    render();
  });
}
