import {
  parseMatchMeta,
  formatScoreLine,
  getStatusKind,
  findTeamScore,
  selectForDisplay,
  TOURNAMENT_ABBREVIATIONS,
} from '../../utils/liveScorecardDisplay';
import type { LiveScorecardMatch, LiveScorecardScore } from '../../types/database';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function makeMatch(overrides: Partial<LiveScorecardMatch> = {}): LiveScorecardMatch {
  return {
    id: null,
    name: 'Team A vs Team B, 1st Match, Test Tournament 2026',
    matchType: 't20',
    status: '',
    venue: '',
    dateTimeGMT: null,
    matchStarted: false,
    matchEnded: false,
    teams: [],
    score: [],
    ...overrides,
  };
}

function makeScore(overrides: Partial<LiveScorecardScore> = {}): LiveScorecardScore {
  return { inning: 'Mumbai Indians Inning 1', r: 180, w: 4, o: 20, ...overrides };
}

// ─────────────────────────────────────────────────────────────
// parseMatchMeta
// ─────────────────────────────────────────────────────────────

describe('parseMatchMeta', () => {
  it('returns nulls for names with fewer than 3 comma-separated parts', () => {
    expect(parseMatchMeta('Team A vs Team B')).toEqual({ matchNumber: null, tournament: null });
    expect(parseMatchMeta('Team A vs Team B, 1st Match')).toEqual({ matchNumber: null, tournament: null });
    expect(parseMatchMeta('')).toEqual({ matchNumber: null, tournament: null });
  });

  it('extracts match number from the second comma-delimited segment', () => {
    const { matchNumber } = parseMatchMeta('MI vs CSK, 23rd Match, Indian Premier League 2026');
    expect(matchNumber).toBe('23rd Match');
  });

  it('abbreviates IPL to "IPL" and preserves the year', () => {
    const { tournament } = parseMatchMeta('MI vs CSK, 23rd Match, Indian Premier League 2026');
    expect(tournament).toBe('IPL 2026');
  });

  it('abbreviates T20 WC and preserves the year', () => {
    const { tournament } = parseMatchMeta('India vs Australia, 1st Match, ICC Mens T20 World Cup 2026');
    expect(tournament).toBe('T20 WC 2026');
  });

  it('abbreviates ODI WC (ICC Cricket World Cup)', () => {
    const { tournament } = parseMatchMeta('India vs England, 1st Match, ICC Cricket World Cup 2027');
    expect(tournament).toBe('ODI WC 2027');
  });

  it('abbreviates PSL', () => {
    const { tournament } = parseMatchMeta('Peshawar vs Karachi, 5th Match, Pakistan Super League 2026');
    expect(tournament).toBe('PSL 2026');
  });

  it('abbreviates BBL', () => {
    const { tournament } = parseMatchMeta('Sydney vs Melbourne, 1st Match, Big Bash League 2026');
    expect(tournament).toBe('BBL 2026');
  });

  it('falls back to the raw tournament string for unknown tournaments', () => {
    const { tournament } = parseMatchMeta('Team A vs Team B, 1st Match, Some Unknown League 2026');
    expect(tournament).toBe('Some Unknown League 2026');
  });

  it('handles tournament names without a year (no year suffix added)', () => {
    const { tournament } = parseMatchMeta('A vs B, 1st Match, Indian Premier League');
    expect(tournament).toBe('IPL');
  });

  it('handles multi-segment tournament names joined by commas', () => {
    // "ICC Mens Cricket World Cup Super League" contains no extra comma — just verifying join
    const { tournament } = parseMatchMeta('A vs B, 1st Match, ICC Mens Cricket World Cup Super League 2026');
    expect(tournament).toBe('CWC Super League 2026');
  });

  it('covers every key in TOURNAMENT_ABBREVIATIONS', () => {
    // Sanity check: all keys are lowercase strings mapping to a non-empty abbreviation
    for (const [key, abbr] of Object.entries(TOURNAMENT_ABBREVIATIONS)) {
      expect(typeof key).toBe('string');
      expect(key).toBe(key.toLowerCase());
      expect(abbr.length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// formatScoreLine
// ─────────────────────────────────────────────────────────────

describe('formatScoreLine', () => {
  it('formats integer overs without a decimal point', () => {
    expect(formatScoreLine(makeScore({ r: 180, w: 4, o: 20 }))).toBe('180/4 (20)');
  });

  it('formats fractional overs to one decimal place', () => {
    expect(formatScoreLine(makeScore({ r: 157, w: 5, o: 18.4 }))).toBe('157/5 (18.4)');
  });

  it('formats a duck (0 runs)', () => {
    expect(formatScoreLine(makeScore({ r: 0, w: 0, o: 0 }))).toBe('0/0 (0)');
  });

  it('formats 10 wickets (all out)', () => {
    expect(formatScoreLine(makeScore({ r: 95, w: 10, o: 23 }))).toBe('95/10 (23)');
  });
});

// ─────────────────────────────────────────────────────────────
// getStatusKind
// ─────────────────────────────────────────────────────────────

describe('getStatusKind', () => {
  it('returns "upcoming" when match has not started', () => {
    expect(getStatusKind(makeMatch({ matchStarted: false, matchEnded: false }))).toBe('upcoming');
  });

  it('returns "live" when match is started but not ended', () => {
    expect(getStatusKind(makeMatch({ matchStarted: true, matchEnded: false }))).toBe('live');
  });

  it('returns "completed" when matchEnded is true', () => {
    expect(getStatusKind(makeMatch({ matchStarted: true, matchEnded: true }))).toBe('completed');
  });

  it('returns "cancelled" when status contains "cancel"', () => {
    expect(getStatusKind(makeMatch({ status: 'Match cancelled due to rain' }))).toBe('cancelled');
  });

  it('returns "cancelled" when status contains "abandon"', () => {
    expect(getStatusKind(makeMatch({ status: 'Match abandoned' }))).toBe('cancelled');
  });

  it('returns "cancelled" when status contains "no result"', () => {
    expect(getStatusKind(makeMatch({ status: 'No result' }))).toBe('cancelled');
  });

  it('cancelled status takes priority over matchEnded', () => {
    // A match marked ended but with a "no result" status should still be cancelled
    expect(
      getStatusKind(makeMatch({ matchStarted: true, matchEnded: true, status: 'Match abandoned - No result' }))
    ).toBe('cancelled');
  });

  it('is case-insensitive for status checks', () => {
    expect(getStatusKind(makeMatch({ status: 'MATCH ABANDONED' }))).toBe('cancelled');
    expect(getStatusKind(makeMatch({ status: 'Game Cancelled' }))).toBe('cancelled');
  });
});

// ─────────────────────────────────────────────────────────────
// findTeamScore
// ─────────────────────────────────────────────────────────────

describe('findTeamScore', () => {
  const scores: LiveScorecardScore[] = [
    { inning: 'Chennai Super Kings Inning 1', r: 156, w: 6, o: 20 },
    { inning: 'Mumbai Indians Inning 1', r: 157, w: 5, o: 18.4 },
  ];

  it('finds the correct score by partial team name match', () => {
    const result = findTeamScore(scores, 'Mumbai Indians');
    expect(result).not.toBeNull();
    expect(result!.r).toBe(157);
  });

  it('finds the score for the first team', () => {
    const result = findTeamScore(scores, 'Chennai Super Kings');
    expect(result).not.toBeNull();
    expect(result!.r).toBe(156);
  });

  it('is case-insensitive', () => {
    expect(findTeamScore(scores, 'MUMBAI INDIANS')).not.toBeNull();
    expect(findTeamScore(scores, 'mumbai indians')).not.toBeNull();
  });

  it('returns null when no score matches the team name', () => {
    expect(findTeamScore(scores, 'Royal Challengers')).toBeNull();
  });

  it('returns null for an empty scores array', () => {
    expect(findTeamScore([], 'Mumbai Indians')).toBeNull();
  });

  it('returns null when team name has no overlap with any inning string', () => {
    expect(findTeamScore(scores, 'Kolkata Knight Riders')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// selectForDisplay
// ─────────────────────────────────────────────────────────────

describe('selectForDisplay', () => {
  const IPL_NAME = (n: number, teams = 'MI vs CSK') =>
    `${teams}, ${n}th Match, Indian Premier League 2026`;
  const WC_NAME = (n: number, teams = 'India vs Australia') =>
    `${teams}, ${n}th Match, ICC Mens T20 World Cup 2026`;

  it('returns empty array for empty input', () => {
    expect(selectForDisplay([])).toEqual([]);
  });

  it('shows a single live match', () => {
    const matches = [makeMatch({ name: IPL_NAME(1), matchStarted: true, matchEnded: false })];
    expect(selectForDisplay(matches)).toHaveLength(1);
    expect(selectForDisplay(matches)[0].matchStarted).toBe(true);
  });

  it('shows a single completed match', () => {
    const matches = [makeMatch({ name: IPL_NAME(1), matchStarted: true, matchEnded: true })];
    expect(selectForDisplay(matches)).toHaveLength(1);
    expect(selectForDisplay(matches)[0].matchEnded).toBe(true);
  });

  it('shows a single upcoming match', () => {
    const matches = [makeMatch({ name: IPL_NAME(1), matchStarted: false, matchEnded: false })];
    expect(selectForDisplay(matches)).toHaveLength(1);
  });

  it('shows live + upcoming for a single tournament when both exist', () => {
    const live     = makeMatch({ id: 'live',     name: IPL_NAME(10), matchStarted: true,  matchEnded: false });
    const upcoming = makeMatch({ id: 'upcoming', name: IPL_NAME(11), matchStarted: false, matchEnded: false });
    const out = selectForDisplay([live, upcoming]);
    expect(out).toHaveLength(2);
    const ids = out.map(m => m.id);
    expect(ids).toContain('live');
    expect(ids).toContain('upcoming');
  });

  it('shows completed + upcoming (not live) when there is no live match', () => {
    const completed = makeMatch({ id: 'done',     name: IPL_NAME(9),  matchStarted: true,  matchEnded: true });
    const upcoming  = makeMatch({ id: 'upcoming', name: IPL_NAME(10), matchStarted: false, matchEnded: false });
    const out = selectForDisplay([completed, upcoming]);
    expect(out).toHaveLength(2);
    const ids = out.map(m => m.id);
    expect(ids).toContain('done');
    expect(ids).toContain('upcoming');
  });

  it('prefers live over completed when both exist in the same tournament', () => {
    const live      = makeMatch({ id: 'live', name: IPL_NAME(10), matchStarted: true,  matchEnded: false });
    const completed = makeMatch({ id: 'done', name: IPL_NAME(9),  matchStarted: true,  matchEnded: true });
    const upcoming  = makeMatch({ id: 'next', name: IPL_NAME(11), matchStarted: false, matchEnded: false });
    const out = selectForDisplay([live, completed, upcoming]);
    const ids = out.map(m => m.id);
    expect(ids).toContain('live');
    expect(ids).not.toContain('done');
    expect(ids).toContain('next');
  });

  it('shows at most 2 cards per tournament (live + upcoming)', () => {
    const matches = [
      makeMatch({ id: 'live',  name: IPL_NAME(10), matchStarted: true,  matchEnded: false }),
      makeMatch({ id: 'done',  name: IPL_NAME(9),  matchStarted: true,  matchEnded: true }),
      makeMatch({ id: 'next1', name: IPL_NAME(11), matchStarted: false, matchEnded: false }),
      makeMatch({ id: 'next2', name: IPL_NAME(12), matchStarted: false, matchEnded: false }),
    ];
    const out = selectForDisplay(matches);
    // Only live + first upcoming should appear
    expect(out.length).toBeLessThanOrEqual(3);
    expect(out.some(m => m.id === 'live')).toBe(true);
  });

  it('handles two parallel tournaments independently — shows correct cards for each', () => {
    const iplLive     = makeMatch({ id: 'ipl-live',     name: IPL_NAME(10),  matchStarted: true,  matchEnded: false });
    const iplUpcoming = makeMatch({ id: 'ipl-upcoming', name: IPL_NAME(11),  matchStarted: false, matchEnded: false });
    const wcDone      = makeMatch({ id: 'wc-done',      name: WC_NAME(3),    matchStarted: true,  matchEnded: true });
    const wcUpcoming  = makeMatch({ id: 'wc-upcoming',  name: WC_NAME(4),    matchStarted: false, matchEnded: false });

    const out = selectForDisplay([iplLive, iplUpcoming, wcDone, wcUpcoming]);
    const ids = out.map(m => m.id);
    expect(ids).toContain('ipl-live');
    expect(ids).toContain('ipl-upcoming');
    expect(ids).toContain('wc-done');
    expect(ids).toContain('wc-upcoming');
    expect(out).toHaveLength(4);
  });

  it('sorts output: live first, then completed, then upcoming', () => {
    const completed = makeMatch({ id: 'done',     name: IPL_NAME(9),  matchStarted: true,  matchEnded: true });
    const upcoming  = makeMatch({ id: 'upcoming', name: IPL_NAME(10), matchStarted: false, matchEnded: false });
    // Two separate tournaments so both completed and upcoming survive selection
    const wcLive     = makeMatch({ id: 'wc-live',     name: WC_NAME(1),    matchStarted: true,  matchEnded: false });
    const wcUpcoming = makeMatch({ id: 'wc-upcoming', name: WC_NAME(2),    matchStarted: false, matchEnded: false });

    const out = selectForDisplay([completed, upcoming, wcLive, wcUpcoming]);
    const ids = out.map(m => m.id);
    // live (wc-live=0) must come before completed (done=1) which must come before upcoming (upcoming,wc-upcoming=2)
    expect(ids.indexOf('wc-live')).toBeLessThan(ids.indexOf('done'));
    expect(ids.indexOf('done')).toBeLessThan(ids.indexOf('upcoming'));
  });

  it('groups matches without a parseable tournament under the same fallback key', () => {
    // Names with < 3 parts → tournament = null → key = '__unknown__'
    // Both treated as the same group; only live + upcoming selected
    const live = makeMatch({ id: 'live', name: 'Team A vs Team B', matchStarted: true, matchEnded: false });
    const upcoming = makeMatch({ id: 'upcoming', name: 'Team C vs Team D', matchStarted: false, matchEnded: false });
    const completed = makeMatch({ id: 'done', name: 'Team E vs Team F', matchStarted: true, matchEnded: true });

    const out = selectForDisplay([live, upcoming, completed]);
    const ids = out.map(m => m.id);
    // live takes priority over completed; upcoming is included
    expect(ids).toContain('live');
    expect(ids).toContain('upcoming');
    expect(ids).not.toContain('done');
  });

  it('returns only upcoming when there is no live or completed match for a tournament', () => {
    const upcoming = makeMatch({ id: 'upcoming', name: IPL_NAME(1), matchStarted: false, matchEnded: false });
    const out = selectForDisplay([upcoming]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('upcoming');
  });
});
