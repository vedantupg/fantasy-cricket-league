import type { ScheduleMatch } from '../types/database';

/**
 * Transfer Window Automation Utility
 * 
 * Automatically manages transfer window toggles based on match schedule:
 * - Automation only turns toggles OFF (opening is manual)
 * - Toggles turn OFF at:
 *   - Earliest parsable timeGMT (preferred)
 *   - Fallback fixed time by match count if no parsable timeGMT:
 *     - 10:00 AM GMT if next day has 2+ matches
 *     - 2:00 PM GMT if next day has 1 match
 * - A -5 minute buffer is applied to the cutoff time
 */

const DISABLE_BUFFER_MINUTES = -5;

export interface MatchDay {
  date: string; // Date key (e.g., "Sat, Feb 7 2026")
  dateObject: Date; // Actual date object for comparison
  firstParsedMatchTime: Date | null; // Earliest parsable GMT match time on this day
  matches: ScheduleMatch[];
}

export interface TransferWindow {
  startTime: Date; // Legacy field; not used when auto-open is disabled
  endTime: Date; // When toggles turn OFF
  isActive: boolean; // Whether window is currently active
}

export interface ToggleStatus {
  shouldBeEnabled: boolean; // Current desired state
  nextChangeTime: Date | null; // When the next toggle change will happen
  nextChangeAction: 'disable' | null; // What the next action will be
  currentWindow: TransferWindow | null; // Current transfer window info
  matchDaysInfo: {
    totalMatchDays: number;
    completedMatchDays: number;
    upcomingMatchDays: number;
  };
}

/**
 * Parse GMT time string and combine with date
 * Example: "5:30 AM" or "5:30 AM (GMT)" -> Date object in GMT
 */
function parseMatchTime(timeGMT: string, matchDate: Date): Date | null {
  if (!timeGMT || typeof timeGMT !== 'string') {
    return null;
  }

  const cleanTime = timeGMT
    .replace(/\(GMT\)/gi, '')
    .replace(/\bGMT\b/gi, '')
    .trim();

  const twelveHourMatch = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHourMatch) {
    let hours = parseInt(twelveHourMatch[1], 10);
    const minutes = parseInt(twelveHourMatch[2], 10);
    const meridiem = twelveHourMatch[3].toUpperCase();

    if (meridiem === 'PM' && hours !== 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }

    const date = new Date(matchDate);
    date.setUTCHours(hours, minutes, 0, 0);
    return date;
  }

  const twentyFourHourMatch = cleanTime.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (twentyFourHourMatch) {
    const hours = parseInt(twentyFourHourMatch[1], 10);
    const minutes = parseInt(twentyFourHourMatch[2], 10);
    const date = new Date(matchDate);
    date.setUTCHours(hours, minutes, 0, 0);
    return date;
  }

  return null;
}

/**
 * Extract unique match days from schedule and sort chronologically
 */
export function getMatchDays(schedule: ScheduleMatch[]): MatchDay[] {
  if (!schedule || schedule.length === 0) {
    return [];
  }

  // Group matches by date
  const matchesByDate = new Map<string, ScheduleMatch[]>();
  
  schedule.forEach(match => {
    const d = new Date(match.date);
    const dateKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    
    if (!matchesByDate.has(dateKey)) {
      matchesByDate.set(dateKey, []);
    }
    matchesByDate.get(dateKey)!.push(match);
  });

  // Create MatchDay objects
  const matchDays: MatchDay[] = [];
  
  matchesByDate.forEach((matches, dateKey) => {
    const sortedMatches = [...matches].sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));
    const firstMatch = sortedMatches[0];
    const parsedTimes = sortedMatches
      .map(match => parseMatchTime(match.timeGMT, match.date))
      .filter((time): time is Date => time !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    matchDays.push({
      date: dateKey,
      dateObject: firstMatch.date,
      firstParsedMatchTime: parsedTimes.length > 0 ? parsedTimes[0] : null,
      matches: sortedMatches
    });
  });

  // Sort match days chronologically
  matchDays.sort((a, b) => a.dateObject.getTime() - b.dateObject.getTime());

  return matchDays;
}

/**
 * Calculate when toggles turn OFF before next match day
 * Preference order:
 * 1) Earliest parsable timeGMT on the next match day
 * 2) Fallback fixed time by next-day match count:
 *    - 10:00 AM GMT for 2+ matches
 *    - 2:00 PM GMT for 1 match
 */
function calculateDisableTime(nextMatchDay: MatchDay): Date {
  if (nextMatchDay.firstParsedMatchTime) {
    const parsedBoundary = new Date(nextMatchDay.firstParsedMatchTime);
    parsedBoundary.setMinutes(parsedBoundary.getMinutes() + DISABLE_BUFFER_MINUTES);
    return parsedBoundary;
  }

  const disableTime = new Date(nextMatchDay.dateObject);
  const hasMultipleMatches = nextMatchDay.matches.length >= 2;
  disableTime.setUTCHours(hasMultipleMatches ? 10 : 14, 0, 0, 0);
  disableTime.setMinutes(disableTime.getMinutes() + DISABLE_BUFFER_MINUTES);
  return disableTime;
}

/**
 * Calculate all transfer windows based on match schedule
 */
export function calculateTransferWindows(schedule: ScheduleMatch[]): TransferWindow[] {
  // Auto-open is disabled by business rules; retained for API compatibility.
  return [];
}

/**
 * Determine if toggles should be enabled based on current time and schedule
 */
export function calculateToggleStatus(
  schedule: ScheduleMatch[],
  currentTime: Date = new Date()
): ToggleStatus {
  const matchDays = getMatchDays(schedule);

  // No schedule or no match days
  if (matchDays.length === 0) {
    return {
      shouldBeEnabled: false,
      nextChangeTime: null,
      nextChangeAction: null,
      currentWindow: null,
      matchDaysInfo: {
        totalMatchDays: 0,
        completedMatchDays: 0,
        upcomingMatchDays: 0
      }
    };
  }

  const disableBoundaries = matchDays
    .map(matchDay => calculateDisableTime(matchDay))
    .sort((a, b) => a.getTime() - b.getTime());

  const nextDisable = disableBoundaries.find(boundary => currentTime.getTime() < boundary.getTime()) || null;
  const completed = disableBoundaries.filter(boundary => boundary.getTime() <= currentTime.getTime()).length;

  return {
    shouldBeEnabled: false,
    nextChangeTime: nextDisable,
    nextChangeAction: nextDisable ? 'disable' : null,
    currentWindow: null,
    matchDaysInfo: {
      totalMatchDays: matchDays.length,
      completedMatchDays: completed,
      upcomingMatchDays: Math.max(disableBoundaries.length - completed, 0)
    }
  };
}

/**
 * Format time until next change for display
 */
export function formatTimeUntilChange(nextChangeTime: Date): string {
  const now = new Date();
  const diffMs = nextChangeTime.getTime() - now.getTime();

  if (diffMs < 0) {
    return 'now';
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    return `${diffDays}d ${remainingHours}h`;
  } else if (diffHours > 0) {
    const remainingMinutes = diffMinutes % 60;
    return `${diffHours}h ${remainingMinutes}m`;
  } else {
    return `${diffMinutes}m`;
  }
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}
