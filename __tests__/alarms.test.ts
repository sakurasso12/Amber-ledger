import { alarmItems } from '@/lib/alarms';
import { task } from './factories';

// Sunday 22 Nov 2026, 08:00 local time.
const NOW = new Date(2026, 10, 22, 8, 0).getTime();
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).toISOString();

describe('alarmItems', () => {
  it('a plain task: one alarm, handed over at midnight of its day', () => {
    const items = alarmItems([task({ alarm: true, deadlineAt: at(24, 10) })], NOW);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ hour: 10, minute: 0, triggerAt: new Date(2026, 10, 24).getTime() });
  });

  it('a task later today is handed over right away (trigger already passed)', () => {
    const [item] = alarmItems([task({ alarm: true, deadlineAt: at(22, 10) })], NOW);
    expect(item.triggerAt).toBeLessThanOrEqual(NOW);
  });

  it('skips tasks without alarm, done, past or without a deadline', () => {
    const items = alarmItems(
      [
        task({ id: 'a', deadlineAt: at(24, 10) }),
        task({ id: 'b', alarm: true, status: 'done', deadlineAt: at(24, 10) }),
        task({ id: 'c', alarm: true, deadlineAt: at(21, 10) }),
        task({ id: 'd', alarm: true }),
      ],
      NOW
    );
    expect(items).toEqual([]);
  });

  it('a daily task becomes ONE repeating Clock alarm (every day), handed over right away', () => {
    const daily = task({
      alarm: true,
      deadlineAt: at(21, 9, 30),
      recurrenceRule: { freq: 'daily', interval: 1, weekdays: null, until: null },
    });
    const items = alarmItems([daily], NOW);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ hour: 9, minute: 30, days: [1, 2, 3, 4, 5, 6, 7] });
    expect(items[0].triggerAt).toBeLessThan(NOW);
  });

  it('weekly on chosen days: one repeating alarm on those days (Calendar numbering)', () => {
    const weekly = task({
      alarm: true,
      deadlineAt: at(23, 7), // Monday
      recurrenceRule: { freq: 'weekly', interval: 1, weekdays: [1, 3], until: null },
    });
    const items = alarmItems([weekly], NOW);
    expect(items).toHaveLength(1);
    expect(items[0].days).toEqual([2, 4]); // Mon, Wed
  });

  it('every 2 days is not a Clock repeat — one-off alarms per occurrence', () => {
    const items = alarmItems(
      [task({ alarm: true, deadlineAt: at(22, 10), recurrenceRule: { freq: 'daily', interval: 2, weekdays: null, until: null } })],
      NOW
    );
    expect(items.length).toBeGreaterThan(1);
    expect(items.every((i) => !i.days)).toBe(true);
    expect(new Date(items[1].alarmAt).getDate()).toBe(24);
  });

  it('ticking a repeating task off keeps the same repeating alarm (no duplicate)', () => {
    const rule = { freq: 'daily' as const, interval: 1, weekdays: null, until: null };
    const first = task({ id: 'first', alarm: true, deadlineAt: at(22, 10), recurrenceRule: rule });
    const next = task({ id: 'second', seriesId: 'first', alarm: true, deadlineAt: at(23, 10), recurrenceRule: rule });
    const before = alarmItems([first], NOW);
    const after = alarmItems([{ ...first, status: 'done' }, next], NOW);
    expect(after.map((i) => i.key)).toEqual(before.map((i) => i.key));
  });

  it('stops at the rule end date', () => {
    const items = alarmItems(
      [task({ alarm: true, deadlineAt: at(22, 10), recurrenceRule: { freq: 'daily', interval: 1, weekdays: null, until: at(24, 23) } })],
      NOW
    );
    expect(items.map((i) => new Date(i.alarmAt).getDate())).toEqual([22, 23, 24]);
  });
});
