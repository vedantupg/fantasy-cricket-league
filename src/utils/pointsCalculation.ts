/**
 * Points Calculation Utilities
 *
 * Config-driven scoring system for batting and bowling performance
 */

import type { BattingConfig, BowlingConfig } from '../types/database';

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
