/**
 * Dynamic Slot Management Utility
 *
 * Handles intelligent auto-slotting of players based on league-specific squad rules.
 * Does NOT hardcode formation (e.g., 3-3-3), instead reads from league.squadRules.
 *
 * Slot Layout Example (for squadSize=11, min: 3 bat, 3 bowl, 1 AR, 1 WK):
 * [0-2]   = Required Batsmen (3 slots)
 * [3-5]   = Required Bowlers (3 slots)
 * [6]     = Required Allrounders (1 slot)
 * [7]     = Required Wicketkeepers (1 slot)
 * [8-10]  = Flexible (3 slots) - any role
 */

import type { League, SquadPlayer } from '../types/database';

export type PlayerRole = 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper';

export interface SlotRanges {
  batsman: { start: number; end: number; count: number };
  bowler: { start: number; end: number; count: number };
  allrounder: { start: number; end: number; count: number };
  wicketkeeper: { start: number; end: number; count: number };
  flexible: { start: number; end: number; count: number };
}

/**
 * Calculate slot ranges based on league squad rules
 */
export function calculateSlotRanges(league: League): SlotRanges {
  const { squadRules, squadSize } = league;

  let currentIndex = 0;

  // Required Batsmen slots
  const batsmanStart = currentIndex;
  const batsmanEnd = currentIndex + squadRules.minBatsmen - 1;
  currentIndex += squadRules.minBatsmen;

  // Required Bowlers slots
  const bowlerStart = currentIndex;
  const bowlerEnd = currentIndex + squadRules.minBowlers - 1;
  currentIndex += squadRules.minBowlers;

  // Required Allrounders slots
  const allrounderStart = currentIndex;
  const allrounderEnd = currentIndex + squadRules.minAllrounders - 1;
  currentIndex += squadRules.minAllrounders;

  // Required Wicketkeepers slots
  const wicketkeeperStart = currentIndex;
  const wicketkeeperEnd = currentIndex + squadRules.minWicketkeepers - 1;
  currentIndex += squadRules.minWicketkeepers;

  // Flexible slots (remaining slots)
  const totalRequired = squadRules.minBatsmen + squadRules.minBowlers +
                       squadRules.minAllrounders + squadRules.minWicketkeepers;
  const flexibleCount = squadSize - totalRequired;
  const flexibleStart = currentIndex;
  const flexibleEnd = flexibleStart + flexibleCount - 1;

  return {
    batsman: { start: batsmanStart, end: batsmanEnd, count: squadRules.minBatsmen },
    bowler: { start: bowlerStart, end: bowlerEnd, count: squadRules.minBowlers },
    allrounder: { start: allrounderStart, end: allrounderEnd, count: squadRules.minAllrounders },
    wicketkeeper: { start: wicketkeeperStart, end: wicketkeeperEnd, count: squadRules.minWicketkeepers },
    flexible: { start: flexibleStart, end: flexibleEnd, count: flexibleCount }
  };
}

/**
 * Determine if a position is in a required slot or flexible slot
 */
export function getSlotType(position: number, slotRanges: SlotRanges): {
  type: 'required' | 'flexible';
  role?: PlayerRole;
} {
  // Check each required role range
  if (position >= slotRanges.batsman.start && position <= slotRanges.batsman.end) {
    return { type: 'required', role: 'batsman' };
  }
  if (position >= slotRanges.bowler.start && position <= slotRanges.bowler.end) {
    return { type: 'required', role: 'bowler' };
  }
  if (position >= slotRanges.allrounder.start && position <= slotRanges.allrounder.end) {
    return { type: 'required', role: 'allrounder' };
  }
  if (position >= slotRanges.wicketkeeper.start && position <= slotRanges.wicketkeeper.end) {
    return { type: 'required', role: 'wicketkeeper' };
  }

  // Must be in flexible range
  return { type: 'flexible' };
}

/**
 * Find a player in flexible slots that matches the required role
 */
export function findFlexiblePlayerByRole(
  players: SquadPlayer[],
  role: PlayerRole,
  slotRanges: SlotRanges
): { player: SquadPlayer; index: number } | null {
  const { flexible } = slotRanges;

  for (let i = flexible.start; i <= flexible.end && i < players.length; i++) {
    const player = players[i];
    if (player && player.role === role) {
      return { player, index: i };
    }
  }

  return null;
}

/**
 * Find the first empty slot in a required range
 */
export function findFirstEmptyRequiredSlot(
  players: SquadPlayer[],
  role: PlayerRole,
  slotRanges: SlotRanges
): number | null {
  const range = slotRanges[role];

  for (let i = range.start; i <= range.end; i++) {
    if (!players[i]) {
      return i;
    }
  }

  return null;
}

/**
 * Find the best position to insert a new player
 * Priority: Required slot of matching role > Flexible slot
 */
export function findBestInsertionPosition(
  players: SquadPlayer[],
  playerRole: PlayerRole,
  slotRanges: SlotRanges
): number {
  // First, try to find an empty required slot for this role
  const emptyRequiredSlot = findFirstEmptyRequiredSlot(players, playerRole, slotRanges);
  if (emptyRequiredSlot !== null) {
    return emptyRequiredSlot;
  }

  // Otherwise, find an empty flexible slot
  const { flexible } = slotRanges;
  for (let i = flexible.start; i <= flexible.end; i++) {
    if (!players[i]) {
      return i;
    }
  }

  // Fallback: append at the end (shouldn't happen if squad size is correct)
  return players.length;
}

/**
 * STEP 2 & 3: After removing a player, rebalance the squad
 * - Move flexible players to fill empty required slots
 * - Return the rebalanced player array
 */
export function rebalanceAfterRemoval(
  players: SquadPlayer[],
  removedPosition: number,
  slotRanges: SlotRanges
): SquadPlayer[] {
  const rebalanced = [...players];

  // Check what type of slot was vacated
  const slotInfo = getSlotType(removedPosition, slotRanges);

  if (slotInfo.type === 'required' && slotInfo.role) {
    // A required slot is empty - try to backfill from flexible
    const flexibleMatch = findFlexiblePlayerByRole(rebalanced, slotInfo.role, slotRanges);

    if (flexibleMatch) {
      // Move the flexible player to the empty required slot
      rebalanced[removedPosition] = flexibleMatch.player;
      // Remove from flexible slot (will be filled by incoming player)
      delete rebalanced[flexibleMatch.index];
    }
  }

  return rebalanced;
}

/**
 * STEP 3: Insert incoming player intelligently
 */
export function insertPlayer(
  players: SquadPlayer[],
  newPlayer: SquadPlayer,
  slotRanges: SlotRanges
): SquadPlayer[] {
  const result = [...players];

  // Find the best position for this player
  const bestPosition = findBestInsertionPosition(result, newPlayer.role, slotRanges);

  // Insert at the best position
  result[bestPosition] = newPlayer;

  return result;
}

/**
 * COMPLETE AUTO-SLOTTING ALGORITHM
 * Combines removal, rebalancing, and insertion
 */
export function performAutoSlot(
  currentPlayers: SquadPlayer[],
  playerOutId: string,
  newPlayer: SquadPlayer,
  league: League
): SquadPlayer[] {
  // Calculate slot ranges based on league rules
  const slotRanges = calculateSlotRanges(league);

  // STEP 1: Remove the outgoing player
  const playerOutIndex = currentPlayers.findIndex(p => p.playerId === playerOutId);
  if (playerOutIndex === -1) {
    throw new Error('Player to remove not found');
  }

  const playersAfterRemoval = [...currentPlayers];
  delete playersAfterRemoval[playerOutIndex];

  // STEP 2: Rebalance - move flexible players to fill required slots
  const rebalanced = rebalanceAfterRemoval(playersAfterRemoval, playerOutIndex, slotRanges);

  // STEP 3: Insert incoming player at best position
  const finalPlayers = insertPlayer(rebalanced, newPlayer, slotRanges);

  // STEP 4: Clean up - filter out any undefined/null and return
  return finalPlayers.filter((p): p is SquadPlayer => p !== undefined && p !== null);
}

/**
 * Validate that a squad formation is correct
 */
export function validateFormation(players: SquadPlayer[], league: League): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const { squadRules, squadSize } = league;

  // Count players by role in main squad
  const mainSquad = players.slice(0, squadSize);
  const counts = {
    batsman: mainSquad.filter(p => p.role === 'batsman').length,
    bowler: mainSquad.filter(p => p.role === 'bowler').length,
    allrounder: mainSquad.filter(p => p.role === 'allrounder').length,
    wicketkeeper: mainSquad.filter(p => p.role === 'wicketkeeper').length
  };

  // Validate minimums
  if (counts.batsman < squadRules.minBatsmen) {
    errors.push(`Need at least ${squadRules.minBatsmen} batsmen (have ${counts.batsman})`);
  }
  if (counts.bowler < squadRules.minBowlers) {
    errors.push(`Need at least ${squadRules.minBowlers} bowlers (have ${counts.bowler})`);
  }
  if (counts.allrounder < squadRules.minAllrounders) {
    errors.push(`Need at least ${squadRules.minAllrounders} allrounders (have ${counts.allrounder})`);
  }
  if (counts.wicketkeeper < squadRules.minWicketkeepers) {
    errors.push(`Need at least ${squadRules.minWicketkeepers} wicketkeepers (have ${counts.wicketkeeper})`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
