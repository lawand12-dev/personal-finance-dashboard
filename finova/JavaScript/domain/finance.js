const MIN_SUPPORTED_YEAR = 1900;
const MAX_SUPPORTED_YEAR = 2100;

export function calculateDashboardSummary(state, month) {
  if (
    state === null ||
    typeof state !== "object" ||
    !Array.isArray(state.accounts) ||
    !Array.isArray(state.transactions)
  ) {
    throw new TypeError("Finance state must include accounts and transactions arrays.");
  }

  validateMonth(month);
  validateAccounts(state.accounts);
  validateTransactions(state.transactions);

  let totalBalanceCents = state.accounts.reduce(
    (total, account) => addCents(total, account.openingBalanceCents),
    0,
  );
  let monthlyIncomeCents = 0;
  let monthlyExpenseCents = 0;

  for (const transaction of state.transactions) {
    const transactionAmount =
      transaction.type === "expense" ? -transaction.amountCents : transaction.amountCents;
    totalBalanceCents = addCents(totalBalanceCents, transactionAmount);

    if (transaction.date.slice(0, 7) !== month) {
      continue;
    }

    if (transaction.type === "income") {
      monthlyIncomeCents = addCents(monthlyIncomeCents, transaction.amountCents);
    } else {
      monthlyExpenseCents = addCents(monthlyExpenseCents, transaction.amountCents);
    }
  }

  return {
    totalBalanceCents,
    monthlyIncomeCents,
    monthlyExpenseCents,
  };
}

export function removeTransactionById(transactions, transactionId) {
  return transactions.filter((transaction) => transaction.id !== transactionId);
}

function validateMonth(month) {
  if (typeof month !== "string" || month.length !== 7 || month[4] !== "-") {
    throw new RangeError("Month must use YYYY-MM format with a valid calendar month.");
  }

  const year = parseAsciiInteger(month.slice(0, 4));
  const monthNumber = parseAsciiInteger(month.slice(5, 7));

  if (year === null || monthNumber === null || monthNumber < 1 || monthNumber > 12) {
    throw new RangeError("Month must use YYYY-MM format with a valid calendar month.");
  }

  if (year < MIN_SUPPORTED_YEAR || year > MAX_SUPPORTED_YEAR) {
    throw new RangeError(
      `Month year must be between ${MIN_SUPPORTED_YEAR} and ${MAX_SUPPORTED_YEAR}.`,
    );
  }
}

function validateAccounts(accounts) {
  for (const [index, account] of accounts.entries()) {
    if (account === null || typeof account !== "object" || Array.isArray(account)) {
      throw new TypeError(`accounts[${index}] must be an object.`);
    }

    if (!Number.isSafeInteger(account.openingBalanceCents)) {
      throw new TypeError(`accounts[${index}].openingBalanceCents must be a safe integer.`);
    }
  }
}

function validateTransactions(transactions) {
  for (const [index, transaction] of transactions.entries()) {
    if (transaction === null || typeof transaction !== "object" || Array.isArray(transaction)) {
      throw new TypeError(`transactions[${index}] must be an object.`);
    }

    if (transaction.type !== "income" && transaction.type !== "expense") {
      throw new TypeError(`transactions[${index}].type must be income or expense.`);
    }

    if (!Number.isSafeInteger(transaction.amountCents) || transaction.amountCents <= 0) {
      throw new TypeError(`transactions[${index}].amountCents must be a positive safe integer.`);
    }

    if (!isSupportedCalendarDate(transaction.date)) {
      throw new TypeError(
        `transactions[${index}].date must be a valid YYYY-MM-DD date between ${MIN_SUPPORTED_YEAR} and ${MAX_SUPPORTED_YEAR}.`,
      );
    }
  }
}

function isSupportedCalendarDate(value) {
  if (typeof value !== "string" || value.length !== 10 || value[4] !== "-" || value[7] !== "-") {
    return false;
  }

  const year = parseAsciiInteger(value.slice(0, 4));
  const month = parseAsciiInteger(value.slice(5, 7));
  const day = parseAsciiInteger(value.slice(8, 10));

  if (
    year === null ||
    month === null ||
    day === null ||
    year < MIN_SUPPORTED_YEAR ||
    year > MAX_SUPPORTED_YEAR
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

function parseAsciiInteger(value) {
  if (value.length === 0) {
    return null;
  }

  let result = 0;

  for (const character of value) {
    const digit = character.charCodeAt(0) - 48;

    if (digit < 0 || digit > 9) {
      return null;
    }

    result = result * 10 + digit;
  }

  return result;
}

function addCents(total, amount) {
  const sum = total + amount;

  if (!Number.isSafeInteger(sum)) {
    throw new RangeError("Finance total exceeds the safe integer range in cents.");
  }

  return sum;
}
