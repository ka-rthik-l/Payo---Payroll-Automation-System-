export function formatCurrency(value, currency = 'INR') {
  const locale = 'en-IN';
  const symbol = 'Rs. ';
  return `${symbol}${Number(value).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
