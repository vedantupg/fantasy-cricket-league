import {
  getMatchDays,
  getMatchWindowForDay,
  isWithinAnyMatchWindow,
  normalizeTeamName,
  teamsMatch,
  collectScheduledFixtures,
  filterMatchesByLeagueSchedules,
  buildUpcomingPlaceholders,
  sortMatchesForDisplay,
  shapeMatchForFirestore,
} from '../../../api/cricket-live-scorecard';

type RawMatch = {
  matchNumber: number;
  date: string;
  timeGMT: string;
  team1?: string;
  team2?: string;
};

function createSchedule(matches: RawMatch[]) {
  return matches.map((m) => ({
    matchNumber: m.matchNumber,
    date: new Date(m.date),
    timeGMT: m.timeGMT,
    team1: m.team1 || 'Team A',
    team2: m.team2 || 'Team B',
  }));
}

describe('cricket-live-scorecard match window calculation', () => {
  it('uses earliestStart - 5min as window start when timeGMT is parsable', () => {
    const schedule = createSchedule([
      { matchNumber: 1, date: '2026-04-29T00:00:00.000Z', timeGMT: '14:00' },
    ]);
    const days = getMatchDays(schedule);
    const { start, end } = getMatchWindowForDay(days[0]);

    expect(start.toISOString()).toBe('2026-04-29T13:55:00.000Z');
    // latestStart (14:00) + 4h
    expect(end.toISOString()).toBe('2026-04-29T18:00:00.000Z');
  });

  it('spans earliest to latest + 4h on a doubleheader day', () => {
    const schedule = createSchedule([
      { matchNumber: 1, date: '2026-04-29T00:00:00.000Z', timeGMT: '10:00' },
      { matchNumber: 2, date: '2026-04-29T00:00:00.000Z', timeGMT: '14:00' },
    ]);
    const days = getMatchDays(schedule);
    const { start, end } = getMatchWindowForDay(days[0]);

    expect(start.toISOString()).toBe('2026-04-29T09:55:00.000Z');
    expect(end.toISOString()).toBe('2026-04-29T18:00:00.000Z');
  });

  it('falls back to 14:00 UTC start for single-match days with no parsable time', () => {
    const schedule = createSchedule([
      { matchNumber: 1, date: '2026-04-29T00:00:00.000Z', timeGMT: '' },
    ]);
    const days = getMatchDays(schedule);
    const { start, end } = getMatchWindowForDay(days[0]);

    expect(start.toISOString()).toBe('2026-04-29T13:55:00.000Z');
    // Single match fallback adds the standard 4h window
    expect(end.toISOString()).toBe('2026-04-29T17:55:00.000Z');
  });

  it('falls back to 10:00 UTC start (with extra cushion) for 2+ match days with no parsable time', () => {
    const schedule = createSchedule([
      { matchNumber: 1, date: '2026-04-29T00:00:00.000Z', timeGMT: '' },
      { matchNumber: 2, date: '2026-04-29T00:00:00.000Z', timeGMT: '' },
    ]);
    const days = getMatchDays(schedule);
    const { start, end } = getMatchWindowForDay(days[0]);

    expect(start.toISOString()).toBe('2026-04-29T09:55:00.000Z');
    // 4h base + 4h extra cushion for the second match = 8h
    expect(end.toISOString()).toBe('2026-04-29T17:55:00.000Z');
  });
});

describe('cricket-live-scorecard isWithinAnyMatchWindow', () => {
  const schedule = createSchedule([
    { matchNumber: 1, date: '2026-04-29T00:00:00.000Z', timeGMT: '14:00' },
    { matchNumber: 2, date: '2026-04-30T00:00:00.000Z', timeGMT: '14:00' },
  ]);

  it('is INACTIVE before the earliest match starts (with 5-min buffer)', () => {
    const before = new Date('2026-04-29T13:54:00.000Z');
    const result = isWithinAnyMatchWindow([schedule], before);
    expect(result.active).toBe(false);
  });

  it('is ACTIVE exactly at the buffered start (T-5min)', () => {
    const at = new Date('2026-04-29T13:55:00.000Z');
    const result = isWithinAnyMatchWindow([schedule], at);
    expect(result.active).toBe(true);
    expect(result.day).toBe('2026-04-29');
  });

  it('is ACTIVE during play (T+1h)', () => {
    const during = new Date('2026-04-29T15:00:00.000Z');
    const result = isWithinAnyMatchWindow([schedule], during);
    expect(result.active).toBe(true);
  });

  it('is INACTIVE after the post-match window closes (start + 4h)', () => {
    const after = new Date('2026-04-29T18:01:00.000Z');
    const result = isWithinAnyMatchWindow([schedule], after);
    expect(result.active).toBe(false);
  });

  it('handles non-match days as INACTIVE', () => {
    const offDay = new Date('2026-05-15T15:00:00.000Z');
    const result = isWithinAnyMatchWindow([schedule], offDay);
    expect(result.active).toBe(false);
  });

  it('returns ACTIVE if ANY of multiple league schedules has a window open', () => {
    const otherLeague = createSchedule([
      { matchNumber: 1, date: '2026-04-29T00:00:00.000Z', timeGMT: '15:00' }, // T20 starts later
    ]);
    const at = new Date('2026-04-29T15:30:00.000Z');
    const result = isWithinAnyMatchWindow([schedule, otherLeague], at);
    expect(result.active).toBe(true);
  });
});

describe('cricket-live-scorecard team-name normalization', () => {
  it('normalizes whitespace, punctuation, and case', () => {
    expect(normalizeTeamName('Royal Challengers Bengaluru'))
      .toBe(normalizeTeamName('royal challengers bengaluru'));
    expect(normalizeTeamName('Mumbai-Indians')).toBe('mumbaiindians');
  });

  it('matches teams via short-form aliases (CSK <-> Chennai Super Kings)', () => {
    expect(teamsMatch('CSK', 'Chennai Super Kings')).toBe(true);
    expect(teamsMatch('Chennai Super Kings', 'csk')).toBe(true);
  });

  it('matches Bengaluru/Bangalore variants of RCB', () => {
    expect(teamsMatch('Royal Challengers Bengaluru', 'Royal Challengers Bangalore')).toBe(true);
    expect(teamsMatch('RCB', 'Royal Challengers Bangalore')).toBe(true);
  });

  it('returns false for unrelated teams', () => {
    expect(teamsMatch('Mumbai Indians', 'Chennai Super Kings')).toBe(false);
    expect(teamsMatch('CSK', 'MI')).toBe(false);
  });
});

describe('cricket-live-scorecard filterMatchesByLeagueSchedules', () => {
  const schedule = createSchedule([
    {
      matchNumber: 1,
      date: '2026-04-28T00:00:00.000Z',
      timeGMT: '14:00',
      team1: 'Punjab Kings',
      team2: 'Rajasthan Royals',
    },
    {
      matchNumber: 2,
      date: '2026-04-29T00:00:00.000Z',
      timeGMT: '14:00',
      team1: 'Mumbai Indians',
      team2: 'Chennai Super Kings',
    },
  ]);

  const todayMid = new Date('2026-04-29T15:00:00.000Z');

  it('keeps a live match whose teams match today\'s schedule (default lookback=1)', () => {
    const apiMatches = [
      {
        id: 'm1',
        teams: ['Mumbai Indians', 'Chennai Super Kings'],
        teamInfo: [],
        dateTimeGMT: '2026-04-29T14:00:00',
      },
    ];
    const out = filterMatchesByLeagueSchedules(apiMatches, [schedule], todayMid);
    expect(out).toHaveLength(1);
  });

  it('keeps yesterday\'s completed match (lookback=1) so leaderboard always shows context', () => {
    const apiMatches = [
      {
        id: 'm-yesterday',
        teams: ['Punjab Kings', 'Rajasthan Royals'],
        teamInfo: [],
        dateTimeGMT: '2026-04-28T14:00:00',
        matchEnded: true,
      },
    ];
    const out = filterMatchesByLeagueSchedules(apiMatches, [schedule], todayMid);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('m-yesterday');
  });

  it('drops yesterday\'s match when lookbackDays=0 (today-only)', () => {
    const apiMatches = [
      {
        id: 'm-yesterday',
        teams: ['Punjab Kings', 'Rajasthan Royals'],
        teamInfo: [],
        dateTimeGMT: '2026-04-28T14:00:00',
      },
    ];
    const out = filterMatchesByLeagueSchedules(apiMatches, [schedule], todayMid, 0);
    expect(out).toHaveLength(0);
  });

  it('keeps a match when API uses short forms (MI / CSK)', () => {
    const apiMatches = [
      {
        id: 'm1',
        teams: ['MI', 'CSK'],
        teamInfo: [],
        dateTimeGMT: '2026-04-29T14:00:00',
      },
    ];
    const out = filterMatchesByLeagueSchedules(apiMatches, [schedule], todayMid);
    expect(out).toHaveLength(1);
  });

  it('drops matches from 2+ days ago (outside the default lookback window)', () => {
    const apiMatches = [
      {
        id: 'm-old',
        teams: ['Mumbai Indians', 'Chennai Super Kings'],
        teamInfo: [],
        dateTimeGMT: '2026-04-25T14:00:00',
      },
    ];
    const out = filterMatchesByLeagueSchedules(apiMatches, [schedule], todayMid);
    expect(out).toHaveLength(0);
  });

  it('drops matches whose teams do not appear in any schedule', () => {
    const apiMatches = [
      {
        id: 'm2',
        teams: ['Australia', 'India'],
        teamInfo: [],
        dateTimeGMT: '2026-04-29T14:00:00',
      },
    ];
    const out = filterMatchesByLeagueSchedules(apiMatches, [schedule], todayMid);
    expect(out).toHaveLength(0);
  });

  it('returns empty list when no schedules cover today or yesterday', () => {
    const offDayMid = new Date('2026-05-15T15:00:00.000Z');
    const apiMatches = [
      {
        id: 'm1',
        teams: ['Mumbai Indians', 'Chennai Super Kings'],
        teamInfo: [],
        dateTimeGMT: '2026-05-15T14:00:00',
      },
    ];
    const out = filterMatchesByLeagueSchedules(apiMatches, [schedule], offDayMid);
    expect(out).toHaveLength(0);
  });

  it('matches across multiple schedules (any league hit is sufficient)', () => {
    const otherLeague = createSchedule([
      {
        matchNumber: 1,
        date: '2026-04-29T00:00:00.000Z',
        timeGMT: '14:00',
        team1: 'Royal Challengers Bengaluru',
        team2: 'Kolkata Knight Riders',
      },
    ]);
    const apiMatches = [
      {
        id: 'm-rcb',
        teams: ['RCB', 'KKR'],
        teamInfo: [],
        dateTimeGMT: '2026-04-29T14:00:00',
      },
      {
        id: 'm-mi',
        teams: ['MI', 'CSK'],
        teamInfo: [],
        dateTimeGMT: '2026-04-29T14:00:00',
      },
    ];
    const out = filterMatchesByLeagueSchedules(apiMatches, [schedule, otherLeague], todayMid);
    expect(out.map((m: any) => m.id).sort()).toEqual(['m-mi', 'm-rcb']);
  });
});

describe('cricket-live-scorecard buildUpcomingPlaceholders', () => {
  const schedule = createSchedule([
    {
      matchNumber: 1,
      date: '2026-04-29T00:00:00.000Z',
      timeGMT: '14:00',
      team1: 'Rajasthan Royals',
      team2: 'Delhi Capitals',
    },
  ]);
  const todayMid = new Date('2026-04-29T10:00:00.000Z'); // before kickoff

  it('emits a placeholder when today\'s fixture is not in the API response', () => {
    const placeholders = buildUpcomingPlaceholders([schedule], todayMid, []);
    expect(placeholders).toHaveLength(1);
    expect(placeholders[0]).toMatchObject({
      name: 'Rajasthan Royals vs Delhi Capitals, 1st Match',
      matchStarted: false,
      matchEnded: false,
    });
    expect(placeholders[0].id).toContain('placeholder-');
  });

  it('does NOT emit a placeholder when today\'s fixture is already in the existing matches', () => {
    const existing = [
      {
        teams: [
          { name: 'Rajasthan Royals' },
          { name: 'Delhi Capitals' },
        ],
        dateTimeGMT: '2026-04-29T14:00:00',
      },
    ];
    const placeholders = buildUpcomingPlaceholders([schedule], todayMid, existing as any);
    expect(placeholders).toHaveLength(0);
  });

  it('matches existing API match by team aliases (RR/DC short forms)', () => {
    const existing = [
      {
        teams: [{ name: 'RR' }, { name: 'DC' }],
        dateTimeGMT: '2026-04-29T14:00:00',
      },
    ];
    const placeholders = buildUpcomingPlaceholders([schedule], todayMid, existing as any);
    expect(placeholders).toHaveLength(0);
  });

  it('emits no placeholder on an off day', () => {
    const offDay = new Date('2026-05-15T10:00:00.000Z');
    const placeholders = buildUpcomingPlaceholders([schedule], offDay, []);
    expect(placeholders).toHaveLength(0);
  });
});

describe('cricket-live-scorecard collectScheduledFixtures', () => {
  const schedule = createSchedule([
    { matchNumber: 1, date: '2026-04-27T00:00:00.000Z', timeGMT: '14:00', team1: 'A', team2: 'B' },
    { matchNumber: 2, date: '2026-04-28T00:00:00.000Z', timeGMT: '14:00', team1: 'C', team2: 'D' },
    { matchNumber: 3, date: '2026-04-29T00:00:00.000Z', timeGMT: '14:00', team1: 'E', team2: 'F' },
    { matchNumber: 4, date: '2026-04-30T00:00:00.000Z', timeGMT: '14:00', team1: 'G', team2: 'H' },
  ]);
  const today = new Date('2026-04-29T15:00:00.000Z');

  it('default (lookback=1, lookahead=0) covers yesterday + today', () => {
    const fixtures = collectScheduledFixtures([schedule], today);
    expect(fixtures.map((f: any) => f.team1).sort()).toEqual(['C', 'E']);
  });

  it('lookback=0, lookahead=0 covers today only', () => {
    const fixtures = collectScheduledFixtures([schedule], today, 0, 0);
    expect(fixtures.map((f: any) => f.team1)).toEqual(['E']);
  });

  it('lookback=0, lookahead=1 covers today + tomorrow', () => {
    const fixtures = collectScheduledFixtures([schedule], today, 0, 1);
    expect(fixtures.map((f: any) => f.team1).sort()).toEqual(['E', 'G']);
  });
});

describe('cricket-live-scorecard sortMatchesForDisplay', () => {
  const today = new Date('2026-04-29T15:00:00.000Z');

  function shaped(props: any) {
    return {
      teams: [],
      score: [],
      ...props,
    };
  }

  it('orders live > today-upcoming > today-completed > older-completed', () => {
    const matches = [
      shaped({ id: 'older', dateTimeGMT: '2026-04-28T14:00:00', matchStarted: true, matchEnded: true }),
      shaped({ id: 'today-done', dateTimeGMT: '2026-04-29T10:00:00', matchStarted: true, matchEnded: true }),
      shaped({ id: 'today-upcoming', dateTimeGMT: '2026-04-29T18:00:00', matchStarted: false, matchEnded: false }),
      shaped({ id: 'live', dateTimeGMT: '2026-04-29T14:00:00', matchStarted: true, matchEnded: false }),
    ];
    const out = sortMatchesForDisplay(matches, today);
    expect(out.map((m: any) => m.id)).toEqual(['live', 'today-upcoming', 'today-done', 'older']);
  });
});

describe('cricket-live-scorecard shapeMatchForFirestore', () => {
  it('extracts teams, scores, and status into a stable client-friendly shape', () => {
    const apiMatch = {
      id: 'abc123',
      name: 'Mumbai Indians vs Chennai Super Kings, 23rd Match',
      matchType: 't20',
      status: 'Mumbai Indians won by 5 wickets',
      venue: 'Wankhede Stadium, Mumbai',
      dateTimeGMT: '2026-04-29T14:00:00',
      matchStarted: true,
      matchEnded: true,
      teams: ['Mumbai Indians', 'Chennai Super Kings'],
      teamInfo: [
        { name: 'Mumbai Indians', shortname: 'MI', img: 'https://example.com/mi.png' },
        { name: 'Chennai Super Kings', shortname: 'CSK', img: 'https://example.com/csk.png' },
      ],
      score: [
        { inning: 'Chennai Super Kings Inning 1', r: 156, w: 6, o: 20 },
        { inning: 'Mumbai Indians Inning 1', r: 157, w: 5, o: 18.4 },
      ],
    };

    const shaped = shapeMatchForFirestore(apiMatch);

    expect(shaped.id).toBe('abc123');
    expect(shaped.matchEnded).toBe(true);
    expect(shaped.teams).toEqual([
      { name: 'Mumbai Indians', shortName: 'MI', img: 'https://example.com/mi.png' },
      { name: 'Chennai Super Kings', shortName: 'CSK', img: 'https://example.com/csk.png' },
    ]);
    expect(shaped.score).toHaveLength(2);
    expect(shaped.score[1]).toEqual({ inning: 'Mumbai Indians Inning 1', r: 157, w: 5, o: 18.4 });
  });

  it('handles missing teamInfo gracefully (no img, no shortname)', () => {
    const apiMatch = {
      id: 'x',
      name: '',
      teams: ['Foo', 'Bar'],
      teamInfo: [],
      score: [],
    };
    const shaped = shapeMatchForFirestore(apiMatch);
    expect(shaped.teams).toEqual([
      { name: 'Foo', shortName: null, img: null },
      { name: 'Bar', shortName: null, img: null },
    ]);
    expect(shaped.score).toEqual([]);
  });
});
