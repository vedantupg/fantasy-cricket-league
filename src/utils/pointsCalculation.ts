/**
 * Points Calculation Utilities
 *
 * Config-driven scoring system for batting and bowling performance
 * AND squad points calculation with role multipliers (C/VC/X)
 */

import type { BattingConfig, BowlingConfig, SquadPlayer } from '../types/database';

/**
 * Calculate batting points based on runs, balls, and pool's batting config
 *
 * Supports both bonus-only and bonus+penalty modes based on config
 *
 * @param runs - Runs scored
 * @param ballsFaced - Balls faced
 * @param config - Batting configuration from the player pool
 * @returns Calculated batting points (rounded to 2 decimals)
 */
export function calculateBattingPoints(
  runs: number,
  ballsFaced: number,
  config: BattingConfig
): number {
  // If less than minimum threshold, return runs as-is (no bonus/penalty calculation)
  if (ballsFaced < config.minBallsThreshold) {
    return parseFloat(runs.toFixed(2));
  }

  // Calculate Strike Rate
  const SR = (runs / ballsFaced) * 100;

  let strikeRateBonus = 0;

  if (config.penaltiesEnabled && config.penaltySRThreshold) {
    // GENERALIZED MODE: Bonuses AND Penalties
    if (SR > config.bonusSRBaseline) {
      // Bonus zone
      strikeRateBonus = (runs * (SR - config.bonusSRBaseline)) / config.bonusDivisor;
    } else if (SR < config.penaltySRThreshold) {
      // Penalty zone (results in negative bonus)
      strikeRateBonus = (runs * (SR - config.penaltySRThreshold)) / config.bonusDivisor;
    }
    // Neutral zone: between penaltySRThreshold and bonusSRBaseline
  } else {
    // BONUS-ONLY MODE (No Penalties)
    if (SR >= config.bonusSRTrigger) {
      strikeRateBonus = (runs * (SR - config.bonusSRBaseline)) / config.bonusDivisor;
    }
  }

  // Total points = base runs + SR modifier
  const totalPoints = runs + strikeRateBonus;

  return parseFloat(totalPoints.toFixed(2));
}

/**
 * Calculate bowling points based on overs, runs conceded, wickets, and pool's bowling config
 *
 * Supports both bonus-only and bonus+penalty modes based on config
 *
 * @param overs - Overs bowled (e.g., 3.2 = 3 overs 2 balls)
 * @param runsConceded - Runs conceded
 * @param wickets - Wickets taken
 * @param config - Bowling configuration from the player pool
 * @returns Calculated bowling points (rounded to 2 decimals)
 */
export function calculateBowlingPoints(
  overs: number,
  runsConceded: number,
  wickets: number,
  config: BowlingConfig
): number {
  // Convert overs to balls (e.g., 3.2 = 20 balls)
  const balls = Math.floor(overs) * 6 + (Math.ceil(overs * 10) % 10);

  // Calculate economy rate
  const economy = balls > 0 ? (runsConceded / balls) * 6 : 0;

  // Base wicket points
  const basePoints = wickets * config.wicketPoints;

  // If overs less than or equal to minimum threshold, return wicket points only
  if (overs <= config.minOversForEconomy) {
    return parseFloat(basePoints.toFixed(2));
  }

  let economyBonus = 0;

  if (config.penaltiesEnabled && config.economyPenaltyThreshold) {
    // GENERALIZED MODE: Bonuses AND Penalties
    if (economy < config.economyBonusThreshold) {
      // Bonus zone (good economy)
      economyBonus = (config.economyBonusThreshold - parseFloat(economy.toFixed(1))) * config.economyMultiplier;
    } else if (economy > config.economyPenaltyThreshold) {
      // Penalty zone (poor economy) - results in negative bonus
      economyBonus = (config.economyPenaltyThreshold - parseFloat(economy.toFixed(1))) * config.economyMultiplier;
    }
    // Neutral zone: between bonusThreshold and penaltyThreshold
  } else {
    // BONUS-ONLY MODE (No Penalties)
    if (economy < config.economyBonusThreshold) {
      economyBonus = (config.economyBonusThreshold - parseFloat(economy.toFixed(1))) * config.economyMultiplier;
    }
  }

  // Total points = wicket points + economy modifier
  const totalPoints = basePoints + economyBonus;

  return parseFloat(totalPoints.toFixed(2));
}

/**
 * Default configurations (Current League Rules - No Penalties)
 */
export const DEFAULT_BATTING_CONFIG: BattingConfig = {
  minBallsThreshold: 7,
  bonusSRTrigger: 150,
  bonusSRBaseline: 130,
  bonusDivisor: 200,
  penaltiesEnabled: false,
  penaltySRThreshold: 120, // Not used when penalties disabled
};

export const DEFAULT_BOWLING_CONFIG: BowlingConfig = {
  wicketPoints: 25,
  economyBonusThreshold: 7,
  economyMultiplier: 5,
  penaltiesEnabled: false,
  economyPenaltyThreshold: 8, // Not used when penalties disabled
  minOversForEconomy: 1,
};

/**
 * =============================================================================
 * SQUAD POINTS CALCULATION WITH ROLE MULTIPLIERS
 * =============================================================================
 *
 * CRITICAL: These functions ensure that points are calculated the same way everywhere:
 * - During squad creation
 * - During transfers
 * - During pool updates (recalculateLeaguesUsingPool)
 *
 * Using different formulas in different places causes point instability!
 */

/**
 * Calculate a player's contribution to squad points based on their role
 *
 * This function properly handles:
 * 1. Base points earned before role assignment (1x multiplier)
 * 2. Bonus points earned after role assignment (role-specific multiplier)
 *
 * @param player - The squad player to calculate contribution for
 * @param role - The role this player has ('captain', 'viceCaptain', 'xFactor', or 'regular')
 * @returns The total points this player contributes to the squad
 *
 * @example
 * Player joined at 100 points (pointsAtJoining = 100)
 * Player made VC at 150 points (pointsWhenRoleAssigned = 150)
 * Player now has 200 points (points = 200)
 *
 * Calculation:
 * - Base points: 150 - 100 = 50 (earned as regular, 1x multiplier)
 * - Bonus points: 200 - 150 = 50 (earned as VC, 1.5x multiplier)
 * - Total contribution: 50 * 1.0 + 50 * 1.5 = 50 + 75 = 125 points
 */
export function calculatePlayerContribution(
  player: SquadPlayer,
  role: 'captain' | 'viceCaptain' | 'xFactor' | 'regular'
): number {
  const pointsAtJoining = player.pointsAtJoining ?? 0;
  const pointsWhenRoleAssigned = player.pointsWhenRoleAssigned ?? pointsAtJoining;

  // Base points: earned before role assignment (or all points if no role)
  const basePoints = Math.max(0, pointsWhenRoleAssigned - pointsAtJoining);

  // Bonus points: earned after role assignment (only if role assigned)
  const bonusPoints = Math.max(0, player.points - pointsWhenRoleAssigned);

  // Apply role-specific multipliers
  if (role === 'captain') {
    // Captain: base at 1x, bonus at 2x
    return basePoints * 1.0 + bonusPoints * 2.0;
  } else if (role === 'viceCaptain') {
    // Vice-Captain: base at 1x, bonus at 1.5x
    return basePoints * 1.0 + bonusPoints * 1.5;
  } else if (role === 'xFactor') {
    // X-Factor: base at 1x, bonus at 1.25x
    return basePoints * 1.0 + bonusPoints * 1.25;
  } else {
    // Regular player: all points at 1x (no multiplier)
    return Math.max(0, player.points - pointsAtJoining);
  }
}

/**
 * Calculate total squad points including all role multipliers and banked points
 *
 * IMPORTANT: Only counts starting XI (first squadSize players), excludes bench
 *
 * @param players - Array of squad players (starting XI + bench)
 * @param squadSize - Number of players in starting XI (usually 11)
 * @param captainId - Player ID of the captain (optional)
 * @param viceCaptainId - Player ID of the vice-captain (optional)
 * @param xFactorId - Player ID of the X-factor (optional)
 * @param bankedPoints - Previously accumulated points from transfers (default 0)
 * @returns Object with totalPoints and individual role contributions
 */
export function calculateSquadPoints(
  players: SquadPlayer[],
  squadSize: number,
  captainId: string | undefined,
  viceCaptainId: string | undefined,
  xFactorId: string | undefined,
  bankedPoints: number = 0
): {
  totalPoints: number;
  captainPoints: number;
  viceCaptainPoints: number;
  xFactorPoints: number;
} {
  let totalPoints = 0;
  let captainPoints = 0;
  let viceCaptainPoints = 0;
  let xFactorPoints = 0;

  // CRITICAL: Only count starting XI (first squadSize players), exclude bench
  const startingXI = players.slice(0, squadSize);

  startingXI.forEach(player => {
    // Determine this player's role
    let role: 'captain' | 'viceCaptain' | 'xFactor' | 'regular' = 'regular';

    if (captainId === player.playerId) {
      role = 'captain';
    } else if (viceCaptainId === player.playerId) {
      role = 'viceCaptain';
    } else if (xFactorId === player.playerId) {
      role = 'xFactor';
    }

    // Calculate this player's contribution using shared logic
    const contribution = calculatePlayerContribution(player, role);

    // Track role-specific contributions
    if (role === 'captain') {
      captainPoints = contribution;
    } else if (role === 'viceCaptain') {
      viceCaptainPoints = contribution;
    } else if (role === 'xFactor') {
      xFactorPoints = contribution;
    }

    totalPoints += contribution;
  });

  // Add banked points from previous transfers
  totalPoints += bankedPoints;

  return {
    totalPoints,
    captainPoints,
    viceCaptainPoints,
    xFactorPoints,
  };
}

/**
 * Validate that pointsWhenRoleAssigned is set for players with roles
 *
 * This helps catch data integrity issues where role timestamps are missing
 *
 * @param player - The squad player to validate
 * @param role - The role this player has
 * @returns Validation result with any warnings
 */
export function validateRoleTimestamp(
  player: SquadPlayer,
  role: 'captain' | 'viceCaptain' | 'xFactor' | 'regular'
): { valid: boolean; warning?: string } {
  // Regular players don't need pointsWhenRoleAssigned
  if (role === 'regular') {
    return { valid: true };
  }

  // Players with roles should have pointsWhenRoleAssigned set
  if (player.pointsWhenRoleAssigned === undefined) {
    return {
      valid: false,
      warning: `⚠️ ${player.playerName} is ${role} but missing pointsWhenRoleAssigned. This may cause incorrect point calculations.`,
    };
  }

  // Check if pointsWhenRoleAssigned is reasonable
  const pointsAtJoining = player.pointsAtJoining ?? 0;
  if (player.pointsWhenRoleAssigned < pointsAtJoining) {
    return {
      valid: false,
      warning: `⚠️ ${player.playerName} has pointsWhenRoleAssigned (${player.pointsWhenRoleAssigned}) less than pointsAtJoining (${pointsAtJoining}). Data corruption detected.`,
    };
  }

  if (player.pointsWhenRoleAssigned > player.points) {
    return {
      valid: false,
      warning: `⚠️ ${player.playerName} has pointsWhenRoleAssigned (${player.pointsWhenRoleAssigned}) greater than current points (${player.points}). Data corruption detected.`,
    };
  }

  return { valid: true };
}
