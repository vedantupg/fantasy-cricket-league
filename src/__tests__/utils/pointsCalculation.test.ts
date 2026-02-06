// @ts-nocheck
/**
 * Unit Tests: Points Calculation Utilities (Complete Coverage)
 */

import {
  calculateBattingPoints,
  calculateBowlingPoints,
  calculatePlayerContribution,
  calculateSquadPoints,
  validateRoleTimestamp,
  DEFAULT_BATTING_CONFIG,
  DEFAULT_BOWLING_CONFIG,
} from '../../utils/pointsCalculation';
import type { SquadPlayer, BattingConfig, BowlingConfig } from '../../types/database';

describe('Points Calculation - Complete Coverage', () => {
  // Helper to create mock player
  const createPlayer = (
    id: string,
    points: number,
    pointsAtJoining: number = 0,
    pointsWhenRoleAssigned?: number
  ): SquadPlayer => ({
    playerId: id,
    playerName: `Player ${id}`,
    role: 'batsman',
    points,
    pointsAtJoining,
    pointsWhenRoleAssigned,
    matchPerformances: {},
  });

  describe('calculateBattingPoints', () => {
    const config: BattingConfig = {
      minBallsThreshold: 7,
      bonusSRTrigger: 150,
      bonusSRBaseline: 130,
      bonusDivisor: 200,
      penaltiesEnabled: false,
      penaltySRThreshold: 120,
    };

    it('should return runs as-is for balls below threshold', () => {
      const points = calculateBattingPoints(25, 5, config);
      expect(points).toBe(25);
    });

    it('should calculate SR bonus for high strike rate (bonus-only mode)', () => {
      // SR = (50/25)*100 = 200 (exceeds trigger of 150)
      // Bonus = (50 * (200 - 130)) / 200 = 17.5
      // Total = 50 + 17.5 = 67.5
      const points = calculateBattingPoints(50, 25, config);
      expect(points).toBe(67.5);
    });

    it('should give no bonus for SR below trigger (bonus-only mode)', () => {
      // SR = (30/25)*100 = 120 (below trigger of 150)
      // No bonus in bonus-only mode
      const points = calculateBattingPoints(30, 25, config);
      expect(points).toBe(30);
    });

    it('should calculate penalty when penalties enabled', () => {
      const penaltyConfig: BattingConfig = {
        ...config,
        penaltiesEnabled: true,
      };

      // SR = (20/25)*100 = 80 (below penalty threshold of 120)
      // Penalty = (20 * (80 - 130)) / 200 = -5
      // Total = 20 - 5 = 15
      const points = calculateBattingPoints(20, 25, penaltyConfig);
      expect(points).toBe(15);
    });

    it('should handle neutral zone when penalties enabled', () => {
      const penaltyConfig: BattingConfig = {
        ...config,
        penaltiesEnabled: true,
      };

      // SR = (35/25)*100 = 140 (between penalty 120 and trigger 150)
      // Neutral zone = no bonus, no penalty
      const points = calculateBattingPoints(35, 25, penaltyConfig);
      expect(points).toBe(35);
    });

    it('should round to 2 decimals', () => {
      const points = calculateBattingPoints(33, 25, config);
      
      // Verify it's a number with max 2 decimal places
      expect(typeof points).toBe('number');
      expect(points.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    });

    it('should handle zero runs', () => {
      const points = calculateBattingPoints(0, 25, config);
      expect(points).toBe(0);
    });

    it('should use default config values', () => {
      const points = calculateBattingPoints(50, 25, DEFAULT_BATTING_CONFIG);
      expect(typeof points).toBe('number');
    });
  });

  describe('calculateBowlingPoints', () => {
    const config: BowlingConfig = {
      wicketPoints: 25,
      economyBonusThreshold: 7,
      economyMultiplier: 5,
      penaltiesEnabled: false,
      economyPenaltyThreshold: 8,
      minOversForEconomy: 1,
    };

    it('should return only wicket points for overs below threshold', () => {
      const points = calculateBowlingPoints(0.3, 10, 2, config); // 0.3 overs
      expect(points).toBe(50); // 2 wickets * 25
    });

    it('should calculate economy bonus for good economy', () => {
      // Economy = (18/24)*6 = 4.5 (below threshold of 7)
      // Bonus = (7 - 4.5) * 5 = 12.5
      // Total = (2 * 25) + 12.5 = 62.5
      const points = calculateBowlingPoints(4, 18, 2, config); // 4 overs, 18 runs
      expect(points).toBe(62.5);
    });

    it('should give no bonus for economy above threshold (bonus-only mode)', () => {
      // Economy = (32/24)*6 = 8 (above threshold of 7)
      // No bonus in bonus-only mode
      const points = calculateBowlingPoints(4, 32, 2, config);
      expect(points).toBe(50); // Just wicket points
    });

    it('should calculate penalty when penalties enabled', () => {
      const penaltyConfig: BowlingConfig = {
        ...config,
        penaltiesEnabled: true,
      };

      // Economy = (40/24)*6 = 10 (above penalty threshold of 8)
      // Penalty = (8 - 10) * 5 = -10
      // Total = 50 - 10 = 40
      const points = calculateBowlingPoints(4, 40, 2, penaltyConfig);
      expect(points).toBe(40);
    });

    it('should handle neutral zone when penalties enabled', () => {
      const penaltyConfig: BowlingConfig = {
        ...config,
        penaltiesEnabled: true,
      };

      // Economy = (30/24)*6 = 7.5 (between bonus 7 and penalty 8)
      // Neutral zone
      const points = calculateBowlingPoints(4, 30, 2, penaltyConfig);
      expect(points).toBe(50); // Just wicket points
    });

    it('should handle fractional overs correctly', () => {
      // 3.2 overs = 20 balls
      // Economy = (25/20)*6 = 7.5
      const points = calculateBowlingPoints(3.2, 25, 1, config);
      
      expect(typeof points).toBe('number');
    });

    it('should handle zero wickets', () => {
      const points = calculateBowlingPoints(4, 28, 0, config);
      // Just economy bonus, no wicket points
      expect(points).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero runs conceded', () => {
      // Economy = 0 (excellent)
      // Bonus = (7 - 0) * 5 = 35
      const points = calculateBowlingPoints(4, 0, 0, config);
      expect(points).toBe(35);
    });

    it('should round to 2 decimals', () => {
      const points = calculateBowlingPoints(3.3, 27, 2, config);
      
      expect(typeof points).toBe('number');
      expect(points.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    });

    it('should use default config values', () => {
      const points = calculateBowlingPoints(4, 28, 2, DEFAULT_BOWLING_CONFIG);
      expect(typeof points).toBe('number');
    });
  });

  describe('calculatePlayerContribution', () => {
    it('should calculate regular player contribution', () => {
      const player = createPlayer('p1', 150, 100);
      const contrib = calculatePlayerContribution(player, 'regular');
      
      expect(contrib).toBe(50); // 150 - 100
    });

    it('should calculate captain contribution with 2x multiplier', () => {
      const player = createPlayer('p1', 200, 100, 150);
      const contrib = calculatePlayerContribution(player, 'captain');
      
      // Base: (150-100)*1.0 = 50
      // Bonus: (200-150)*2.0 = 100
      // Total: 150
      expect(contrib).toBe(150);
    });

    it('should calculate vice-captain contribution with 1.5x multiplier', () => {
      const player = createPlayer('p1', 200, 100, 150);
      const contrib = calculatePlayerContribution(player, 'viceCaptain');
      
      // Base: (150-100)*1.0 = 50
      // Bonus: (200-150)*1.5 = 75
      // Total: 125
      expect(contrib).toBe(125);
    });

    it('should calculate x-factor contribution with 1.25x multiplier', () => {
      const player = createPlayer('p1', 200, 100, 150);
      const contrib = calculatePlayerContribution(player, 'xFactor');
      
      // Base: (150-100)*1.0 = 50
      // Bonus: (200-150)*1.25 = 62.5
      // Total: 112.5
      expect(contrib).toBe(112.5);
    });

    it('should handle missing pointsAtJoining (default to 0)', () => {
      const player = createPlayer('p1', 100, 0);
      player.pointsAtJoining = undefined;
      
      const contrib = calculatePlayerContribution(player, 'regular');
      expect(contrib).toBe(100);
    });

    it('should handle missing pointsWhenRoleAssigned (default to pointsAtJoining)', () => {
      const player = createPlayer('p1', 200, 100);
      // pointsWhenRoleAssigned is undefined, should default to pointsAtJoining
      
      const contrib = calculatePlayerContribution(player, 'captain');
      
      // All points treated as bonus with 2x multiplier
      expect(contrib).toBe(200); // (200-100)*2.0
    });

    it('should handle player with zero points', () => {
      const player = createPlayer('p1', 0, 0);
      
      const contrib = calculatePlayerContribution(player, 'captain');
      expect(contrib).toBe(0);
    });

    it('should handle negative calculation results using Math.max', () => {
      // Edge case: current points less than pointsAtJoining (shouldn't happen in real data)
      const player = createPlayer('p1', 50, 100);
      
      const contrib = calculatePlayerContribution(player, 'regular');
      expect(contrib).toBe(0); // Math.max(0, 50-100) = 0
    });
  });

  describe('calculateSquadPoints', () => {
    it('should calculate total squad points for starting XI', () => {
      const players = [
        createPlayer('p1', 100, 50),
        createPlayer('p2', 150, 100),
        createPlayer('p3', 200, 150),
      ];

      const result = calculateSquadPoints(players, 3, undefined, undefined, undefined, 0);

      expect(result.totalPoints).toBe(150); // 50 + 50 + 50
      expect(result.captainPoints).toBe(0);
      expect(result.viceCaptainPoints).toBe(0);
      expect(result.xFactorPoints).toBe(0);
    });

    it('should include captain multiplier', () => {
      const players = [
        createPlayer('c1', 200, 100, 100), // Captain
        createPlayer('p2', 150, 100),
      ];

      const result = calculateSquadPoints(players, 2, 'c1', undefined, undefined, 0);

      // Captain: (100-100)*1 + (200-100)*2 = 200
      // Regular: 150-100 = 50
      expect(result.totalPoints).toBe(250);
      expect(result.captainPoints).toBe(200);
    });

    it('should include vice-captain multiplier', () => {
      const players = [
        createPlayer('vc1', 200, 100, 100), // VC
        createPlayer('p2', 150, 100),
      ];

      const result = calculateSquadPoints(players, 2, undefined, 'vc1', undefined, 0);

      // VC: (100-100)*1 + (200-100)*1.5 = 150
      // Regular: 150-100 = 50
      expect(result.totalPoints).toBe(200);
      expect(result.viceCaptainPoints).toBe(150);
    });

    it('should include x-factor multiplier', () => {
      const players = [
        createPlayer('x1', 200, 100, 100), // X-Factor
        createPlayer('p2', 150, 100),
      ];

      const result = calculateSquadPoints(players, 2, undefined, undefined, 'x1', 0);

      // X: (100-100)*1 + (200-100)*1.25 = 125
      // Regular: 150-100 = 50
      expect(result.totalPoints).toBe(175);
      expect(result.xFactorPoints).toBe(125);
    });

    it('should add banked points', () => {
      const players = [
        createPlayer('p1', 100, 50),
      ];

      const result = calculateSquadPoints(players, 1, undefined, undefined, undefined, 200);

      expect(result.totalPoints).toBe(250); // 50 + 200 banked
    });

    it('should only count starting XI, not bench', () => {
      const players = [
        createPlayer('p1', 100, 50),
        createPlayer('p2', 100, 50),
        createPlayer('p3', 100, 50),
        createPlayer('bench1', 1000, 0), // Bench player with high points
        createPlayer('bench2', 1000, 0), // Should not be counted
      ];

      const result = calculateSquadPoints(players, 3, undefined, undefined, undefined, 0);

      expect(result.totalPoints).toBe(150); // Only first 3 players
    });

    it('should handle all roles together', () => {
      const players = [
        createPlayer('c1', 300, 100, 100), // Captain
        createPlayer('vc1', 250, 100, 100), // VC
        createPlayer('x1', 200, 100, 100), // X-Factor
        ...Array(8).fill(null).map((_, i) => createPlayer(`p${i}`, 150, 100)),
      ];

      const result = calculateSquadPoints(players, 11, 'c1', 'vc1', 'x1', 50);

      // Captain: (300-100)*2 = 400
      // VC: (250-100)*1.5 = 225
      // X: (200-100)*1.25 = 125
      // Regular: 8 * 50 = 400
      // Banked: 50
      // Total: 1200
      expect(result.totalPoints).toBe(1200);
      expect(result.captainPoints).toBe(400);
      expect(result.viceCaptainPoints).toBe(225);
      expect(result.xFactorPoints).toBe(125);
    });

    it('should default banked points to 0 when not provided', () => {
      const players = [createPlayer('p1', 100, 50)];
      
      const result = calculateSquadPoints(players, 1, undefined, undefined, undefined);

      expect(result.totalPoints).toBe(50);
    });
  });

  describe('validateRoleTimestamp', () => {
    it('should validate regular player without timestamp', () => {
      const player = createPlayer('p1', 100, 50);
      
      const result = validateRoleTimestamp(player, 'regular');

      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should invalidate captain without pointsWhenRoleAssigned', () => {
      const player = createPlayer('p1', 150, 100);
      
      const result = validateRoleTimestamp(player, 'captain');

      expect(result.valid).toBe(false);
      expect(result.warning).toContain('captain');
      expect(result.warning).toContain('pointsWhenRoleAssigned');
    });

    it('should validate captain with proper timestamp', () => {
      const player = createPlayer('p1', 200, 100, 150);
      
      const result = validateRoleTimestamp(player, 'captain');

      expect(result.valid).toBe(true);
    });

    it('should detect timestamp less than pointsAtJoining (corruption)', () => {
      const player = createPlayer('p1', 200, 100, 50); // 50 < 100
      
      const result = validateRoleTimestamp(player, 'captain');

      expect(result.valid).toBe(false);
      expect(result.warning).toContain('less than pointsAtJoining');
      expect(result.warning).toContain('corruption');
    });

    it('should detect timestamp greater than current points (corruption)', () => {
      const player = createPlayer('p1', 150, 100, 200); // 200 > 150
      
      const result = validateRoleTimestamp(player, 'viceCaptain');

      expect(result.valid).toBe(false);
      expect(result.warning).toContain('greater than current points');
      expect(result.warning).toContain('corruption');
    });

    it('should validate all role types', () => {
      const player = createPlayer('p1', 200, 100, 150);
      
      expect(validateRoleTimestamp(player, 'captain').valid).toBe(true);
      expect(validateRoleTimestamp(player, 'viceCaptain').valid).toBe(true);
      expect(validateRoleTimestamp(player, 'xFactor').valid).toBe(true);
      expect(validateRoleTimestamp(player, 'regular').valid).toBe(true);
    });
  });
});

export {};
