import type { LiveScorecardMatch, LiveScorecardScore } from '../types/database';

export const TOURNAMENT_ABBREVIATIONS: Record<string, string> = {
  // IPL
  'indian premier league': 'IPL',
  // ICC men's
  'icc cricket world cup': 'ODI WC',
  'icc mens cricket world cup': 'ODI WC',
  'icc mens t20 world cup': 'T20 WC',
  'icc mens champions trophy': 'Champions Trophy',
  'icc world test championship': 'WTC',
  'icc mens cricket world cup super league': 'CWC Super League',
  // ICC women's
  'icc womens t20 world cup': "Women's T20 WC",
  'icc womens cricket world cup': "Women's ODI WC",
  'icc womens champions trophy': "Women's Champions Trophy",
  // Domestic T20 leagues
  'pakistan super league': 'PSL',
  'big bash league': 'BBL',
  'caribbean premier league': 'CPL',
  'sa20': 'SA20',
  'international league t20': 'ILT20',
  'major league cricket': 'MLC',
  'lanka premier league': 'LPL',
  'bangladesh premier league': 'BPL',
};

export function parseMatchMeta(name: string): { matchNumber: string | null; tournament: string | null } {
  const parts = name.split(',').map(s => s.trim());
  if (parts.length < 3) return { matchNumber: null, tournament: null };

  const matchNumber = parts[1] || null;
  const rawTournament = parts.slice(2).join(', ').trim();

  const yearMatch = rawTournament.match(/\b(20\d{2})\b/);
  const year = yearMatch ? ` ${yearMatch[1]}` : '';
  const nameOnly = rawTournament.replace(/\b20\d{2}\b/, '').trim().replace(/,?\s*$/, '');
  const key = nameOnly.toLowerCase();
  const short = TOURNAMENT_ABBREVIATIONS[key];
  const tournament = short ? `${short}${year}` : rawTournament;

  return { matchNumber, tournament };
}

export function formatScoreLine(score: LiveScorecardScore): string {
  const overs = Number.isInteger(score.o) ? `${score.o}` : `${score.o.toFixed(1)}`;
  return `${score.r}/${score.w} (${overs})`;
}

export type StatusKind = 'live' | 'completed' | 'upcoming' | 'cancelled';

export function getStatusKind(match: LiveScorecardMatch): StatusKind {
  const status = (match.status || '').toLowerCase();
  if (
    status.includes('cancel') ||
    status.includes('abandon') ||
    status.includes('no result')
  ) {
    return 'cancelled';
  }
  if (match.matchEnded) return 'completed';
  if (match.matchStarted) return 'live';
  return 'upcoming';
}

export function findTeamScore(scores: LiveScorecardScore[], teamName: string): LiveScorecardScore | null {
  const lower = (teamName || '').toLowerCase();
  return (
    scores.find((s) => (s.inning || '').toLowerCase().includes(lower)) || null
  );
}

/**
 * Per-tournament smart selection.
 *
 * Groups matches by tournament, then for each tournament picks at most 2 cards:
 *   - If a live match exists  → live + upcoming
 *   - If no live match        → most recent completed + upcoming
 *
 * Final sort: live → completed → upcoming.
 */
export function selectForDisplay(all: LiveScorecardMatch[]): LiveScorecardMatch[] {
  if (all.length === 0) return [];

  const groups = new Map<string, LiveScorecardMatch[]>();
  for (const m of all) {
    const { tournament } = parseMatchMeta(m.name);
    const key = tournament ?? '__unknown__';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  const result: LiveScorecardMatch[] = [];

  for (const group of Array.from(groups.values())) {
    const live      = group.find(m => m.matchStarted && !m.matchEnded);
    const upcoming  = group.find(m => !m.matchStarted && !m.matchEnded);
    const completed = group.find(m => m.matchEnded);

    if (live) {
      result.push(live);
    } else if (completed) {
      result.push(completed);
    }

    if (upcoming) result.push(upcoming);
  }

  return result.sort((a, b) => {
    const tier = (m: LiveScorecardMatch) =>
      m.matchStarted && !m.matchEnded ? 0 : m.matchEnded ? 1 : 2;
    return tier(a) - tier(b);
  });
}
