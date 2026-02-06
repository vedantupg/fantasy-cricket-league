import type { ScheduleMatch } from '../types/database';

/**
 * Transfer Window Automation Utility
 * 
 * Automatically manages transfer window toggles based on match schedule:
 * - Toggles turn ON after last match of the day ends (7:30 PM GMT)
 * - Toggles turn OFF 15 minutes before first match of next match day
 * - After the last match day, toggles remain OFF
 */

export interface MatchDay {
  date: string; // Date key (e.g., "Sat, Feb 7 2026")
  dateObject: Date; // Actual date object for comparison
  firstMatchTime: Date; // GMT time of first match on this day
  lastMatchTime: Date; // GMT time of last match on this day (start time)
  matches: ScheduleMatch[];
}

export interface TransferWindow {
  startTime: Date; // When toggles turn ON (7:30 PM GMT on match day)
  endTime: Date; // When toggles turn OFF (15 mins before next match day)
  isActive: boolean; // Whether window is currently active
}

export interface ToggleStatus {
  shouldBeEnabled: boolean; // Current desired state
  nextChangeTime: Date | null; // When the next toggle change will happen
  nextChangeAction: 'enable' | 'disable' | null; // What the next action will be
  currentWindow: TransferWindow | null; // Current transfer window info
  matchDaysInfo: {
    totalMatchDays: number;
    completedMatchDays: number;
    upcomingMatchDays: number;
  };
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
    const dateKey = match.date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    if (!matchesByDate.has(dateKey)) {
      matchesByDate.set(dateKey, []);
    }
    matchesByDate.get(dateKey)!.push(match);
  });

  // Create MatchDay objects
  const matchDays: MatchDay[] = [];
  
  matchesByDate.forEach((matches, dateKey) => {
    // Find first and last match times on this day
    const sortedMatches = [...matches].sort((a, b) => {
      const timeA = parseMatchTime(a.timeGMT, a.date);
      const timeB = parseMatchTime(b.timeGMT, b.date);
      return timeA.getTime() - timeB.getTime();
    });

    const firstMatch = sortedMatches[0];
    const lastMatch = sortedMatches[sortedMatches.length - 1];

    matchDays.push({
      date: dateKey,
      dateObject: firstMatch.date,
      firstMatchTime: parseMatchTime(firstMatch.timeGMT, firstMatch.date),
      lastMatchTime: parseMatchTime(lastMatch.timeGMT, lastMatch.date),
      matches: sortedMatches
    });
  });

  // Sort match days chronologically
  matchDays.sort((a, b) => a.dateObject.getTime() - b.dateObject.getTime());

  return matchDays;
}

/**
 * Parse GMT time string and combine with date
 * Example: "5:30 AM" or "5:30 AM (GMT)" -> Date object in GMT
 */
function parseMatchTime(timeGMT: string, matchDate: Date): Date {
  // Remove "(GMT)" if present
  const cleanTime = timeGMT.replace(/\s*\(GMT\)\s*/gi, '').trim();
  
  // Parse time (e.g., "5:30 AM")
  const timeMatch = cleanTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  
  if (!timeMatch) {
    console.warn(`Could not parse time: ${timeGMT}, using midnight`);
    return new Date(matchDate);
  }

  let hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  const meridiem = timeMatch[3].toUpperCase();

  // Convert to 24-hour format
  if (meridiem === 'PM' && hours !== 12) {
    hours += 12;
  } else if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }

  // Create date in GMT
  const date = new Date(matchDate);
  date.setUTCHours(hours, minutes, 0, 0);
  
  return date;
}

/**
 * Calculate when toggles turn ON after a match day
 * Toggles turn ON at 7:30 PM GMT (19:30 GMT) on the match day
 */
function calculateEnableTime(matchDay: MatchDay): Date {
  const enableTime = new Date(matchDay.dateObject);
  enableTime.setUTCHours(19, 30, 0, 0); // 7:30 PM GMT
  return enableTime;
}

/**
 * Calculate when toggles turn OFF before next match day
 * Toggles turn OFF 15 minutes before first match of the next day
 */
function calculateDisableTime(nextMatchDay: MatchDay): Date {
  const disableTime = new Date(nextMatchDay.firstMatchTime);
  disableTime.setMinutes(disableTime.getMinutes() - 15);
  return disableTime;
}

/**
 * Calculate all transfer windows based on match schedule
 */
export function calculateTransferWindows(schedule: ScheduleMatch[]): TransferWindow[] {
  const matchDays = getMatchDays(schedule);
  
  if (matchDays.length === 0) {
    return [];
  }

  const windows: TransferWindow[] = [];

  // For each match day (except the last one)
  for (let i = 0; i < matchDays.length - 1; i++) {
    const currentMatchDay = matchDays[i];
    const nextMatchDay = matchDays[i + 1];

    const startTime = calculateEnableTime(currentMatchDay);
    const endTime = calculateDisableTime(nextMatchDay);

    windows.push({
      startTime,
      endTime,
      isActive: false // Will be set by calculateToggleStatus
    });
  }

  // Note: After the last match day, there's no window (toggles stay OFF)

  return windows;
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

  const windows = calculateTransferWindows(schedule);
  const firstMatchDay = matchDays[0];
  const lastMatchDay = matchDays[matchDays.length - 1];

  // Before first match day ends (before 7:30 PM GMT on Day 1)
  const firstDayEnableTime = calculateEnableTime(firstMatchDay);
  if (currentTime < firstDayEnableTime) {
    return {
      shouldBeEnabled: false,
      nextChangeTime: firstDayEnableTime,
      nextChangeAction: 'enable',
      currentWindow: null,
      matchDaysInfo: {
        totalMatchDays: matchDays.length,
        completedMatchDays: 0,
        upcomingMatchDays: matchDays.length
      }
    };
  }

  // After last match day ends (after 7:30 PM GMT on last day)
  const lastDayEnableTime = calculateEnableTime(lastMatchDay);
  if (currentTime >= lastDayEnableTime) {
    return {
      shouldBeEnabled: false,
      nextChangeTime: null,
      nextChangeAction: null,
      currentWindow: null,
      matchDaysInfo: {
        totalMatchDays: matchDays.length,
        completedMatchDays: matchDays.length,
        upcomingMatchDays: 0
      }
    };
  }

  // Check if we're in any transfer window
  for (const window of windows) {
    if (currentTime >= window.startTime && currentTime < window.endTime) {
      // We're in a transfer window - toggles should be ON
      return {
        shouldBeEnabled: true,
        nextChangeTime: window.endTime,
        nextChangeAction: 'disable',
        currentWindow: { ...window, isActive: true },
        matchDaysInfo: {
          totalMatchDays: matchDays.length,
          completedMatchDays: matchDays.filter(md => currentTime >= calculateEnableTime(md)).length,
          upcomingMatchDays: matchDays.filter(md => currentTime < calculateEnableTime(md)).length
        }
      };
    }
  }

  // Not in a window - toggles should be OFF
  // Find the next window start time
  const nextWindow = windows.find(w => currentTime < w.startTime);
  
  if (nextWindow) {
    return {
      shouldBeEnabled: false,
      nextChangeTime: nextWindow.startTime,
      nextChangeAction: 'enable',
      currentWindow: null,
      matchDaysInfo: {
        totalMatchDays: matchDays.length,
        completedMatchDays: matchDays.filter(md => currentTime >= calculateEnableTime(md)).length,
        upcomingMatchDays: matchDays.filter(md => currentTime < calculateEnableTime(md)).length
      }
    };
  }

  // Fallback (shouldn't reach here in normal cases)
  return {
    shouldBeEnabled: false,
    nextChangeTime: null,
    nextChangeAction: null,
    currentWindow: null,
    matchDaysInfo: {
      totalMatchDays: matchDays.length,
      completedMatchDays: matchDays.length,
      upcomingMatchDays: 0
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
