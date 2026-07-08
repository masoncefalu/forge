export function centsToUSD(cents: number): string {
  if (cents === 1) return "1¢";
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function timeAgo(date: Date, now: Date = new Date()): string {
  const mins = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
