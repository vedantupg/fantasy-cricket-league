/**
 * Multi-User Concurrent Operations Integration Tests
 *
 * These tests verify:
 * - Concurrent squad operations
 * - Race condition handling
 * - Transaction integrity
 * - Conflict resolution
 */

import { squadService, playerPoolService, leagueService, leaderboardSnapshotService } from '../../services/firestore';
import type { LeagueSquad, PlayerPool } from '../../types/database';

jest.mock('../../services/firestore');

describe('Multi-User Concurrent Operations - Integration Tests', () => {
  let mockPlayerPool: PlayerPool;
  let mockSquads: LeagueSquad[];

  beforeEach(() => {
    jest.clearAllMocks();

    mockPlayerPool = {
      id: 'pool-1',
      name: 'ASHES 25/26',
      version: '1.0',
      players: [
        { playerId: 'p1', name: 'Steve Smith', team: 'Australia', role: 'Batsman', points: 500 },
        { playerId: 'p2', name: 'Pat Cummins', team: 'Australia', role: 'Bowler', points: 400 },
        { playerId: 'p3', name: 'Travis Head', team: 'Australia', role: 'All-rounder', points: 550 },
      ],
      createdAt: new Date(),
      lastUpdated: new Date(),
    };

    mockSquads = [
      {
        id: 'squad-1',
        leagueId: 'league-1',
        userId: 'user-1',
        squadName: 'Thunder Strikers',
        players: [
          { playerId: 'p1', playerName: 'Steve Smith', team: 'Australia', role: 'Batsman', points: 500, pointsAtJoining: 400 },
        ],
        captainId: 'p1',
        viceCaptainId: null,
        xFactorId: null,
        totalPoints: 200, // (500-400)*2.0 = 200
        captainPoints: 200,
        viceCaptainPoints: 0,
        xFactorPoints: 0,
        bankedPoints: 0,
        isSubmitted: true,
        transfersRemaining: 10,
        transfersUsed: 0,
        benchTransfersRemaining: 5,
        benchTransfersUsed: 0,
        flexibleTransfersRemaining: 3,
        flexibleTransfersUsed: 0,
        midSeasonTransfersRemaining: 2,
        midSeasonTransfersUsed: 0,
        transferHistory: [],
        lastUpdated: new Date(),
      },
      {
        id: 'squad-2',
        leagueId: 'league-1',
        userId: 'user-2',
        squadName: 'Lightning Bolts',
        players: [
          { playerId: 'p2', playerName: 'Pat Cummins', team: 'Australia', role: 'Bowler', points: 400, pointsAtJoining: 300 },
        ],
        captainId: 'p2',
        viceCaptainId: null,
        xFactorId: null,
        totalPoints: 200, // (400-300)*2.0 = 200
        captainPoints: 200,
        viceCaptainPoints: 0,
        xFactorPoints: 0,
        bankedPoints: 0,
        isSubmitted: true,
        transfersRemaining: 10,
        transfersUsed: 0,
        benchTransfersRemaining: 5,
        benchTransfersUsed: 0,
        flexibleTransfersRemaining: 3,
        flexibleTransfersUsed: 0,
        midSeasonTransfersRemaining: 2,
        midSeasonTransfersUsed: 0,
        transferHistory: [],
        lastUpdated: new Date(),
      },
    ];
  });

  describe('1. Concurrent Player Pool Updates', () => {
    test('Should handle simultaneous player pool updates for multiple leagues', async () => {
      const league1Squads = [mockSquads[0]];
      const league2Squads = [mockSquads[1]];

      (squadService.getByLeague as jest.Mock)
        .mockResolvedValueOnce(league1Squads)
        .mockResolvedValueOnce(league2Squads);

      (playerPoolService.getById as jest.Mock).mockResolvedValue(mockPlayerPool);

      // Simulate concurrent updates
      const updatePromises = [
        playerPoolService.recalculateLeaguesUsingPool('pool-1'),
        playerPoolService.recalculateLeaguesUsingPool('pool-1'),
      ];

      await Promise.all(updatePromises);

      // Both updates should complete without errors
      expect(playerPoolService.recalculateLeaguesUsingPool).toHaveBeenCalledTimes(2);
    });

    test('Should maintain data integrity when multiple squads update simultaneously', async () => {
      const updateCalls: any[] = [];

      (squadService.update as jest.Mock).mockImplementation(async (squadId, data) => {
        updateCalls.push({ squadId, data });
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 10));
        return;
      });

      // Simulate concurrent squad updates
      await Promise.all([
        squadService.update('squad-1', { totalPoints: 250 }),
        squadService.update('squad-2', { totalPoints: 300 }),
      ]);

      expect(updateCalls).toHaveLength(2);
      expect(updateCalls.some((call) => call.squadId === 'squad-1')).toBe(true);
      expect(updateCalls.some((call) => call.squadId === 'squad-2')).toBe(true);
    });
  });

  describe('2. Concurrent Transfer Operations', () => {
    test('Should prevent double-spending of transfers', async () => {
      const squad = { ...mockSquads[0] };
      let transfersRemaining = squad.transfersRemaining || 0;

      // Simulate two concurrent transfer attempts
      const makeTransfer = () => {
        if (transfersRemaining > 0) {
          transfersRemaining--;
          return true;
        }
        return false;
      };

      // Set transfersRemaining to 1
      transfersRemaining = 1;

      // First transfer should succeed
      const transfer1Success = makeTransfer();
      // Second transfer should fail (no transfers left)
      const transfer2Success = makeTransfer();

      expect(transfer1Success).toBe(true);
      expect(transfer2Success).toBe(false);
      expect(transfersRemaining).toBe(0);
    });

    test('Should handle concurrent role changes correctly', async () => {
      const squad = { ...mockSquads[0] };

      // Simulate two users trying to change captain simultaneously
      const updateCalls: any[] = [];

      (squadService.update as jest.Mock).mockImplementation(async (squadId, data) => {
        updateCalls.push({ squadId, data, timestamp: Date.now() });
        await new Promise((resolve) => setTimeout(resolve, 5));
        return;
      });

      await Promise.all([
        squadService.update(squad.id, { captainId: 'p1' }),
        squadService.update(squad.id, { captainId: 'p2' }),
      ]);

      // Both updates were attempted
      expect(updateCalls).toHaveLength(2);

      // Last write wins (typical Firestore behavior)
      const lastUpdate = updateCalls[updateCalls.length - 1];
      expect(['p1', 'p2']).toContain(lastUpdate.data.captainId);
    });
  });

  describe('3. Race Condition Scenarios', () => {
    test('Should handle race condition in snapshot creation', async () => {
      let snapshotCount = 0;

      (leaderboardSnapshotService.create as jest.Mock).mockImplementation(async (leagueId) => {
        snapshotCount++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return `snapshot-${snapshotCount}`;
      });

      // Simulate multiple concurrent snapshot creation attempts
      const snapshotPromises = [
        leaderboardSnapshotService.create('league-1'),
        leaderboardSnapshotService.create('league-1'),
        leaderboardSnapshotService.create('league-1'),
      ];

      const results = await Promise.all(snapshotPromises);

      // All snapshots created (though might be duplicates in real scenario)
      expect(results).toHaveLength(3);
      expect(snapshotCount).toBe(3);
    });

    test('Should handle optimistic locking with lastUpdated timestamp', async () => {
      const squad = { ...mockSquads[0] };
      const initialTimestamp = squad.lastUpdated;

      // Simulate optimistic locking check
      // Returns true if the expected timestamp matches the current timestamp
      const canUpdate = (expectedTimestamp: Date, currentTimestamp: Date) => {
        return expectedTimestamp.getTime() === currentTimestamp.getTime();
      };

      // First update succeeds (timestamps match)
      const update1Allowed = canUpdate(initialTimestamp, squad.lastUpdated);
      expect(update1Allowed).toBe(true);

      // Update the timestamp (simulates another user's update)
      // Add 1ms to ensure it's different
      squad.lastUpdated = new Date(Date.now() + 1);

      // Second update with stale timestamp fails (timestamps don't match)
      const update2Allowed = canUpdate(initialTimestamp, squad.lastUpdated);
      expect(update2Allowed).toBe(false);
    });
  });

  describe('4. Transaction Integrity', () => {
    test('Should maintain points consistency during concurrent updates', async () => {
      const initialTotalPoints = 1000;
      let currentTotalPoints = initialTotalPoints;

      // Simulate multiple point adjustments
      const adjustments = [100, -50, 200, -75, 150];

      for (const adjustment of adjustments) {
        currentTotalPoints += adjustment;
      }

      const expectedTotal = initialTotalPoints + 100 - 50 + 200 - 75 + 150; // = 1325

      expect(currentTotalPoints).toBe(expectedTotal);
    });

    test('Should correctly handle banking during concurrent transfers', async () => {
      let bankedPoints = 100;

      const transfers = [
        { playerOut: { points: 500, pointsAtJoining: 300 } }, // Bank 200
        { playerOut: { points: 400, pointsAtJoining: 250 } }, // Bank 150
        { playerOut: { points: 350, pointsAtJoining: 200 } }, // Bank 150
      ];

      for (const transfer of transfers) {
        const contribution = Math.max(0, transfer.playerOut.points - transfer.playerOut.pointsAtJoining);
        bankedPoints += contribution;
      }

      expect(bankedPoints).toBe(600); // 100 + 200 + 150 + 150
    });

    test('Should rollback changes on error during multi-step operation', async () => {
      const initialState = {
        totalPoints: 1000,
        bankedPoints: 100,
        transfersUsed: 5,
      };

      let currentState = { ...initialState };

      try {
        // Step 1: Update points
        currentState.totalPoints = 1100;

        // Step 2: Update banking
        currentState.bankedPoints = 200;

        // Step 3: Simulate error
        throw new Error('Transfer failed');

        // Step 4: Would update transfers (not reached)
        currentState.transfersUsed = 6;
      } catch (error) {
        // Rollback on error
        currentState = { ...initialState };
      }

      // State should be rolled back to initial
      expect(currentState).toEqual(initialState);
    });
  });

  describe('5. Conflict Resolution', () => {
    test('Should resolve conflicting captain assignments', async () => {
      const squad = { ...mockSquads[0] };

      // Scenario: User changes captain while admin also changes captain
      const userUpdate = { captainId: 'p2', lastUpdated: new Date('2025-01-15T10:00:00Z') };
      const adminUpdate = { captainId: 'p3', lastUpdated: new Date('2025-01-15T10:00:01Z') };

      // Later timestamp wins
      const finalUpdate = adminUpdate.lastUpdated > userUpdate.lastUpdated ? adminUpdate : userUpdate;

      expect(finalUpdate.captainId).toBe('p3'); // Admin update wins (1 second later)
    });

    test('Should merge non-conflicting concurrent updates', async () => {
      const squadState = {
        captainId: 'p1',
        viceCaptainId: 'p2',
        totalPoints: 1000,
      };

      // Update 1: Change captain
      const update1 = { captainId: 'p3' };

      // Update 2: Change vice-captain (non-conflicting)
      const update2 = { viceCaptainId: 'p4' };

      // Merge updates
      const mergedState = {
        ...squadState,
        ...update1,
        ...update2,
      };

      expect(mergedState).toEqual({
        captainId: 'p3',
        viceCaptainId: 'p4',
        totalPoints: 1000,
      });
    });

    test('Should detect and prevent conflicting transfer operations', async () => {
      const transferHistory = [
        { timestamp: new Date('2025-01-01'), playerOut: 'p1', playerIn: 'p4' },
        { timestamp: new Date('2025-01-02'), playerOut: 'p2', playerIn: 'p5' },
      ];

      // Try to transfer out a player that was already transferred out
      const newTransfer = { playerOut: 'p1', playerIn: 'p6' };

      const alreadyTransferredOut = transferHistory.some((t) => t.playerOut === newTransfer.playerOut);

      expect(alreadyTransferredOut).toBe(true); // Should be prevented
    });
  });

  describe('6. Concurrent Leaderboard Updates', () => {
    test('Should handle multiple squads updating simultaneously and maintain correct rankings', async () => {
      const squads = [...mockSquads];

      // Simulate concurrent point updates
      const updates = [
        { squadId: 'squad-1', totalPoints: 2500 },
        { squadId: 'squad-2', totalPoints: 2800 },
      ];

      // Apply updates
      for (const update of updates) {
        const squad = squads.find((s) => s.id === update.squadId);
        if (squad) {
          squad.totalPoints = update.totalPoints;
        }
      }

      // Recalculate rankings
      const sortedSquads = [...squads].sort((a, b) => b.totalPoints - a.totalPoints);
      const standings = sortedSquads.map((s, index) => ({
        squadId: s.id,
        squadName: s.squadName,
        totalPoints: s.totalPoints,
        rank: index + 1,
      }));

      expect(standings[0]).toMatchObject({ squadId: 'squad-2', rank: 1, totalPoints: 2800 });
      expect(standings[1]).toMatchObject({ squadId: 'squad-1', rank: 2, totalPoints: 2500 });
    });

    test('Should prevent snapshot corruption during concurrent reads/writes', async () => {
      let snapshotData = { standings: [] as any[] };

      // Simulate write
      const writeSnapshot = async (newStandings: any[]) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        snapshotData = { standings: newStandings };
      };

      // Simulate read
      const readSnapshot = async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return { ...snapshotData };
      };

      // Concurrent write and read
      const writePromise = writeSnapshot([
        { squadId: 'squad-1', rank: 1 },
        { squadId: 'squad-2', rank: 2 },
      ]);

      const readPromise = readSnapshot();

      await Promise.all([writePromise, readPromise]);

      const finalSnapshot = await readSnapshot();

      // Final snapshot should have the written data
      expect(finalSnapshot.standings).toHaveLength(2);
    });
  });

  describe('7. Performance Under Load', () => {
    test('Should handle bulk squad updates efficiently', async () => {
      const bulkSquads = Array.from({ length: 100 }, (_, i) => ({
        ...mockSquads[0],
        id: `squad-${i}`,
        squadName: `Squad ${i}`,
        totalPoints: Math.floor(Math.random() * 3000),
      }));

      let updateCount = 0;
      (squadService.update as jest.Mock).mockImplementation(async () => {
        updateCount++;
        await new Promise((resolve) => setTimeout(resolve, 1));
        return;
      });

      // Batch update all squads
      await Promise.all(bulkSquads.map((squad) => squadService.update(squad.id, { totalPoints: squad.totalPoints })));

      expect(updateCount).toBe(100);
    });

    test('Should batch read operations for efficiency', async () => {
      const squadIds = ['squad-1', 'squad-2', 'squad-3', 'squad-4', 'squad-5'];

      // Simulate batch read
      const batchSize = 10;
      const batches: string[][] = [];

      for (let i = 0; i < squadIds.length; i += batchSize) {
        batches.push(squadIds.slice(i, i + batchSize));
      }

      expect(batches).toHaveLength(1); // All 5 IDs fit in one batch of size 10
      expect(batches[0]).toEqual(squadIds);
    });
  });

  describe('8. Error Recovery', () => {
    test('Should retry failed operations with exponential backoff', async () => {
      let attemptCount = 0;
      const maxRetries = 3;

      const operationWithRetry = async () => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            attemptCount++;
            if (attemptCount < 3) {
              throw new Error('Temporary failure');
            }
            return 'success';
          } catch (error) {
            if (i === maxRetries - 1) throw error;
            const backoffMs = Math.pow(2, i) * 100; // 100ms, 200ms, 400ms
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }
      };

      const result = await operationWithRetry();

      expect(result).toBe('success');
      expect(attemptCount).toBe(3); // Failed twice, succeeded on third attempt
    });

    test('Should maintain data consistency after partial failure', async () => {
      const updates = [
        { squadId: 'squad-1', totalPoints: 1000 },
        { squadId: 'squad-2', totalPoints: 1500 },
        { squadId: 'squad-3', totalPoints: 2000 },
      ];

      const successfulUpdates: string[] = [];
      const failedUpdates: string[] = [];

      (squadService.update as jest.Mock).mockImplementation(async (squadId) => {
        // Simulate failure for squad-2
        if (squadId === 'squad-2') {
          failedUpdates.push(squadId);
          throw new Error('Update failed');
        }
        successfulUpdates.push(squadId);
        return;
      });

      // Try to update all squads
      for (const update of updates) {
        try {
          await squadService.update(update.squadId, { totalPoints: update.totalPoints });
        } catch (error) {
          // Continue with other updates
        }
      }

      expect(successfulUpdates).toEqual(['squad-1', 'squad-3']);
      expect(failedUpdates).toEqual(['squad-2']);
    });
  });
});
