import { Upcoming } from '@/types';

/** Subscriptions = repeat "upcoming" payments the user added on the Subscriptions screen. */
export function subscriptionsOf(upcoming: Upcoming[], ids: string[]): Upcoming[] {
  const set = new Set(ids);
  return upcoming.filter((u) => set.has(u.id)).sort((a, b) => a.date.localeCompare(b.date));
}

/** What one subscription costs per month, whatever its period. */
export function monthlyCost(u: Upcoming): number {
  const every = Math.max(1, u.interval || 1);
  switch (u.freq) {
    case 'daily':
      return (u.amount * 365) / 12 / every;
    case 'weekly':
      return (u.amount * 52) / 12 / every;
    default:
      return u.amount / every;
  }
}

export function monthlyTotal(subs: Upcoming[]): number {
  return subs.reduce((sum, u) => sum + monthlyCost(u), 0);
}
