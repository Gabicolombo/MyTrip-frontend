export function itineraryCost(amount: string, currency: string) {
  const value = amount.trim();
  if (!value) {
    if (currency) throw new Error('Enter an amount or clear the expense.');
    return { amount: null, currency: null };
  }
  if (!currency) throw new Error('Select a currency for the amount.');
  const normalized = value.replace(',', '.');
  const number = Number(normalized);
  if (!/^\d+(?:\.\d+)?$/.test(normalized) || !Number.isFinite(number) || number > Number.MAX_SAFE_INTEGER) {
    throw new Error('Enter a valid amount of zero or more, without thousands separators.');
  }
  return { amount: normalized, currency };
}
