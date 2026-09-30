const categoriesByType = {
  expense: [
    { id: "groceries", label: "Groceries", icon: "shopping-cart" },
    { id: "shopping", label: "Shopping", icon: "shopping-bag" },
    { id: "bills", label: "Bills", icon: "receipt-text" },
    { id: "transport", label: "Transport", icon: "car-front" },
    { id: "dining", label: "Dining", icon: "utensils" },
    { id: "health", label: "Health", icon: "heart-pulse" },
    { id: "entertainment", label: "Entertainment", icon: "clapperboard" },
    { id: "other", label: "Other", icon: "circle-ellipsis" },
  ],
  income: [
    { id: "salary", label: "Salary", icon: "briefcase-business" },
    { id: "freelance", label: "Freelance", icon: "laptop" },
    { id: "gift", label: "Gift", icon: "gift" },
    { id: "refund", label: "Refund", icon: "rotate-ccw" },
    { id: "benefits", label: "Benefits", icon: "hand-coins" },
    { id: "other", label: "Other", icon: "circle-ellipsis" },
  ],
};

export function getTransactionCategories(type) {
  return categoriesByType[type] ?? [];
}

export function findTransactionCategory(type, categoryId) {
  return getTransactionCategories(type).find((category) => category.id === categoryId) ?? null;
}
