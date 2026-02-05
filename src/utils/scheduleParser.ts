import type { ScheduleMatch } from '../types/database';

/**
 * Parse match schedule from formatted text input
 *
 * Expected format example:
 * ```
 * Sat, Feb 7 2026
 * 1st Match, Group A • Colombo, Sinhalese Sports Club
 * pakistan
 * Pakistan
 * netherlands
 * Netherlands
 * Sat, Feb 7
 * 12:30 AM / 5:30 AM (GMT) / 11:00 AM (LOCAL)
 * Match starts at Feb 07, 05:30 GMT
 * ```
 */
export function parseMatchSchedule(scheduleText: string): ScheduleMatch[] {
  const matches: ScheduleMatch[] = [];
  const lines = scheduleText.split('\n').map(line => line.trim()).filter(line => line);

  let i = 0;
  let currentDate: Date | null = null;
  let matchCounter = 0; // Track match sequence automatically

  while (i < lines.length) {
    const line = lines[i];

    // Check if this is a date header (e.g., "Sat, Feb 7 2026")
    const dateMatch = line.match(/^[A-Za-z]{3},\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})$/);
    if (dateMatch) {
      const [, month, day, year] = dateMatch;
      currentDate = new Date(`${month} ${day}, ${year}`);
      i++;
      continue;
    }

    // Check if this is a match description line with number (e.g., "1st Match, Group A • Venue, Stadium")
    // Updated regex to capture optional group/stage info between match number and venue
    const matchWithNumMatch = line.match(/^(\d+(?:st|nd|rd|th))\s+Match(?:,\s+([^•]+))?\s+•\s+(.+?)\s*,\s*(.+)$/);

    // Check for numbered knockout matches (e.g., "1st Semi-Final • Venue, Stadium")
    const numberedKnockoutMatch = line.match(/^(\d+(?:st|nd|rd|th))\s+(Semi-Final|Quarter-Final|Qualifier)\s+•\s+(.+?)\s*,\s*(.+)$/);

    // Check if this is a match description without number (e.g., "Final • Venue, Stadium")
    const matchWithoutNumMatch = line.match(/^(Eliminator|Final|Semi-Final|Qualifier\s*\d*)\s+•\s+(.+?)\s*,\s*(.+)$/);

    if ((matchWithNumMatch || numberedKnockoutMatch || matchWithoutNumMatch) && currentDate) {
      let matchNumber: number;
      let stage: string | undefined;
      let venue: string;
      let stadium: string;
      let description: string;
      let fullMatchLine: string = line; // Store original line for description

      if (matchWithNumMatch) {
        const [, matchNum, groupInfo, v, s] = matchWithNumMatch;
        matchNumber = parseInt(matchNum);
        matchCounter = matchNumber; // Update counter to match explicit number
        venue = v;
        stadium = s;
        // Include group info in description if present
        description = groupInfo ? `${matchNum} Match, ${groupInfo.trim()}` : `${matchNum} Match`;
        stage = groupInfo ? groupInfo.trim() : undefined;
      } else if (numberedKnockoutMatch) {
        const [, matchNum, stageName, v, s] = numberedKnockoutMatch;
        matchNumber = parseInt(matchNum);
        matchCounter = matchNumber;
        venue = v;
        stadium = s;
        stage = `${matchNum} ${stageName}`;
        description = `${matchNum} ${stageName}`;
      } else if (matchWithoutNumMatch) {
        const [, stageName, v, s] = matchWithoutNumMatch;
        matchCounter++; // Auto-increment for matches without numbers
        matchNumber = matchCounter;
        venue = v;
        stadium = s;
        stage = stageName;
        description = stageName;
      } else {
        i++;
        continue;
      }

      // Next line should be match description or team info
      i++;

      // Skip duplicate description line if it exists (e.g., "1st Match, Group A")
      if (lines[i] && lines[i].match(/^\d+(?:st|nd|rd|th)\s+Match(?:,\s+.+)?$/)) {
        i++;
      } else if (lines[i] && lines[i].match(/^(Eliminator|Final|Semi-Final|Qualifier\s*\d*|Super 8 Group \d+.*)$/)) {
        i++;
      } else if (lines[i] && lines[i].match(/^\d+(?:st|nd|rd|th)\s+(Semi-Final|Quarter-Final|Qualifier)$/)) {
        i++;
      }

      // Next lines: team1_slug, Team1, team2_slug, Team2
      // const team1Slug = lines[i] || ''; // Not used in current implementation
      i++;
      const team1 = lines[i] || '';
      i++;

      // Check if next line is a score line (contains numbers and brackets)
      // If so, skip score and result lines until we find team2
      while (i < lines.length && (
        lines[i].match(/^\d+-\d+\s*\(\d+/) || // Score pattern: "154-6 (20)"
        lines[i].match(/won by/) || // Result pattern
        lines[i].match(/^Innings Break$/) // Innings break
      )) {
        i++;
      }

      // const team2Slug = lines[i] || ''; // Not used in current implementation
      i++;
      const team2 = lines[i] || '';
      i++;

      // Skip any score/result lines after team2
      while (i < lines.length && (
        lines[i].match(/^\d+-\d+\s*\(\d+/) ||
        lines[i].match(/won by/) ||
        lines[i].match(/^Innings Break$/)
      )) {
        i++;
      }

      // Skip the date repetition line (e.g., "Sat, Feb 7")
      if (lines[i] && lines[i].match(/^[A-Za-z]{3},\s+[A-Za-z]{3}\s+\d{1,2}$/)) {
        i++;
      }

      // Next line is timing (e.g., "12:30 AM / 5:30 AM (GMT) / 11:00 AM (LOCAL)")
      const timingLine = lines[i] || '';
      const timeMatch = timingLine.match(/(\d{1,2}:\d{2}\s+[AP]M)\s+\/\s+(\d{1,2}:\d{2}\s+[AP]M)\s+\(GMT\)\s+\/\s+(\d{1,2}:\d{2}\s+[AP]M)\s+\(LOCAL\)/);

      const timeGMT = timeMatch ? timeMatch[2] : '';
      const timeLocal = timeMatch ? timeMatch[3] : '';

      if (timeMatch) {
        i++;
      }

      // Skip "Match starts at..." line
      if (lines[i] && lines[i].match(/^Match starts at/)) {
        i++;
      }

      // Create match object with only defined values
      const matchData: ScheduleMatch = {
        matchNumber,
        description,
        team1: team1 || 'TBC',
        team2: team2 || 'TBC',
        venue: venue || '',
        stadium: stadium || '',
        date: currentDate,
        timeGMT: timeGMT || '',
        timeLocal: timeLocal || ''
      };

      // Only add stage if it has a value
      if (stage) {
        matchData.stage = stage;
      }

      matches.push(matchData);

      continue;
    }

    i++;
  }

  return matches;
}

/**
 * Format match for display in dropdown
 */
export function formatMatchForDropdown(match: ScheduleMatch): string {
  const dateStr = match.date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  if (match.team1 === 'TBC' || match.team2 === 'TBC') {
    return `Match ${match.matchNumber}: ${match.description} - ${dateStr}`;
  }

  return `Match ${match.matchNumber}: ${match.team1} vs ${match.team2} - ${dateStr}, ${match.venue}`;
}

/**
 * Format match for detailed display
 */
export function formatMatchDetails(match: ScheduleMatch): {
  title: string;
  teams: string;
  venue: string;
  dateTime: string;
  stage?: string;
} {
  const dateStr = match.date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return {
    title: `Match ${match.matchNumber}${match.stage ? ` - ${match.stage}` : ''}`,
    teams: `${match.team1} vs ${match.team2}`,
    venue: `${match.venue}, ${match.stadium}`,
    dateTime: `${dateStr} • ${match.timeGMT} GMT / ${match.timeLocal} Local`,
    stage: match.stage
  };
}

/**
 * Group matches by date
 */
export function groupMatchesByDate(matches: ScheduleMatch[]): Map<string, ScheduleMatch[]> {
  const grouped = new Map<string, ScheduleMatch[]>();

  matches.forEach(match => {
    const dateKey = match.date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(match);
  });

  return grouped;
}
