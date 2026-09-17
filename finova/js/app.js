/* ============================================================
   FINOVA — App bootstrap
   UI state, routing, theme, event delegation, boot.
   ============================================================ */
"use strict";

/* ---------- UI state ---------- */
const ui = {
  view: "dashboard",
  tx: {
    q: "",
    category: "all",
    type: "all",
    range: "all",
    limit: 10,
  },
  reportRange: 6,
};

/* ---------- Theme ---------- */
function applyTheme() {
  const theme = (Store.data && Store.data.settings.theme) || "light";
  document.documentElement.setAttribute("data-theme", theme);
  const btn = $("#themeBtn");
  if (btn) {
    btn.innerHTML =
      theme === "dark"
        ? '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>'
        : '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    btn.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
    );
  }
}

function toggleTheme() {
  Store.data.settings.theme =
    Store.data.settings.theme === "dark" ? "light" : "dark";
  Store.save();
  applyTheme();
  redrawCharts();
}

/* ---------- Render / router ---------- */
function render() {
  const view = ui.view;
  const content = $("#content");
  const title = $("#pageTitle");

  if (title) title.textContent = PAGE_TITLES[view] || "Dashboard";

  $$(".nav-item[data-view]").forEach((btn) => {
    const active = btn.dataset.view === view;
    btn.classList.toggle("active", active);
    if (active) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });

  chartRegistry.length = 0;
  content.innerHTML = (VIEWS[view] || viewDashboard)();

  if (AFTER[view]) {
    try {
      AFTER[view]();
    } catch (e) {
      console.error(e);
    }
  }

  content.scrollTop = 0;
}

function navigate(view) {
  if (!VIEWS[view]) view = "dashboard";
  if (location.hash.slice(1) !== view) {
    location.hash = view;
  } else {
    ui.view = view;
    render();
  }
}

window.addEventListener("hashchange", () => {
  const v = location.hash.slice(1) || "dashboard";
  ui.view = VIEWS[v] ? v : "dashboard";
  render();
});

const onResize = debounce(() => {
  redrawCharts();
}, 160);
window.addEventListener("resize", onResize);

/* ---------- Profile UI sync ---------- */
function syncProfileUI() {
  const p = Store.data.profile;
  const initials = p.initials || "AR";
  const av1 = $("#sidebarAvatar"),
    av2 = $("#topAvatar");
  if (av1) av1.textContent = initials;
  if (av2) av2.textContent = initials;
  const n = $("#sidebarName"),
    m = $("#sidebarMail");
  if (n) n.textContent = p.name;
  if (m) m.textContent = p.email;
}

/* ---------- Global event delegation ---------- */
document.addEventListener("click", async (e) => {
  const target = e.target.closest("[data-action], [data-view]");
  if (!target) {
    const pop = $("#notifPop");
    if (
      pop &&
      pop.classList.contains("open") &&
      !e.target.closest("#notifBtn")
    ) {
      pop.classList.remove("open");
      $("#notifBtn").setAttribute("aria-expanded", "false");
    }
    return;
  }

  const view = target.dataset.view;
  if (view) {
    navigate(view);
    closeSidebar();
    return;
  }

  const action = target.dataset.action;
  const id = target.dataset.id;

  switch (action) {
    case "add-tx":
      openTransactionModal(null);
      break;

    case "edit-tx": {
      const tx = Store.getTransaction(id);
      if (tx) openTransactionModal(tx);
      break;
    }

    case "delete-tx": {
      const tx = Store.getTransaction(id);
      if (!tx) break;
      const ok = await confirmDialog({
        title: "Delete transaction?",
        message:
          "“" +
          tx.name +
          "” for " +
          money(tx.amount) +
          " will be permanently removed. This action cannot be undone.",
        confirmText: "Delete",
        danger: true,
      });
      if (ok) {
        Store.deleteTransaction(id);
        toast("Transaction deleted.", "success", "Removed");
        render();
      }
      break;
    }

    case "close-modal":
      closeModal();
      break;

    case "go-transactions":
      navigate("transactions");
      break;

    case "load-more":
      ui.tx.limit += 10;
      $("#txTableCard").innerHTML = txTableHTML();
      break;

    case "collapse-list":
      ui.tx.limit = 10;
      $("#txTableCard").innerHTML = txTableHTML();
      break;

    case "reset-filters":
      ui.tx = { q: "", category: "all", type: "all", range: "all", limit: 10 };
      render();
      toast("Filters cleared.", "success", "Reset");
      break;

    case "report-range":
      ui.reportRange = parseInt(target.dataset.range, 10) || 6;
      render();
      break;

    case "add-category":
      openCategoryModal(null);
      break;

    case "edit-category": {
      const cat = Store.data.categories.find((c) => c.id === id);
      if (cat) openCategoryModal(cat);
      break;
    }

    case "delete-category": {
      const cat = Store.data.categories.find((c) => c.id === id);
      if (!cat) break;
      const count = Store.categoryCount(cat.id);
      const ok = await confirmDialog({
        title: "Delete “" + cat.name + "”?",
        message:
          count > 0
            ? count +
              " transaction" +
              (count === 1 ? "" : "s") +
              " will become uncategorised. This cannot be undone."
            : "This category will be permanently removed.",
        confirmText: "Delete category",
        danger: true,
      });
      if (ok) {
        Store.deleteCategory(cat.id);
        toast("Category deleted.", "success", "Removed");
        render();
      }
      break;
    }

    case "save-profile": {
      const name = $("#setName").value.trim();
      const email = $("#setEmail").value.trim();
      if (!name || !email) {
        toast("Name and email are required.", "error", "Invalid input");
        break;
      }
      const initials = name
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      Store.data.profile = { name: name, email: email, initials: initials };
      Store.save();
      syncProfileUI();
      toast("Profile updated.", "success", "Saved");
      break;
    }

    case "export-data": {
      try {
        const blob = new Blob([JSON.stringify(Store.data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "finova-data-" + todayISO() + ".json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast("Your data has been exported.", "success", "Download started");
      } catch (err) {
        toast("Export failed in this browser.", "error");
      }
      break;
    }

    case "reset-demo": {
      const ok = await confirmDialog({
        title: "Reset to demo data?",
        message:
          "All current transactions and categories will be replaced with the original sample dataset.",
        confirmText: "Reset data",
        danger: true,
      });
      if (ok) {
        Store.reset();
        applyTheme();
        syncProfileUI();
        render();
        toast("Demo data restored.", "success", "Reset complete");
      }
      break;
    }

    case "clear-data": {
      const ok = await confirmDialog({
        title: "Clear all data?",
        message:
          "Every transaction stored in this browser will be permanently deleted. Categories and settings will be kept. This cannot be undone.",
        confirmText: "Clear everything",
        danger: true,
      });
      if (ok) {
        Store.clearTransactions();
        render();
        toast("All transactions cleared.", "success", "Data cleared");
      }
      break;
    }

    case "logout": {
      const ok = await confirmDialog({
        title: "Log out?",
        message:
          "This is a front-end demo — your data stays safely in this browser.",
        confirmText: "Log out",
      });
      if (ok)
        toast("You have been logged out (demo only).", "success", "Goodbye");
      break;
    }
  }
});

/* ---------- Settings live controls ---------- */
document.addEventListener("change", (e) => {
  const t = e.target;

  if (t.id === "setDark") {
    Store.data.settings.theme = t.checked ? "dark" : "light";
    Store.save();
    applyTheme();
    redrawCharts();
  }
  if (t.id === "setCurrency") {
    Store.data.settings.currency = t.value;
    Store.save();
    render();
    toast("Currency updated to " + t.value + ".", "success", "Saved");
  }
  if (t.id === "setNotifyReport") {
    Store.data.settings.notifyReport = t.checked;
    Store.save();
  }
  if (t.id === "setNotifyBudget") {
    Store.data.settings.notifyBudget = t.checked;
    Store.save();
  }
  if (t.id === "setNotifyLarge") {
    Store.data.settings.notifyLarge = t.checked;
    Store.save();
  }
  if (t.id === "setRollover") {
    Store.data.settings.rollover = t.checked;
    Store.save();
  }
  if (t.id === "setGoal") {
    Store.data.settings.savingsGoal = Math.max(0, parseFloat(t.value) || 0);
    Store.save();
  }
});

/* ---------- Sidebar (mobile) ---------- */
function openSidebar() {
  $("#sidebar").classList.add("open");
  $("#scrim").classList.add("show");
}
function closeSidebar() {
  $("#sidebar").classList.remove("open");
  $("#scrim").classList.remove("show");
}
$("#menuBtn").addEventListener("click", () => {
  const open = $("#sidebar").classList.contains("open");
  open ? closeSidebar() : openSidebar();
});
$("#scrim").addEventListener("click", closeSidebar);

/* ---------- Theme toggle ---------- */
$("#themeBtn").addEventListener("click", toggleTheme);

/* ---------- Notifications popover ---------- */
$("#notifBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  const pop = $("#notifPop");
  const open = pop.classList.toggle("open");
  $("#notifBtn").setAttribute("aria-expanded", open ? "true" : "false");
});

/* ---------- Global search ---------- */
$("#globalSearch").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    ui.tx.q = e.target.value.trim();
    ui.tx.limit = 10;
    navigate("transactions");
    setTimeout(() => {
      const s = $("#txSearch");
      if (s) {
        s.value = ui.tx.q;
        s.focus();
      }
    }, 40);
  }
});

/* ---------- Modal backdrop close ---------- */
$("#modalBackdrop").addEventListener("click", (e) => {
  if (e.target === $("#modalBackdrop")) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if ($("#modalBackdrop").classList.contains("open")) closeModal();
    const pop = $("#notifPop");
    if (pop && pop.classList.contains("open")) pop.classList.remove("open");
    closeSidebar();
  }
});

/* ---------- Boot ---------- */
function boot() {
  $("#content").innerHTML = skeletonView();

  setTimeout(() => {
    Store.load();

    if (!Store._memOnly && !localStorage.getItem(STORAGE_KEY + ".init")) {
      try {
        if (
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches
        ) {
          Store.data.settings.theme = "dark";
          Store.save();
        }
        localStorage.setItem(STORAGE_KEY + ".init", "1");
      } catch (err) {
        /* ignore */
      }
    }

    applyTheme();
    syncProfileUI();

    const hashView = location.hash.slice(1);
    ui.view = VIEWS[hashView] ? hashView : "dashboard";
    if (!VIEWS[hashView]) history.replaceState(null, "", "#" + ui.view);

    render();
  }, 480);
}

boot();
