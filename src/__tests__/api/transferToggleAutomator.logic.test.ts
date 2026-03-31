import { getDisableBoundaries, getMatchDays, parseMatchTime, shouldDisableNow } from '../../../api/transfer-toggle-automator';

type RawMatch = {
  matchNumber: number;
  date: string;
  timeGMT: string;
};

function createSchedule(matches: RawMatch[]) {
  return matches.map((match) => ({
    matchNumber: match.matchNumber,
    date: new Date(match.date),
    timeGMT: match.timeGMT
  }));
}

describe('transfer-toggle-automator API logic', () => {
  it('parses 12-hour and 24-hour GMT time strings', () => {
    const matchDate = new Date('2026-06-02T00:00:00.000Z');

    expect(parseMatchTime('5:30 AM', matchDate)?.toISOString()).toBe('2026-06-02T05:30:00.000Z');
    expect(parseMatchTime('14:00', matchDate)?.toISOString()).toBe('2026-06-02T14:00:00.000Z');
    expect(parseMatchTime('invalid', matchDate)).toBeNull();
  });

  it('uses parsed next-day time when available', () => {
    const schedule = createSchedule([
      { matchNumber: 2, date: '2026-06-02T00:00:00.000Z', timeGMT: '11:30 AM' }
    ]);

    const boundaries = getDisableBoundaries(schedule);
    expect(boundaries[0].toISOString()).toBe('2026-06-02T11:30:00.000Z');
  });

  it('falls back to 10:00 GMT when day has 2+ matches and no parsable times', () => {
    const schedule = createSchedule([
      { matchNumber: 2, date: '2026-06-02T00:00:00.000Z', timeGMT: '' },
      { matchNumber: 3, date: '2026-06-02T00:00:00.000Z', timeGMT: '' }
    ]);

    const boundaries = getDisableBoundaries(schedule);
    expect(boundaries[0].toISOString()).toBe('2026-06-02T10:00:00.000Z');
  });

  it('falls back to 14:00 GMT when day has 1 match and no parsable times', () => {
    const schedule = createSchedule([
      { matchNumber: 2, date: '2026-06-02T00:00:00.000Z', timeGMT: '' }
    ]);

    const boundaries = getDisableBoundaries(schedule);
    expect(boundaries[0].toISOString()).toBe('2026-06-02T14:00:00.000Z');
  });

  it('returns true only once per reached boundary when last action is disabled', () => {
    const schedule = createSchedule([
      { matchNumber: 1, date: '2026-06-02T00:00:00.000Z', timeGMT: '' }
    ]);

    const boundaryTime = new Date('2026-06-02T14:00:00.000Z');
    expect(shouldDisableNow(schedule, boundaryTime, null, null)).toBe(true);
    expect(shouldDisableNow(schedule, new Date('2026-06-02T14:10:00.000Z'), new Date('2026-06-02T14:05:00.000Z'), 'disabled')).toBe(false);
  });

  it('groups by UTC day keys to avoid timezone drift', () => {
    const schedule = createSchedule([
      { matchNumber: 1, date: '2026-03-30T04:00:00.000Z', timeGMT: '' },
      { matchNumber: 2, date: '2026-03-30T20:00:00.000Z', timeGMT: '' }
    ]);

    const matchDays = getMatchDays(schedule);
    expect(matchDays).toHaveLength(1);
    expect(matchDays[0].date).toBe('2026-03-30');
  });
});
