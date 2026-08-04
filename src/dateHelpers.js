// Small date helpers for streaks. Everything is stored as a plain "YYYY-MM-DD"
// string in the phone's own timezone, which is what a person means by "today".

export function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// How many days apart two day keys are. Parsed at noon so daylight saving shifts
// cannot push a date onto the wrong day.
export function daysBetween(fromKey, toKey) {
  if (!fromKey || !toKey) {
    return null;
  }
  const [fromYear, fromMonth, fromDay] = fromKey.split('-').map(Number);
  const [toYear, toMonth, toDay] = toKey.split('-').map(Number);
  const from = new Date(fromYear, fromMonth - 1, fromDay, 12);
  const to = new Date(toYear, toMonth - 1, toDay, 12);
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

// Turns a saved timestamp into "just now", "38m ago", "3h ago", "2d ago".
export function formatTimeAgo(timestamp) {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
