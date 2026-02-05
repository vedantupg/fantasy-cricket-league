// @ts-nocheck
/**
 * Unit Tests: Slot Management Utilities
 */

import {
  calculateSlotRanges,
  getSlotType,
  findFlexiblePlayerByRole,
  findFirstEmptyRequiredSlot,
  findBestInsertionPosition,
  rebalanceAfterRemoval,
  insertPlayer,
  performAutoSlot,
  validateFormation,
} from '../../utils/slotManagement';
import type { League, SquadPlayer } from '../../types/database';

describe('Slot Management', () => {
  // Helper to create mock league
  const createLeague = (
    squadSize: number = 11,
    minBatsmen: number = 3,
    minBowlers: number = 3,
    minAllrounders: number = 1,
    minWicketkeepers: number = 1
  ): League => ({
    id: 'test-league',
    name: 'Test League',
    adminId: 'admin',
    squadSize,
    benchSize: 4,
    transfersAllowed: 5,
    squadRules: {
      minBatsmen,
      minBowlers,
      minAllrounders,
      minWicketkeepers,
    },
    createdAt: new Date(),
    status: 'active',
  });

  // Helper to create mock player
  const createPlayer = (
    id: string,
    role: 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper',
    points: number = 100
  ): SquadPlayer => ({
    playerId: id,
    playerName: `Player ${id}`,
    role,
    points,
    pointsAtJoining: points,
    matchPerformances: {},
  });

  describe('calculateSlotRanges', () => {
    it('should calculate correct slot ranges for standard 11-player squad', () => {
      const league = createLeague(11, 3, 3, 1, 1);
      const ranges = calculateSlotRanges(league);

      expect(ranges.batsman).toEqual({ start: 0, end: 2, count: 3 });
      expect(ranges.bowler).toEqual({ start: 3, end: 5, count: 3 });
      expect(ranges.allrounder).toEqual({ start: 6, end: 6, count: 1 });
      expect(ranges.wicketkeeper).toEqual({ start: 7, end: 7, count: 1 });
      expect(ranges.flexible).toEqual({ start: 8, end: 10, count: 3 });
    });

    it('should handle different squad rules', () => {
      const league = createLeague(11, 4, 4, 2, 1);
      const ranges = calculateSlotRanges(league);

      expect(ranges.batsman.count).toBe(4);
      expect(ranges.bowler.count).toBe(4);
      expect(ranges.allrounder.count).toBe(2);
      expect(ranges.wicketkeeper.count).toBe(1);
      expect(ranges.flexible.count).toBe(0); // No flexible slots
    });

    it('should handle no flexible slots', () => {
      const league = createLeague(10, 3, 3, 3, 1);
      const ranges = calculateSlotRanges(league);

      expect(ranges.flexible.count).toBe(0);
      expect(ranges.flexible.start).toBe(10);
      expect(ranges.flexible.end).toBe(9); // end < start when no slots
    });

    it('should handle larger squad size', () => {
      const league = createLeague(15, 3, 3, 1, 1);
      const ranges = calculateSlotRanges(league);

      expect(ranges.flexible.count).toBe(7); // 15 - (3+3+1+1)
    });
  });

  describe('getSlotType', () => {
    const league = createLeague(11, 3, 3, 1, 1);
    const ranges = calculateSlotRanges(league);

    it('should identify batsman required slot', () => {
      expect(getSlotType(0, ranges)).toEqual({ type: 'required', role: 'batsman' });
      expect(getSlotType(1, ranges)).toEqual({ type: 'required', role: 'batsman' });
      expect(getSlotType(2, ranges)).toEqual({ type: 'required', role: 'batsman' });
    });

    it('should identify bowler required slot', () => {
      expect(getSlotType(3, ranges)).toEqual({ type: 'required', role: 'bowler' });
      expect(getSlotType(4, ranges)).toEqual({ type: 'required', role: 'bowler' });
      expect(getSlotType(5, ranges)).toEqual({ type: 'required', role: 'bowler' });
    });

    it('should identify allrounder required slot', () => {
      expect(getSlotType(6, ranges)).toEqual({ type: 'required', role: 'allrounder' });
    });

    it('should identify wicketkeeper required slot', () => {
      expect(getSlotType(7, ranges)).toEqual({ type: 'required', role: 'wicketkeeper' });
    });

    it('should identify flexible slots', () => {
      expect(getSlotType(8, ranges)).toEqual({ type: 'flexible' });
      expect(getSlotType(9, ranges)).toEqual({ type: 'flexible' });
      expect(getSlotType(10, ranges)).toEqual({ type: 'flexible' });
    });
  });

  describe('findFlexiblePlayerByRole', () => {
    const league = createLeague(11, 3, 3, 1, 1);
    const ranges = calculateSlotRanges(league);

    it('should find player of specified role in flexible slots', () => {
      const players: SquadPlayer[] = Array(11).fill(null).map((_, i) => {
        if (i === 0) return createPlayer('p0', 'batsman');
        if (i === 8) return createPlayer('p8', 'batsman'); // In flexible
        return createPlayer(`p${i}`, 'bowler');
      });

      const result = findFlexiblePlayerByRole(players, 'batsman', ranges);

      expect(result).not.toBeNull();
      expect(result?.player.playerId).toBe('p8');
      expect(result?.index).toBe(8);
    });

    it('should return null if no player of role found in flexible', () => {
      const players: SquadPlayer[] = Array(11).fill(null).map((_, i) =>
        createPlayer(`p${i}`, 'bowler')
      );

      const result = findFlexiblePlayerByRole(players, 'batsman', ranges);

      expect(result).toBeNull();
    });

    it('should return first matching player in flexible zone', () => {
      const players: SquadPlayer[] = Array(11).fill(null).map((_, i) => {
        if (i === 8 || i === 9) return createPlayer(`p${i}`, 'batsman');
        return createPlayer(`p${i}`, 'bowler');
      });

      const result = findFlexiblePlayerByRole(players, 'batsman', ranges);

      expect(result?.index).toBe(8); // First match
    });
  });

  describe('findFirstEmptyRequiredSlot', () => {
    const league = createLeague(11, 3, 3, 1, 1);
    const ranges = calculateSlotRanges(league);

    it('should find first empty batsman slot', () => {
      const players: SquadPlayer[] = Array(11).fill(null);
      players[0] = createPlayer('p0', 'batsman');

      const result = findFirstEmptyRequiredSlot(players, 'batsman', ranges);

      expect(result).toBe(1); // Slot 0 filled, slot 1 empty
    });

    it('should return null if no empty slots', () => {
      const players: SquadPlayer[] = Array(11).fill(null).map((_, i) =>
        createPlayer(`p${i}`, 'batsman')
      );

      const result = findFirstEmptyRequiredSlot(players, 'batsman', ranges);

      expect(result).toBeNull();
    });
  });

  describe('findBestInsertionPosition', () => {
    const league = createLeague(11, 3, 3, 1, 1);
    const ranges = calculateSlotRanges(league);

    it('should prefer required slot for matching role', () => {
      const players: SquadPlayer[] = Array(11).fill(null);
      // Leave batsman slot 1 empty
      players[0] = createPlayer('p0', 'batsman');
      players[2] = createPlayer('p2', 'batsman');

      const newPlayer = createPlayer('new', 'batsman');
      const position = findBestInsertionPosition(players, 'batsman', ranges);

      expect(position).toBe(1); // Empty required batsman slot
    });

    it('should use flexible slot if no required slot available', () => {
      const players: SquadPlayer[] = Array(11).fill(null);
      // Fill all batsman required slots
      players[0] = createPlayer('p0', 'batsman');
      players[1] = createPlayer('p1', 'batsman');
      players[2] = createPlayer('p2', 'batsman');

      const newPlayer = createPlayer('new', 'batsman');
      const position = findBestInsertionPosition(players, 'batsman', ranges);

      expect(position).toBe(8); // First flexible slot
    });
  });

  describe('rebalanceAfterRemoval', () => {
    const league = createLeague(11, 3, 3, 1, 1);
    const ranges = calculateSlotRanges(league);

    it('should backfill required slot from flexible when possible', () => {
      const players: SquadPlayer[] = Array(11).fill(null).map((_, i) => {
        if (i < 3) return createPlayer(`bat${i}`, 'batsman');
        if (i === 8) return createPlayer('bat3', 'batsman'); // In flexible
        return createPlayer(`p${i}`, 'bowler');
      });

      // Remove batsman from required slot
      delete players[1];

      const rebalanced = rebalanceAfterRemoval(players, 1, ranges);

      // Flexible batsman should move to required slot
      expect(rebalanced[1]?.playerId).toBe('bat3');
      expect(rebalanced[8]).toBeUndefined();
    });

    it('should not move players if removed from flexible slot', () => {
      const players: SquadPlayer[] = Array(11).fill(null).map((_, i) =>
        createPlayer(`p${i}`, 'batsman')
      );

      delete players[8]; // Remove from flexible

      const rebalanced = rebalanceAfterRemoval(players, 8, ranges);

      // No rebalancing needed for flexible slots
      expect(rebalanced[8]).toBeUndefined();
    });
  });

  describe('performAutoSlot', () => {
    const league = createLeague(11, 3, 3, 1, 1);

    it('should correctly swap players', () => {
      const currentPlayers: SquadPlayer[] = [
        createPlayer('bat1', 'batsman'),
        createPlayer('bat2', 'batsman'),
        createPlayer('bat3', 'batsman'),
        createPlayer('bowl1', 'bowler'),
        createPlayer('bowl2', 'bowler'),
        createPlayer('bowl3', 'bowler'),
        createPlayer('ar1', 'allrounder'),
        createPlayer('wk1', 'wicketkeeper'),
        createPlayer('bat4', 'batsman'),
        createPlayer('bowl4', 'bowler'),
        createPlayer('ar2', 'allrounder'),
      ];

      const newPlayer = createPlayer('new_bat', 'batsman', 150);

      const result = performAutoSlot(currentPlayers, 'bat1', newPlayer, league);

      expect(result).toHaveLength(11);
      expect(result.find(p => p.playerId === 'new_bat')).toBeDefined();
      expect(result.find(p => p.playerId === 'bat1')).toBeUndefined();
    });

    it('should throw error if player to remove not found', () => {
      const currentPlayers: SquadPlayer[] = [createPlayer('p1', 'batsman')];
      const newPlayer = createPlayer('new', 'batsman');

      expect(() => {
        performAutoSlot(currentPlayers, 'nonexistent', newPlayer, league);
      }).toThrow('Player to remove not found');
    });
  });

  describe('validateFormation', () => {
    const league = createLeague(11, 3, 3, 1, 1);

    it('should validate correct formation', () => {
      const players: SquadPlayer[] = [
        createPlayer('bat1', 'batsman'),
        createPlayer('bat2', 'batsman'),
        createPlayer('bat3', 'batsman'),
        createPlayer('bowl1', 'bowler'),
        createPlayer('bowl2', 'bowler'),
        createPlayer('bowl3', 'bowler'),
        createPlayer('ar1', 'allrounder'),
        createPlayer('wk1', 'wicketkeeper'),
        createPlayer('bat4', 'batsman'),
        createPlayer('bowl4', 'bowler'),
        createPlayer('ar2', 'allrounder'),
      ];

      const result = validateFormation(players, league);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect insufficient batsmen', () => {
      const players: SquadPlayer[] = [
        createPlayer('bat1', 'batsman'),
        createPlayer('bat2', 'batsman'),
        // Missing 3rd batsman
        createPlayer('bowl1', 'bowler'),
        createPlayer('bowl2', 'bowler'),
        createPlayer('bowl3', 'bowler'),
        createPlayer('bowl4', 'bowler'),
        createPlayer('ar1', 'allrounder'),
        createPlayer('wk1', 'wicketkeeper'),
        createPlayer('ar2', 'allrounder'),
        createPlayer('ar3', 'allrounder'),
        createPlayer('ar4', 'allrounder'),
      ];

      const result = validateFormation(players, league);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('batsmen'))).toBe(true);
    });

    it('should detect insufficient bowlers', () => {
      const players: SquadPlayer[] = [
        createPlayer('bat1', 'batsman'),
        createPlayer('bat2', 'batsman'),
        createPlayer('bat3', 'batsman'),
        createPlayer('bowl1', 'bowler'),
        createPlayer('bowl2', 'bowler'),
        // Missing 3rd bowler
        createPlayer('ar1', 'allrounder'),
        createPlayer('ar2', 'allrounder'),
        createPlayer('ar3', 'allrounder'),
        createPlayer('ar4', 'allrounder'),
        createPlayer('wk1', 'wicketkeeper'),
        createPlayer('bat4', 'batsman'),
      ];

      const result = validateFormation(players, league);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('bowlers'))).toBe(true);
    });

    it('should detect multiple errors', () => {
      const players: SquadPlayer[] = [
        createPlayer('bat1', 'batsman'),
        createPlayer('bat2', 'batsman'),
        createPlayer('bowl1', 'bowler'),
        createPlayer('bowl2', 'bowler'),
        // Missing: 1 batsman, 1 bowler, 1 allrounder, 1 wicketkeeper
        createPlayer('p1', 'batsman'),
        createPlayer('p2', 'batsman'),
        createPlayer('p3', 'batsman'),
        createPlayer('p4', 'batsman'),
        createPlayer('p5', 'batsman'),
        createPlayer('p6', 'batsman'),
        createPlayer('p7', 'batsman'),
      ];

      const result = validateFormation(players, league);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should only validate main squad, not bench', () => {
      const players: SquadPlayer[] = [
        // Main squad (valid)
        ...Array(11).fill(null).map((_, i) => {
          if (i < 3) return createPlayer(`bat${i}`, 'batsman');
          if (i < 6) return createPlayer(`bowl${i}`, 'bowler');
          if (i === 6) return createPlayer('ar1', 'allrounder');
          if (i === 7) return createPlayer('wk1', 'wicketkeeper');
          return createPlayer(`p${i}`, 'batsman');
        }),
        // Bench (doesn't affect validation)
        createPlayer('bench1', 'batsman'),
        createPlayer('bench2', 'batsman'),
        createPlayer('bench3', 'batsman'),
        createPlayer('bench4', 'batsman'),
      ];

      const result = validateFormation(players, league);

      expect(result.isValid).toBe(true);
    });
  });
});

export {};
