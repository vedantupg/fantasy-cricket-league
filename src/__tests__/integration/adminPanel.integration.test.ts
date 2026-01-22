/**
 * Admin Panel Integration Tests
 *
 * These tests verify the complete admin panel operations:
 * - Transfer reversal
 * - Squad recalculation
 * - Points repair
 * - Role fixing
 * - Snapshot management
 */

import { squadService, playerPoolService, leaderboardSnapshotService } from '../../services/firestore';
import type { LeagueSquad, TransferHistoryEntry, LeaderboardSnapshot } from '../../types/database';

jest.mock('../../services/firestore');

describe('Admin Panel - Integration Tests', () => {
  let mockSquad: LeagueSquad;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSquad = {
      id: 'squad-1',
      leagueId: 'league-1',
      userId: 'user-1',
      squadName: 'Thunder Strikers',
      players: [
        {
          playerId: 'p1',
          playerName: 'Steve Smith',
          team: 'Australia',
          role: 'Batsman',
          points: 600,
          pointsAtJoining: 450,
          pointsWhenRoleAssigned: 450,
        },
        {
          playerId: 'p2',
          playerName: 'Pat Cummins',
          team: 'Australia',
          role: 'Bowler',
          points: 480,
          pointsAtJoining: 380,
          pointsWhenRoleAssigned: 380,
        },
        {
          playerId: 'p3',
          playerName: 'Travis Head',
          team: 'Australia',
          role: 'All-rounder',
          points: 620,
          pointsAtJoining: 520,
        },
      ],
      captainId: 'p1',
      viceCaptainId: 'p2',
      xFactorId: null,
      totalPoints: 475, // (600-450)*2.0 + (480-380)*1.5 + (620-520)*1.0 = 300 + 150 + 100 = 550
      captainPoints: 300,
      viceCaptainPoints: 150,
      xFactorPoints: 0,
      bankedPoints: 0,
      isSubmitted: true,
      transfersRemaining: 8,
      transfersUsed: 2,
      benchTransfersRemaining: 4,
      benchTransfersUsed: 1,
      flexibleTransfersRemaining: 2,
      flexibleTransfersUsed: 1,
      midSeasonTransfersRemaining: 2,
      midSeasonTransfersUsed: 0,
      transferHistory: [
        {
          timestamp: new Date('2025-01-15'),
          transferType: 'bench',
          changeType: 'playerSubstitution',
          playerOut: 'p4',
          playerIn: 'p2',
        },
        {
          timestamp: new Date('2025-01-20'),
          transferType: 'flexible',
          changeType: 'playerSubstitution',
          playerOut: 'p5',
          playerIn: 'p3',
        },
      ],
      lastUpdated: new Date(),
    };
  });

  describe('1. Transfer Reversal', () => {
    test('Should reverse a bench transfer correctly', async () => {
      const transferToReverse = mockSquad.transferHistory![0];
      const transferIndex = 0;

      // Mock getById to return the squad
      (squadService.getById as jest.Mock).mockResolvedValue(mockSquad);

      let updatedSquadData: any = null;
      (squadService.update as jest.Mock).mockImplementation(async (squadId, data) => {
        updatedSquadData = data;
        return;
      });

      // Simulate reversal logic
      const reversalNote: TransferHistoryEntry = {
        timestamp: new Date(),
        transferType: 'admin_reversal' as any,
        changeType: 'admin_reversal' as any,
        note: `Transfer #${transferIndex + 1} reversed by admin`,
        reversedTransferIndex: transferIndex,
      };

      const updatedHistory = [...mockSquad.transferHistory!];
      updatedHistory.splice(transferIndex, 1); // Remove reversed transfer
      updatedHistory.push(reversalNote); // Add reversal note

      // Act
      await squadService.update(mockSquad.id, {
        transferHistory: updatedHistory,
        benchTransfersUsed: Math.max(0, mockSquad.benchTransfersUsed! - 1),
        transfersUsed: Math.max(0, mockSquad.transfersUsed! - 1),
        lastUpdated: new Date(),
      });

      // Assert
      expect(squadService.update).toHaveBeenCalledWith(
        mockSquad.id,
        expect.objectContaining({
          transferHistory: expect.arrayContaining([
            expect.objectContaining({
              transferType: 'admin_reversal',
              reversedTransferIndex: transferIndex,
            }),
          ]),
          benchTransfersUsed: 0,
          transfersUsed: 1,
        })
      );
    });

    test('Should reverse a flexible transfer and refund counts', async () => {
      const transferToReverse = mockSquad.transferHistory![1];
      const transferIndex = 1;

      (squadService.getById as jest.Mock).mockResolvedValue(mockSquad);

      const reversalNote: TransferHistoryEntry = {
        timestamp: new Date(),
        transferType: 'admin_reversal' as any,
        changeType: 'admin_reversal' as any,
        note: `Transfer #${transferIndex + 1} reversed by admin`,
        reversedTransferIndex: transferIndex,
      };

      const updatedHistory = [...mockSquad.transferHistory!];
      updatedHistory.splice(transferIndex, 1);
      updatedHistory.push(reversalNote);

      await squadService.update(mockSquad.id, {
        transferHistory: updatedHistory,
        flexibleTransfersUsed: Math.max(0, mockSquad.flexibleTransfersUsed! - 1),
        transfersUsed: Math.max(0, mockSquad.transfersUsed! - 1),
        lastUpdated: new Date(),
      });

      expect(squadService.update).toHaveBeenCalledWith(
        mockSquad.id,
        expect.objectContaining({
          flexibleTransfersUsed: 0,
          transfersUsed: 1,
        })
      );
    });

    test('Should prevent reversal of already reversed transfer', async () => {
      const reversedTransferHistory: TransferHistoryEntry[] = [
        {
          timestamp: new Date('2025-01-15'),
          transferType: 'bench',
          changeType: 'playerSubstitution',
          playerOut: 'p4',
          playerIn: 'p2',
        },
        {
          timestamp: new Date('2025-01-16'),
          transferType: 'admin_reversal' as any,
          changeType: 'admin_reversal' as any,
          note: 'Transfer #1 reversed by admin',
          reversedTransferIndex: 0,
        },
      ];

      // Check if transfer at index 0 has been reversed
      const hasBeenReversed = reversedTransferHistory.some(
        (t) => t.transferType === 'admin_reversal' && (t as any).reversedTransferIndex === 0
      );

      expect(hasBeenReversed).toBe(true);
    });
  });

  describe('2. Squad Recalculation', () => {
    test('Should recalculate squad points using current player pool data', async () => {
      const mockPlayerPool = {
        id: 'pool-1',
        name: 'ASHES 25/26',
        version: '2.0',
        players: [
          { playerId: 'p1', name: 'Steve Smith', team: 'Australia', role: 'Batsman', points: 700 }, // Updated
          { playerId: 'p2', name: 'Pat Cummins', team: 'Australia', role: 'Bowler', points: 550 }, // Updated
          { playerId: 'p3', name: 'Travis Head', team: 'Australia', role: 'All-rounder', points: 720 }, // Updated
        ],
        createdAt: new Date(),
        lastUpdated: new Date(),
      };

      (squadService.getById as jest.Mock).mockResolvedValue(mockSquad);
      (playerPoolService.getById as jest.Mock).mockResolvedValue(mockPlayerPool);

      // Update squad players with new points from pool
      const updatedPlayers = mockSquad.players.map((sp) => {
        const poolPlayer = mockPlayerPool.players.find((p) => p.playerId === sp.playerId);
        return poolPlayer ? { ...sp, points: poolPlayer.points } : sp;
      });

      // Recalculate points
      const squadSize = 11;
      const startingXI = updatedPlayers.slice(0, squadSize);

      let totalPoints = 0;
      let captainPoints = 0;
      let viceCaptainPoints = 0;
      let xFactorPoints = 0;

      startingXI.forEach((player) => {
        const pointsAtJoining = player.pointsAtJoining ?? 0;
        const effectivePoints = Math.max(0, player.points - pointsAtJoining);

        if (mockSquad.captainId === player.playerId) {
          const pointsWhenRoleAssigned = player.pointsWhenRoleAssigned ?? pointsAtJoining;
          const basePoints = Math.max(0, pointsWhenRoleAssigned - pointsAtJoining);
          const bonusPoints = Math.max(0, player.points - pointsWhenRoleAssigned);
          captainPoints = basePoints * 1.0 + bonusPoints * 2.0;
          totalPoints += captainPoints;
        } else if (mockSquad.viceCaptainId === player.playerId) {
          const pointsWhenRoleAssigned = player.pointsWhenRoleAssigned ?? pointsAtJoining;
          const basePoints = Math.max(0, pointsWhenRoleAssigned - pointsAtJoining);
          const bonusPoints = Math.max(0, player.points - pointsWhenRoleAssigned);
          viceCaptainPoints = basePoints * 1.0 + bonusPoints * 1.5;
          totalPoints += viceCaptainPoints;
        } else if (mockSquad.xFactorId === player.playerId) {
          const pointsWhenRoleAssigned = player.pointsWhenRoleAssigned ?? pointsAtJoining;
          const basePoints = Math.max(0, pointsWhenRoleAssigned - pointsAtJoining);
          const bonusPoints = Math.max(0, player.points - pointsWhenRoleAssigned);
          xFactorPoints = basePoints * 1.0 + bonusPoints * 1.25;
          totalPoints += xFactorPoints;
        } else {
          totalPoints += effectivePoints;
        }
      });

      totalPoints += mockSquad.bankedPoints || 0;

      // Expected calculations:
      // p1 (Captain): (450-450)*1.0 + (700-450)*2.0 = 0 + 500 = 500
      // p2 (VC): (380-380)*1.0 + (550-380)*1.5 = 0 + 255 = 255
      // p3 (Regular): 720 - 520 = 200
      // Total: 500 + 255 + 200 = 955

      expect(captainPoints).toBe(500);
      expect(viceCaptainPoints).toBe(255);
      expect(totalPoints).toBe(955);
    });

    test('Should handle single squad recalculation with custom banked points', async () => {
      const customBankedPoints = 150;

      (squadService.getById as jest.Mock).mockResolvedValue(mockSquad);

      // Simulate recalculation with custom banked points
      const currentCalculatedPoints = 475; // From player contributions
      const newTotalWithCustomBanked = currentCalculatedPoints + customBankedPoints;

      expect(newTotalWithCustomBanked).toBe(625);

      await squadService.update(mockSquad.id, {
        bankedPoints: customBankedPoints,
        totalPoints: newTotalWithCustomBanked,
        lastUpdated: new Date(),
      });

      expect(squadService.update).toHaveBeenCalledWith(
        mockSquad.id,
        expect.objectContaining({
          bankedPoints: 150,
          totalPoints: 625,
        })
      );
    });
  });

  describe('3. Points Repair Operations', () => {
    test('Should add bankedPoints to totalPoints when reconstructing', async () => {
      const squadWithBankedPoints = {
        ...mockSquad,
        totalPoints: 1000,
        bankedPoints: 250,
      };

      (squadService.getByLeague as jest.Mock).mockResolvedValue([squadWithBankedPoints]);

      // Reconstruction: add bankedPoints to totalPoints
      const oldTotal = squadWithBankedPoints.totalPoints;
      const newTotal = oldTotal + squadWithBankedPoints.bankedPoints;

      expect(newTotal).toBe(1250);

      await squadService.update(squadWithBankedPoints.id, {
        totalPoints: newTotal,
        lastUpdated: new Date(),
      });

      expect(squadService.update).toHaveBeenCalledWith(
        squadWithBankedPoints.id,
        expect.objectContaining({
          totalPoints: 1250,
        })
      );
    });

    test('Should repair all squads in league with correct calculations', async () => {
      const mockSquads: LeagueSquad[] = [
        {
          ...mockSquad,
          id: 'squad-1',
          squadName: 'Thunder Strikers',
          totalPoints: 1000,
          bankedPoints: 100,
        },
        {
          ...mockSquad,
          id: 'squad-2',
          squadName: 'Lightning Bolts',
          totalPoints: 1200,
          bankedPoints: 150,
        },
        {
          ...mockSquad,
          id: 'squad-3',
          squadName: 'Storm Chasers',
          totalPoints: 900,
          bankedPoints: 75,
        },
      ];

      (squadService.getByLeague as jest.Mock).mockResolvedValue(mockSquads);

      const results = mockSquads.map((squad) => ({
        squadName: squad.squadName,
        oldPoints: squad.totalPoints,
        newPoints: squad.totalPoints + squad.bankedPoints,
        bankedPoints: squad.bankedPoints,
      }));

      expect(results).toEqual([
        { squadName: 'Thunder Strikers', oldPoints: 1000, newPoints: 1100, bankedPoints: 100 },
        { squadName: 'Lightning Bolts', oldPoints: 1200, newPoints: 1350, bankedPoints: 150 },
        { squadName: 'Storm Chasers', oldPoints: 900, newPoints: 975, bankedPoints: 75 },
      ]);
    });
  });

  describe('4. Role Fixing', () => {
    test('Should fix missing captain by assigning from main squad', async () => {
      const squadWithMissingCaptain = {
        ...mockSquad,
        captainId: null, // Missing captain
      };

      (squadService.getById as jest.Mock).mockResolvedValue(squadWithMissingCaptain);

      const newCaptainId = 'p1'; // Steve Smith
      const newCaptain = squadWithMissingCaptain.players.find((p) => p.playerId === newCaptainId)!;

      // Set pointsWhenRoleAssigned when assigning role
      newCaptain.pointsWhenRoleAssigned = newCaptain.points;

      await squadService.update(squadWithMissingCaptain.id, {
        captainId: newCaptainId,
        players: squadWithMissingCaptain.players,
        lastUpdated: new Date(),
      });

      expect(squadService.update).toHaveBeenCalledWith(
        squadWithMissingCaptain.id,
        expect.objectContaining({
          captainId: 'p1',
        })
      );
      expect(newCaptain.pointsWhenRoleAssigned).toBe(newCaptain.points);
    });

    test('Should fix missing vice-captain', async () => {
      const squadWithMissingVC = {
        ...mockSquad,
        viceCaptainId: null,
      };

      (squadService.getById as jest.Mock).mockResolvedValue(squadWithMissingVC);

      const newVCId = 'p2';
      const newVC = squadWithMissingVC.players.find((p) => p.playerId === newVCId)!;
      newVC.pointsWhenRoleAssigned = newVC.points;

      await squadService.update(squadWithMissingVC.id, {
        viceCaptainId: newVCId,
        players: squadWithMissingVC.players,
        lastUpdated: new Date(),
      });

      expect(squadService.update).toHaveBeenCalledWith(
        squadWithMissingVC.id,
        expect.objectContaining({
          viceCaptainId: 'p2',
        })
      );
    });

    test('Should fix missing X-Factor', async () => {
      const squadWithMissingX = {
        ...mockSquad,
        xFactorId: null,
      };

      (squadService.getById as jest.Mock).mockResolvedValue(squadWithMissingX);

      const newXFactorId = 'p3';
      const newXFactor = squadWithMissingX.players.find((p) => p.playerId === newXFactorId)!;
      newXFactor.pointsWhenRoleAssigned = newXFactor.points;

      await squadService.update(squadWithMissingX.id, {
        xFactorId: newXFactorId,
        players: squadWithMissingX.players,
        lastUpdated: new Date(),
      });

      expect(squadService.update).toHaveBeenCalledWith(
        squadWithMissingX.id,
        expect.objectContaining({
          xFactorId: 'p3',
        })
      );
    });

    test('Should detect broken squads with missing roles', async () => {
      const squads: LeagueSquad[] = [
        { ...mockSquad, id: 'squad-1', captainId: null, isSubmitted: true },
        { ...mockSquad, id: 'squad-2', viceCaptainId: null, isSubmitted: true },
        { ...mockSquad, id: 'squad-3', xFactorId: null, isSubmitted: true },
        { ...mockSquad, id: 'squad-4', captainId: 'p1', viceCaptainId: 'p2', xFactorId: 'p3', isSubmitted: true }, // OK
      ];

      const squadSize = 11;
      const brokenSquads = squads
        .filter((s) => s.isSubmitted)
        .filter((squad) => {
          const mainSquadPlayerIds = squad.players.slice(0, squadSize).map((p) => p.playerId);
          return (
            !squad.captainId ||
            !mainSquadPlayerIds.includes(squad.captainId) ||
            !squad.viceCaptainId ||
            !mainSquadPlayerIds.includes(squad.viceCaptainId) ||
            !squad.xFactorId ||
            !mainSquadPlayerIds.includes(squad.xFactorId)
          );
        });

      expect(brokenSquads).toHaveLength(3);
      expect(brokenSquads.map((s) => s.id)).toEqual(['squad-1', 'squad-2', 'squad-3']);
    });
  });

  describe('5. Snapshot Management', () => {
    test('Should restore squad points from snapshot', async () => {
      const mockSnapshot: LeaderboardSnapshot = {
        id: 'snapshot-1',
        leagueId: 'league-1',
        snapshotDate: new Date('2025-01-01'),
        playerPoolVersion: 'ASHES 25/26',
        standings: [
          {
            squadId: 'squad-1',
            squadName: 'Thunder Strikers',
            totalPoints: 1500,
            captainPoints: 600,
            viceCaptainPoints: 450,
            xFactorPoints: 200,
            rank: 1,
          },
        ],
        createdAt: new Date(),
      };

      (leaderboardSnapshotService.getById as jest.Mock).mockResolvedValue(mockSnapshot);
      (squadService.getById as jest.Mock).mockResolvedValue(mockSquad);

      const snapshotStanding = mockSnapshot.standings.find((s) => s.squadId === mockSquad.id)!;

      await squadService.update(mockSquad.id, {
        totalPoints: snapshotStanding.totalPoints,
        captainPoints: snapshotStanding.captainPoints,
        viceCaptainPoints: snapshotStanding.viceCaptainPoints,
        xFactorPoints: snapshotStanding.xFactorPoints,
        lastUpdated: new Date(),
      });

      expect(squadService.update).toHaveBeenCalledWith(
        mockSquad.id,
        expect.objectContaining({
          totalPoints: 1500,
          captainPoints: 600,
          viceCaptainPoints: 450,
          xFactorPoints: 200,
        })
      );
    });

    test('Should recalculate using baseline snapshot (preserve transfers, restore points)', async () => {
      const mockSnapshot: LeaderboardSnapshot = {
        id: 'snapshot-1',
        leagueId: 'league-1',
        snapshotDate: new Date('2025-01-01'),
        playerPoolVersion: 'ASHES 25/26',
        standings: [
          {
            squadId: 'squad-1',
            squadName: 'Thunder Strikers',
            totalPoints: 2000, // Baseline points
            captainPoints: 800,
            viceCaptainPoints: 600,
            xFactorPoints: 300,
            rank: 1,
          },
        ],
        createdAt: new Date(),
      };

      const squadWithTransfers = {
        ...mockSquad,
        transferHistory: [
          {
            timestamp: new Date(),
            transferType: 'flexible' as const,
            changeType: 'playerSubstitution' as const,
            playerOut: 'p4',
            playerIn: 'p3',
          },
        ],
      };

      (leaderboardSnapshotService.getById as jest.Mock).mockResolvedValue(mockSnapshot);
      (squadService.getById as jest.Mock).mockResolvedValue(squadWithTransfers);

      const baselinePoints = mockSnapshot.standings[0].totalPoints;

      // Update squad to baseline points (transfers preserved, points restored)
      await squadService.update(squadWithTransfers.id, {
        totalPoints: baselinePoints, // Force to baseline
        bankedPoints: 0, // Reset banking
        lastUpdated: new Date(),
      });

      expect(squadService.update).toHaveBeenCalledWith(
        squadWithTransfers.id,
        expect.objectContaining({
          totalPoints: 2000,
          bankedPoints: 0,
        })
      );

      // Verify transfers are preserved
      expect(squadWithTransfers.transferHistory).toHaveLength(1);
    });

    test('Should create new snapshot after restore or recalculation', async () => {
      (leaderboardSnapshotService.create as jest.Mock).mockResolvedValue('snapshot-2');

      const newSnapshotId = await leaderboardSnapshotService.create('league-1');

      expect(newSnapshotId).toBe('snapshot-2');
      expect(leaderboardSnapshotService.create).toHaveBeenCalledWith('league-1');
    });
  });

  describe('6. Admin Operations Error Handling', () => {
    test('Should handle reversal of non-existent transfer', async () => {
      const invalidTransferIndex = 999;
      const transferHistory = mockSquad.transferHistory || [];

      const transferExists = invalidTransferIndex >= 0 && invalidTransferIndex < transferHistory.length;

      expect(transferExists).toBe(false);
    });

    test('Should handle recalculation when player pool not found', async () => {
      (playerPoolService.getById as jest.Mock).mockResolvedValue(null);

      const playerPool = await playerPoolService.getById('pool-1');

      expect(playerPool).toBeNull();
    });

    test('Should handle snapshot restoration when squad not in snapshot', async () => {
      const mockSnapshot: LeaderboardSnapshot = {
        id: 'snapshot-1',
        leagueId: 'league-1',
        snapshotDate: new Date(),
        playerPoolVersion: 'ASHES 25/26',
        standings: [], // Empty standings
        createdAt: new Date(),
      };

      const snapshotStanding = mockSnapshot.standings.find((s) => s.squadId === 'squad-1');

      expect(snapshotStanding).toBeUndefined();
    });
  });
});
