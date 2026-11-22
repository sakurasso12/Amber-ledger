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

  it('a daily task missed yesterday still rings today and the next days', () => {
    const daily = task({
      alarm: true,
      deadlineAt: at(21, 9, 30),
      recurrenceRule: { freq: 'daily', interval: 1, weekdays: null, until: null },
    });
    const items = alarmItems([daily], NOW);
    expect(items).toHaveLength(14);
    expect(new Date(items[0].alarmAt).getDate()).toBe(22);
    expect(new Date(items[1].alarmAt).getDate()).toBe(23);
    expect(items.every((i) => i.hour === 9 && i.minute === 30)).toBe(true);
  });

  it('weekly on chosen days only', () => {
    const weekly = task({
      alarm: true,
      deadlineAt: at(23, 7), // Monday
      recurrenceRule: { freq: 'weekly', interval: 1, weekdays: [1, 3], until: null },
    });
    const days = alarmItems([weekly], NOW).slice(0, 4).map((i) => new Date(i.alarmAt).getDay());
    expect(days).toEqual([1, 3, 1, 3]);
  });

  it('ticking a repeating task off does not create a second alarm for the same day', () => {
    const rule = { freq: 'daily' as const, interval: 1, weekdays: null, until: null };
    const done = task({ id: 'first', alarm: true, status: 'done', deadlineAt: at(22, 10), recurrenceRule: rule });
    const before = alarmItems([{ ...done, status: 'not_started' }], NOW);
    const next = task({ id: 'second', seriesId: 'first', alarm: true, deadlineAt: at(23, 10), recurrenceRule: rule });
    const after = alarmItems([done, next], NOW);
    const tomorrowBefore = before.find((i) => new Date(i.alarmAt).getDate() === 23)!;
    const tomorrowAfter = after.find((i) => new Date(i.alarmAt).getDate() === 23)!;
    expect(tomorrowAfter.key).toBe(tomorrowBefore.key);
  });

  it('stops at the rule end date', () => {
    const items = alarmItems(
      [task({ alarm: true, deadlineAt: at(22, 10), recurrenceRule: { freq: 'daily', interval: 1, weekdays: null, until: at(24, 23) } })],
      NOW
    );
    expect(items.map((i) => new Date(i.alarmAt).getDate())).toEqual([22, 23, 24]);
  });
});
