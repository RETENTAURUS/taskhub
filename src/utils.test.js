import { describe, expect, it } from 'vitest';
import { formatDate, initials, isOverdue, todayString } from './utils.js';

describe('utils', () => {
  it('todayString memakai format YYYY-MM-DD dengan nol di depan', () => {
    expect(todayString(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(todayString(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('isOverdue: lewat tenggat & belum done', () => {
    expect(isOverdue({ dueDate: '2026-01-01', status: 'todo' }, '2026-01-02')).toBe(true);
  });
  it('isOverdue: tepat hari ini belum terlambat', () => {
    expect(isOverdue({ dueDate: '2026-01-02', status: 'todo' }, '2026-01-02')).toBe(false);
  });
  it('isOverdue: yang sudah done tidak pernah terlambat', () => {
    expect(isOverdue({ dueDate: '2020-01-01', status: 'done' }, '2026-01-02')).toBe(false);
  });
  it('isOverdue: tanpa tenggat', () => {
    expect(isOverdue({ dueDate: null, status: 'todo' }, '2026-01-02')).toBe(false);
  });

  it('formatDate', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate(null)).toBe('');
    expect(formatDate('2026-03-05')).toMatch(/5.*2026/);
  });

  it('initials', () => {
    expect(initials('budi')).toBe('B');
    expect(initials('')).toBe('');
    expect(initials()).toBe('');
  });
});
