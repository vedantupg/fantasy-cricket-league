import type { LeaderboardSnapshot, StandingEntry } from '../types/database';

/**
 * Calculate rank streaks for all users across historical snapshots
 * A streak is the number of consecutive snapshots where a user maintained the same rank
 * @param snapshots - Array of historical snapshots, ordered by date descending (most recent first)
 * @returns Map of userId to their current rank streak
 */
export function calculateRankStreaks(
  snapshots: LeaderboardSnapshot[]
): Map<string, number> {
  const streaks = new Map<string, number>();

  console.log('🔥 STREAK CALC: Starting calculation with', snapshots.length, 'snapshots');

  if (snapshots.length === 0) {
    console.log('🔥 STREAK CALC: No snapshots, returning empty map');
    return streaks;
  }

  if (snapshots.length < 2) {
    console.log('🔥 STREAK CALC: Only 1 snapshot, need at least 2 for streaks');
    return streaks;
  }

  // Get all unique user IDs from the most recent snapshot
  const latestSnapshot = snapshots[0];
  const userIds = latestSnapshot.standings.map(s => s.userId);
  console.log('🔥 STREAK CALC: Processing', userIds.length, 'users');

  // For each user, calculate their streak
  userIds.forEach(userId => {
    let streak = 0; // Start at 0, increment for each maintained rank
    let currentRank: number | null = null;

    // Iterate through snapshots from most recent to oldest
    for (let i = 0; i < snapshots.length; i++) {
      const snapshot = snapshots[i];
      const standing = snapshot.standings.find(s => s.userId === userId);

      if (!standing) {
        // User not found in this snapshot, stop counting
        break;
      }

      if (currentRank === null) {
        // First snapshot, set current rank
        currentRank = standing.rank;
      } else if (standing.rank === currentRank) {
        // Same rank as previous snapshot, increment streak
        streak++;
      } else {
        // Rank changed, stop counting
        break;
      }
    }

    // Only set streak if it's 1 or more (rank maintained for at least 1 update)
    if (streak >= 1) {
      streaks.set(userId, streak);
      console.log('🔥 STREAK CALC: User', userId, 'has streak of', streak);
    }
  });

  console.log('🔥 STREAK CALC: Total streaks found:', streaks.size);
  return streaks;
}

/**
 * Attach streak data to standings
 * @param standings - Current standings
 * @param streaks - Map of userId to streak count
 * @returns Updated standings with streak data
 */
export function attachStreaksToStandings(
  standings: StandingEntry[],
  streaks: Map<string, number>
): StandingEntry[] {
  return standings.map(standing => ({
    ...standing,
    rankStreak: streaks.get(standing.userId),
  }));
}

/**
 * Find the most consistent performer (longest streak)
 * @param standings - Standings with streak data
 * @returns The standing with the longest streak, or null if no streaks
 */
export function findMostConsistentPerformer(
  standings: StandingEntry[]
): StandingEntry | null {
  const standingsWithStreaks = standings.filter(s => s.rankStreak && s.rankStreak >= 1);

  if (standingsWithStreaks.length === 0) {
    return null;
  }

  return standingsWithStreaks.reduce((max, current) =>
    (current.rankStreak || 0) > (max.rankStreak || 0) ? current : max
  );
}
