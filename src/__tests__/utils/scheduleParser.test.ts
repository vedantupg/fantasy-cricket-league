// @ts-nocheck
/**
 * Unit Tests: Schedule Parser
 */

import {
  parseMatchSchedule,
  formatMatchForDropdown,
  formatMatchDetails,
  groupMatchesByDate,
} from '../../utils/scheduleParser';
import type { ScheduleMatch } from '../../types/database';

describe('Schedule Parser', () => {
  describe('parseMatchSchedule', () => {
    it('should parse a simple match schedule', () => {
      const scheduleText = `
Sat, Feb 7 2026
1st Match, Group A • Colombo, Sinhalese Sports Club
pakistan
Pakistan
netherlands
Netherlands
Sat, Feb 7
12:30 AM / 5:30 AM (GMT) / 11:00 AM (LOCAL)
Match starts at Feb 07, 05:30 GMT
      `.trim();

      const matches = parseMatchSchedule(scheduleText);

      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({
        matchNumber: 1,
        description: '1st Match, Group A',
        team1: 'Pakistan',
        team2: 'Netherlands',
        venue: 'Colombo',
        stadium: 'Sinhalese Sports Club',
        timeGMT: '5:30 AM',
        timeLocal: '11:00 AM',
        stage: 'Group A',
      });
    });

    it('should parse multiple matches', () => {
      const scheduleText = `
Sat, Feb 7 2026
1st Match, Group A • Colombo, SSC
pakistan
Pakistan
netherlands
Netherlands
Sat, Feb 7
12:30 AM / 5:30 AM (GMT) / 11:00 AM (LOCAL)
Match starts at Feb 07, 05:30 GMT

Sun, Feb 8 2026
2nd Match, Group B • Mumbai, Wankhede
india
India
australia
Australia
Sun, Feb 8
2:30 PM / 8:30 AM (GMT) / 2:00 PM (LOCAL)
Match starts at Feb 08, 08:30 GMT
      `.trim();

      const matches = parseMatchSchedule(scheduleText);

      expect(matches).toHaveLength(2);
      expect(matches[1]).toMatchObject({
        matchNumber: 2,
        team1: 'India',
        team2: 'Australia',
      });
    });

    it('should parse knockout matches without numbers', () => {
      const scheduleText = `
Sat, Feb 15 2026
Final • Dubai, Dubai International Stadium
tbd
TBC
tbd
TBC
Sat, Feb 15
3:00 PM / 10:00 AM (GMT) / 3:00 PM (LOCAL)
Match starts at Feb 15, 10:00 GMT
      `.trim();

      const matches = parseMatchSchedule(scheduleText);

      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({
        matchNumber: 1,
        description: 'Final',
        team1: 'TBC',
        team2: 'TBC',
        stage: 'Final',
      });
    });

    it('should parse numbered knockout matches', () => {
      const scheduleText = `
Sat, Feb 14 2026
1st Semi-Final • Mumbai, Wankhede
tbd
TBC
tbd
TBC
Sat, Feb 14
7:00 PM / 1:30 PM (GMT) / 7:00 PM (LOCAL)
Match starts at Feb 14, 13:30 GMT
      `.trim();

      const matches = parseMatchSchedule(scheduleText);

      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({
        matchNumber: 1,
        description: '1st Semi-Final',
        stage: '1st Semi-Final',
      });
    });

    it('should handle matches with scores (skip score lines)', () => {
      const scheduleText = `
Sat, Feb 7 2026
1st Match, Group A • Colombo, SSC
pakistan
Pakistan
154-6 (20)
netherlands
Netherlands
120-9 (20)
Pakistan won by 34 runs
Sat, Feb 7
12:30 AM / 5:30 AM (GMT) / 11:00 AM (LOCAL)
Match starts at Feb 07, 05:30 GMT
      `.trim();

      const matches = parseMatchSchedule(scheduleText);

      expect(matches).toHaveLength(1);
      expect(matches[0].team1).toBe('Pakistan');
      expect(matches[0].team2).toBe('Netherlands');
    });

    it('should handle empty input', () => {
      const matches = parseMatchSchedule('');
      expect(matches).toHaveLength(0);
    });

    it('should handle malformed input gracefully', () => {
      const scheduleText = 'Random text\nNo valid match data';
      const matches = parseMatchSchedule(scheduleText);
      
      // Should not crash, returns empty or partial data
      expect(Array.isArray(matches)).toBe(true);
    });

    it('should parse match without optional timing', () => {
      const scheduleText = `
Sat, Feb 7 2026
1st Match, Group A • Colombo, SSC
pakistan
Pakistan
netherlands
Netherlands
      `.trim();

      const matches = parseMatchSchedule(scheduleText);

      expect(matches).toHaveLength(1);
      expect(matches[0].timeGMT).toBe('');
      expect(matches[0].timeLocal).toBe('');
    });
  });

  describe('formatMatchForDropdown', () => {
    it('should format match with confirmed teams', () => {
      const match: ScheduleMatch = {
        matchNumber: 1,
        description: '1st Match, Group A',
        team1: 'Pakistan',
        team2: 'Netherlands',
        venue: 'Colombo',
        stadium: 'SSC',
        date: new Date('2026-02-07'),
        timeGMT: '5:30 AM',
        timeLocal: '11:00 AM',
      };

      const formatted = formatMatchForDropdown(match);

      expect(formatted).toContain('Match 1');
      expect(formatted).toContain('Pakistan vs Netherlands');
      expect(formatted).toContain('Colombo');
    });

    it('should format match with TBC teams', () => {
      const match: ScheduleMatch = {
        matchNumber: 15,
        description: 'Final',
        team1: 'TBC',
        team2: 'TBC',
        venue: 'Dubai',
        stadium: 'Dubai International',
        date: new Date('2026-02-15'),
        timeGMT: '10:00 AM',
        timeLocal: '3:00 PM',
        stage: 'Final',
      };

      const formatted = formatMatchForDropdown(match);

      expect(formatted).toContain('Match 15');
      expect(formatted).toContain('Final');
      expect(formatted).not.toContain('vs');
    });
  });

  describe('formatMatchDetails', () => {
    it('should format complete match details', () => {
      const match: ScheduleMatch = {
        matchNumber: 1,
        description: '1st Match, Group A',
        team1: 'Pakistan',
        team2: 'Netherlands',
        venue: 'Colombo',
        stadium: 'SSC',
        date: new Date('2026-02-07'),
        timeGMT: '5:30 AM',
        timeLocal: '11:00 AM',
        stage: 'Group A',
      };

      const details = formatMatchDetails(match);

      expect(details.title).toContain('Match 1');
      expect(details.title).toContain('Group A');
      expect(details.teams).toBe('Pakistan vs Netherlands');
      expect(details.venue).toBe('Colombo, SSC');
      expect(details.dateTime).toContain('5:30 AM GMT');
      expect(details.dateTime).toContain('11:00 AM Local');
      expect(details.stage).toBe('Group A');
    });

    it('should format match without stage', () => {
      const match: ScheduleMatch = {
        matchNumber: 5,
        description: '5th Match',
        team1: 'India',
        team2: 'Australia',
        venue: 'Mumbai',
        stadium: 'Wankhede',
        date: new Date('2026-02-10'),
        timeGMT: '8:30 AM',
        timeLocal: '2:00 PM',
      };

      const details = formatMatchDetails(match);

      expect(details.title).toBe('Match 5');
      expect(details.stage).toBeUndefined();
    });
  });

  describe('groupMatchesByDate', () => {
    it('should group matches by date', () => {
      const matches: ScheduleMatch[] = [
        {
          matchNumber: 1,
          description: '1st Match',
          team1: 'Pakistan',
          team2: 'Netherlands',
          venue: 'Colombo',
          stadium: 'SSC',
          date: new Date('2026-02-07'),
          timeGMT: '5:30 AM',
          timeLocal: '11:00 AM',
        },
        {
          matchNumber: 2,
          description: '2nd Match',
          team1: 'India',
          team2: 'Australia',
          venue: 'Mumbai',
          stadium: 'Wankhede',
          date: new Date('2026-02-07'),
          timeGMT: '8:30 AM',
          timeLocal: '2:00 PM',
        },
        {
          matchNumber: 3,
          description: '3rd Match',
          team1: 'England',
          team2: 'South Africa',
          venue: 'Dubai',
          stadium: 'Dubai International',
          date: new Date('2026-02-08'),
          timeGMT: '10:00 AM',
          timeLocal: '3:00 PM',
        },
      ];

      const grouped = groupMatchesByDate(matches);

      expect(grouped.size).toBe(2); // 2 unique dates
      
      const feb7Matches = Array.from(grouped.values())[0];
      expect(feb7Matches).toHaveLength(2);

      const feb8Matches = Array.from(grouped.values())[1];
      expect(feb8Matches).toHaveLength(1);
    });

    it('should handle empty array', () => {
      const grouped = groupMatchesByDate([]);
      expect(grouped.size).toBe(0);
    });

    it('should handle single match', () => {
      const matches: ScheduleMatch[] = [
        {
          matchNumber: 1,
          description: '1st Match',
          team1: 'Pakistan',
          team2: 'Netherlands',
          venue: 'Colombo',
          stadium: 'SSC',
          date: new Date('2026-02-07'),
          timeGMT: '5:30 AM',
          timeLocal: '11:00 AM',
        },
      ];

      const grouped = groupMatchesByDate(matches);

      expect(grouped.size).toBe(1);
    });
  });
});

export {};
