export function formatUGX(amount: number): string {
  if (isNaN(amount)) return 'UGX 0';
  return `UGX ${Math.round(amount).toLocaleString('en-US')}`;
}

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function calculateDiscount(price: number, originalPrice?: number): number | null {
  if (!originalPrice || originalPrice <= price) return null;
  const discount = Math.round(((originalPrice - price) / originalPrice) * 100);
  return discount > 0 ? discount : null;
}

export function formatUgandaPhoneToInternational(phone: string): string {
  if (!phone) return '256700000000';
  const clean = phone.replace(/[\s+()-]/g, '');
  if (clean.startsWith('0')) {
    return `256${clean.slice(1)}`;
  }
  if (clean.startsWith('256')) {
    return clean;
  }
  return `256${clean}`;
}

