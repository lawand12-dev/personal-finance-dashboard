const pageIds = new Set(["overview", "activity", "budgets", "accounts"]);

export function resolveCurrentPage(hash) {
  const pageId = typeof hash === "string" ? hash.replace(/^#/, "") : "";
  return pageIds.has(pageId) ? pageId : "overview";
}

export function bindPageNavigation(root = document) {
  const updateCurrentPage = () => {
    const pageId = resolveCurrentPage(root.defaultView?.location.hash ?? "");

    root.querySelectorAll("[data-page]").forEach((page) => {
      page.hidden = page.dataset.page !== pageId;
    });

    root.querySelectorAll("[data-nav-page]").forEach((link) => {
      if (link.dataset.navPage === pageId) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  root.defaultView?.addEventListener("hashchange", updateCurrentPage);
  updateCurrentPage();
  return updateCurrentPage;
}
