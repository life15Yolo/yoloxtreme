export function dropStatusLabel(status: string): string {
  switch (status) {
    case 'pending_review':
      return 'Pending review';
    case 'live':
      return 'Live';
    case 'funded':
      return 'Funded';
    case 'producing':
      return 'Producing';
    case 'shipped':
      return 'Shipped';
    default:
      return status;
  }
}

export function dropStatusBadgeClass(status: string): string {
  if (status === 'live') return 'bg-lime text-black';
  if (status === 'pending_review') return 'bg-amber-300 text-black';
  return 'bg-white/10 text-white/60';
}
