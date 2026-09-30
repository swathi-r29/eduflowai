/**
 * Utility functions for parsing and formatting video timestamps.
 */

export function parseTimestampToSeconds(ts) {
  if (typeof ts === 'number') return ts;
  if (!ts) return 0;
  const str = String(ts).trim();
  const parts = str.split(':').map(Number);

  if (parts.length === 3) {
    const [h, m, s] = parts;
    if (isNaN(h) || isNaN(m) || isNaN(s)) return 0;
    return h * 3600 + m * 60 + s;
  } else if (parts.length === 2) {
    const [m, s] = parts;
    if (isNaN(m) || isNaN(s)) return 0;
    return m * 60 + s;
  } else if (parts.length === 1) {
    const num = Number(parts[0]);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export function formatSecondsToTimestamp(totalSec) {
  if (isNaN(totalSec) || totalSec < 0) return '00:00';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
