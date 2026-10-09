export interface BudgetTotal { currency: string; amount: string }
export interface BudgetCategory extends BudgetTotal { activity: string }
export interface BudgetSummary { totals: BudgetTotal[]; byCategory: BudgetCategory[] }

export interface ItineraryExpense {
  activity: string;
  amount: string | null;
  currency: string | null;
}

function readTotal(value: BudgetTotal): BudgetTotal {
  if (typeof value.currency !== 'string' || !/^[A-Z]{3}$/.test(value.currency)
    || typeof value.amount !== 'string' || !/^\d+(?:\.\d+)?$/.test(value.amount)) {
    throw new Error('Invalid expense amount or currency.');
  }
  return { currency: value.currency, amount: value.amount };
}

function readCategory(value: BudgetCategory): BudgetCategory {
  if (typeof value.activity !== 'string' || !value.activity.trim()) throw new Error('Invalid expense category.');
  return { ...readTotal(value), activity: value.activity };
}

export function readBudgetSummary(value: BudgetSummary): BudgetSummary {
  if (!Array.isArray(value.totals) || !Array.isArray(value.byCategory)) throw new Error('Invalid budget summary.');
  return { totals: value.totals.map(readTotal), byCategory: value.byCategory.map(readCategory) };
}

// Add decimal strings exactly, without floating-point rounding of money.
function addAmounts(left: string, right: string) {
  const [li, lf = ''] = left.split('.');
  const [ri, rf = ''] = right.split('.');
  const scale = Math.max(lf.length, rf.length);
  const sum = (BigInt(li + lf.padEnd(scale, '0')) + BigInt(ri + rf.padEnd(scale, '0'))).toString().padStart(scale + 1, '0');
  return scale ? `${sum.slice(0, -scale)}.${sum.slice(-scale)}` : sum;
}

export function summarizeDestination(value: ItineraryExpense[]): BudgetSummary {
  if (!Array.isArray(value)) throw new Error('Invalid itinerary response.');
  const totals = new Map<string, string>();
  const categories = new Map<string, BudgetCategory>();
  for (const item of value) {
    if (item.amount == null || item.currency == null) continue;
    totals.set(
      item.currency,
      addAmounts(totals.get(item.currency) ?? '0', item.amount)
    );
    const key = JSON.stringify([item.currency, item.activity]);
    categories.set(key, {
      activity: item.activity,
      currency: item.currency,
      amount: addAmounts(categories.get(key)?.amount ?? '0', item.amount),
    });
  }
  return {
    totals: [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([currency, amount]) => ({ currency, amount })),
    byCategory: [...categories.values()].sort((a, b) => a.activity.localeCompare(b.activity)),
  };
}

export function formatBudgetAmount(amount: string) {
  const [whole, fraction = ''] = amount.split('.');
  return `${whole.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.padEnd(2, '0')}`;
}
