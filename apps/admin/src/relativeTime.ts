function elapsedMonths(start: Date, end: Date) {
  let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12
    + end.getUTCMonth() - start.getUTCMonth();
  const anniversary = new Date(start);
  anniversary.setUTCDate(1);
  anniversary.setUTCMonth(start.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(anniversary.getUTCFullYear(), anniversary.getUTCMonth() + 1, 0)).getUTCDate();
  anniversary.setUTCDate(Math.min(start.getUTCDate(), lastDay));
  if (anniversary.getTime() > end.getTime()) months -= 1;
  return months;
}

function unit(count: number, name: string) {
  return `${count} ${name}${count === 1 ? "" : "s"}`;
}

export function formatRelativeTime(value: string, now = Date.now()): string {
  const start = new Date(value);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(now)) return "—";
  const minutes = Math.floor(Math.max(0, now - start.getTime()) / 60_000);
  if (minutes === 0) return "Just now";
  const hours = Math.floor(minutes / 60);
  if (hours < 3) return `${unit(minutes, "minute")} ago`;
  if (hours < 72) return `${unit(hours, "hour")} ago`;
  const months = elapsedMonths(start, new Date(now));
  if (months < 3) return `${unit(Math.floor(hours / 24), "day")} ago`;
  if (months < 12) return `${unit(months, "month")} ago`;
  return `${unit(Math.floor(months / 12), "year")} ago`;
}
