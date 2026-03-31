import type { ScheduleMatch } from '../../types/database';
import { calculateToggleStatus } from '../../utils/transferWindowAutomation';

function createMatch(
  matchNumber: number,
  dateIso: string,
  timeGMT: string
): ScheduleMatch {
  return {
    matchNumber,
    description: `Match ${matchNumber}`,
    team1: 'Team A',
    team2: 'Team B',
    venue: 'Venue',
    stadium: 'Stadium',
    date: new Date(dateIso),
    timeGMT,
    timeLocal: ''
  };
}

describe('transferWindowAutomation', () => {
  it('shows next auto-disable at parsable timeGMT when available', () => {
    const schedule: ScheduleMatch[] = [
      createMatch(1, '2026-06-01T00:00:00.000Z', ''),
      createMatch(2, '2026-06-02T00:00:00.000Z', '11:30 AM')
    ];

    const statusBeforeDisable = calculateToggleStatus(schedule, new Date('2026-06-02T11:29:00.000Z'));
    const statusAtDisable = calculateToggleStatus(schedule, new Date('2026-06-02T11:30:00.000Z'));

    expect(statusBeforeDisable.shouldBeEnabled).toBe(false);
    expect(statusBeforeDisable.nextChangeAction).toBe('disable');
    expect(statusBeforeDisable.nextChangeTime?.toISOString()).toBe('2026-06-02T11:30:00.000Z');
    expect(statusAtDisable.nextChangeTime).toBeNull();
  });

  it('falls back to 10:00 AM GMT when next day has two matches and no parsable times', () => {
    const schedule: ScheduleMatch[] = [
      createMatch(1, '2026-06-01T00:00:00.000Z', ''),
      createMatch(2, '2026-06-02T00:00:00.000Z', ''),
      createMatch(3, '2026-06-02T00:00:00.000Z', '')
    ];

    const statusBeforeDisable = calculateToggleStatus(schedule, new Date('2026-06-02T09:59:00.000Z'));
    const statusAtDisable = calculateToggleStatus(schedule, new Date('2026-06-02T10:00:00.000Z'));

    expect(statusBeforeDisable.shouldBeEnabled).toBe(false);
    expect(statusBeforeDisable.nextChangeAction).toBe('disable');
    expect(statusBeforeDisable.nextChangeTime?.toISOString()).toBe('2026-06-02T10:00:00.000Z');
    expect(statusAtDisable.nextChangeTime).toBeNull();
  });

  it('falls back to 2:00 PM GMT when next day has one match and no parsable times', () => {
    const schedule: ScheduleMatch[] = [
      createMatch(1, '2026-06-01T00:00:00.000Z', ''),
      createMatch(2, '2026-06-02T00:00:00.000Z', 'bad-time'),
    ];

    const statusBeforeDisable = calculateToggleStatus(schedule, new Date('2026-06-02T13:59:00.000Z'));
    const statusAtDisable = calculateToggleStatus(schedule, new Date('2026-06-02T14:00:00.000Z'));

    expect(statusBeforeDisable.shouldBeEnabled).toBe(false);
    expect(statusBeforeDisable.nextChangeAction).toBe('disable');
    expect(statusBeforeDisable.nextChangeTime?.toISOString()).toBe('2026-06-02T14:00:00.000Z');
    expect(statusAtDisable.nextChangeTime).toBeNull();
  });
});
