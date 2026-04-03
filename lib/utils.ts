export function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const [datePart] = dateStr.split('T');
  const [year, month, day] = datePart.split('-');

  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}