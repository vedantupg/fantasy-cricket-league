// @ts-nocheck
/**
 * Unit Tests: Streak Calculator
 */

import {
  calculateRankStreaks,
  attachStreaksToStandings,
  findMostConsistentPerformer,
} from '../../utils/streakCalculator';
import type { LeaderboardSnapshot, StandingEntry } from '../../types/database';

describe('Streak Calculator', () => {
  // Helper to create mock standings
  const createStanding = (userId: string, rank: number, points: number = 100): StandingEntry => ({
    userId,
    displayName: `User ${userId}`,
    totalPoints: points,
    pointsGainedToday: 0,
    rank,
  });

  // Helper to create mock snapshot
  const createSnapshot = (standings: StandingEntry[], daysAgo: number = 0): LeaderboardSnapshot => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    return {
      id: `snapshot-${daysAgo}`,
      leagueId: 'test-league',
      createdAt: date,
      standings,
    };
  };

  describe('calculateRankStreaks', () => {
    it('should return empty map for no snapshots', () => {
      const streaks = calculateRankStreaks([]);
      expect(streaks.size).toBe(0);
    });

    it('should return empty map for single snapshot', () => {
      const snapshot = createSnapshot([
        createStanding('u1', 1),
        createStanding('u2', 2),
      ]);
      
      const streaks = calculateRankStreaks([snapshot]);
      expect(streaks.size).toBe(0);
    });

    it('should calculate streak for user maintaining same rank', () => {
      const snapshots = [
        createSnapshot([createStanding('u1', 1), createStanding('u2', 2)], 0), // Today
        createSnapshot([createStanding('u1', 1), createStanding('u2', 2)], 1), // Yesterday
        createSnapshot([createStanding('u1', 1), createStanding('u2', 3)], 2), // 2 days ago
      ];
      
      const streaks = calculateRankStreaks(snapshots);
      
      expect(streaks.get('u1')).toBe(3); // Rank 1 for 3 snapshots
      expect(streaks.get('u2')).toBe(2); // Rank 2 for 2 snapshots, then changed to 3
    });

    it('should stop counting when rank changes', () => {
      const snapshots = [
        createSnapshot([createStanding('u1', 1), createStanding('u2', 2)], 0), // Today
        createSnapshot([createStanding('u1', 1), createStanding('u2', 2)], 1), // Yesterday
        createSnapshot([createStanding('u1', 2), createStanding('u2', 1)], 2), // Ranks swapped
      ];
      
      const streaks = calculateRankStreaks(snapshots);
      
      expect(streaks.get('u1')).toBe(2); // Streak of 2 before rank changed
      expect(streaks.get('u2')).toBe(2);
    });

    it('should handle user not present in older snapshots', () => {
      const snapshots = [
        createSnapshot([createStanding('u1', 1), createStanding('u2', 2)], 0), // Today
        createSnapshot([createStanding('u1', 1), createStanding('u2', 2)], 1), // Yesterday
        createSnapshot([createStanding('u1', 1)], 2), // u2 not in this snapshot
      ];
      
      const streaks = calculateRankStreaks(snapshots);
      
      expect(streaks.get('u1')).toBe(3); // Full streak
      expect(streaks.get('u2')).toBe(2); // Stopped when user not found
    });

    it('should only return streaks of 2 or more', () => {
      const snapshots = [
        createSnapshot([createStanding('u1', 1), createStanding('u2', 2)], 0),
        createSnapshot([createStanding('u1', 2), createStanding('u2', 1)], 1),
      ];
      
      const streaks = calculateRankStreaks(snapshots);
      
      // No streaks because everyone's rank changed after 1 snapshot
      expect(streaks.size).toBe(0);
    });

    it('should handle multiple users with different streak lengths', () => {
      const snapshots = [
        createSnapshot([
          createStanding('u1', 1),
          createStanding('u2', 2),
          createStanding('u3', 3),
        ], 0),
        createSnapshot([
          createStanding('u1', 1),
          createStanding('u2', 2),
          createStanding('u3', 3),
        ], 1),
        createSnapshot([
          createStanding('u1', 1),
          createStanding('u2', 3),
          createStanding('u3', 2),
        ], 2),
        createSnapshot([
          createStanding('u1', 1),
          createStanding('u2', 3),
          createStanding('u3', 2),
        ], 3),
      ];
      
      const streaks = calculateRankStreaks(snapshots);
      
      expect(streaks.get('u1')).toBe(4); // Rank 1 for all 4 snapshots
      expect(streaks.get('u2')).toBe(2); // Rank 2 for 2, then changed
      expect(streaks.get('u3')).toBe(2); // Rank 3 for 2, then changed
    });
  });

  describe('attachStreaksToStandings', () => {
    it('should attach streak data to standings', () => {
      const standings: StandingEntry[] = [
        createStanding('u1', 1),
        createStanding('u2', 2),
        createStanding('u3', 3),
      ];
      
      const streaks = new Map([
        ['u1', 5],
        ['u2', 3],
      ]);
      
      const result = attachStreaksToStandings(standings, streaks);
      
      expect(result[0].rankStreak).toBe(5);
      expect(result[1].rankStreak).toBe(3);
      expect(result[2].rankStreak).toBeUndefined();
    });

    it('should handle empty streaks map', () => {
      const standings: StandingEntry[] = [
        createStanding('u1', 1),
        createStanding('u2', 2),
      ];
      
      const result = attachStreaksToStandings(standings, new Map());
      
      expect(result[0].rankStreak).toBeUndefined();
      expect(result[1].rankStreak).toBeUndefined();
    });

    it('should not mutate original standings', () => {
      const standings: StandingEntry[] = [
        createStanding('u1', 1),
      ];
      
      const streaks = new Map([['u1', 5]]);
      
      attachStreaksToStandings(standings, streaks);
      
      expect(standings[0].rankStreak).toBeUndefined(); // Original unchanged
    });
  });

  describe('findMostConsistentPerformer', () => {
    it('should return the standing with the longest streak', () => {
      const standings: StandingEntry[] = [
        { ...createStanding('u1', 1), rankStreak: 5 },
        { ...createStanding('u2', 2), rankStreak: 8 },
        { ...createStanding('u3', 3), rankStreak: 3 },
      ];
      
      const result = findMostConsistentPerformer(standings);
      
      expect(result?.userId).toBe('u2');
      expect(result?.rankStreak).toBe(8);
    });

    it('should return null if no streaks exist', () => {
      const standings: StandingEntry[] = [
        createStanding('u1', 1),
        createStanding('u2', 2),
      ];
      
      const result = findMostConsistentPerformer(standings);
      
      expect(result).toBeNull();
    });

    it('should ignore streaks less than 2', () => {
      const standings: StandingEntry[] = [
        { ...createStanding('u1', 1), rankStreak: 1 },
        { ...createStanding('u2', 2), rankStreak: 0 },
      ];
      
      const result = findMostConsistentPerformer(standings);
      
      expect(result).toBeNull();
    });

    it('should handle empty standings array', () => {
      const result = findMostConsistentPerformer([]);
      
      expect(result).toBeNull();
    });

    it('should return first in case of tie', () => {
      const standings: StandingEntry[] = [
        { ...createStanding('u1', 1), rankStreak: 5 },
        { ...createStanding('u2', 2), rankStreak: 5 },
        { ...createStanding('u3', 3), rankStreak: 3 },
      ];
      
      const result = findMostConsistentPerformer(standings);
      
      expect(result?.userId).toBe('u1'); // First one wins in tie
    });

    it('should only consider streaks of 2 or more', () => {
      const standings: StandingEntry[] = [
        { ...createStanding('u1', 1), rankStreak: 1 },
        { ...createStanding('u2', 2), rankStreak: 2 },
        { ...createStanding('u3', 3), rankStreak: 4 },
      ];
      
      const result = findMostConsistentPerformer(standings);
      
      expect(result?.userId).toBe('u3');
      expect(result?.rankStreak).toBe(4);
    });
  });
});

export {};
