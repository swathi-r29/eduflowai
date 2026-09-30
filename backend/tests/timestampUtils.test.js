import { parseTimestampToSeconds, formatSecondsToTimestamp } from '../src/utils/timestampUtils.js';

describe('parseTimestampToSeconds', () => {
  test('parses MM:SS timestamps correctly', () => {
    expect(parseTimestampToSeconds('18:42')).toBe(1122);
    expect(parseTimestampToSeconds('00:42')).toBe(42);
  });

  test('parses HH:MM:SS timestamps correctly', () => {
    expect(parseTimestampToSeconds('01:18:42')).toBe(4722);
    expect(parseTimestampToSeconds('1:18:42')).toBe(4722);
  });

  test('parses single number strings and numbers', () => {
    expect(parseTimestampToSeconds('42')).toBe(42);
    expect(parseTimestampToSeconds(1122)).toBe(1122);
  });

  test('returns 0 for invalid timestamp strings', () => {
    expect(parseTimestampToSeconds(null)).toBe(0);
    expect(parseTimestampToSeconds(undefined)).toBe(0);
    expect(parseTimestampToSeconds('')).toBe(0);
    expect(parseTimestampToSeconds('invalid')).toBe(0);
  });
});

describe('formatSecondsToTimestamp', () => {
  test('formats seconds under 1 hour as MM:SS', () => {
    expect(formatSecondsToTimestamp(1122)).toBe('18:42');
    expect(formatSecondsToTimestamp(42)).toBe('00:42');
  });

  test('formats seconds 1 hour or over as HH:MM:SS', () => {
    expect(formatSecondsToTimestamp(4722)).toBe('1:18:42');
  });
});
