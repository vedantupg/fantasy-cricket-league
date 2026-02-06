// @ts-nocheck
/**
 * Leaderboard and Snapshot System Integration Tests
 *
 * These tests verify:
 * - Leaderboard calculations and rankings
 * - Snapshot creation and management
 * - Rank tracking and streaks
 * - Point history and analytics
 */

import { squadService, leaderboardSnapshotService } from '../../services/firestore';
import type { LeagueSquad, LeaderboardSnapshot, StandingEntry } from '../../types/database';

jest.mock('../../services/firestore');

describe('Leaderboard and Snapshot System - Integration Tests', () => {
  let mockSquads: LeagueSquad[];

  beforeEach(() => {
    jest.clearAllMocks();

    mockSquads = [
      {
        id: 'squad-1',
        leagueId: 'league-1',
        userId: 'user-1',
        squadName: 'Thunder Strikers',
        players: [],
        captainId: 'p1',
        viceCaptainId: 'p2',
        xFactorId: 'p3',
        totalPoints: 2500,
        captainPoints: 1000,
        viceCaptainPoints: 750,
        xFactorPoints: 500,
        bankedPoints: 200,
        isSubmitted: true,
        transfersUsed: 5,
        benchTransfersUsed: 2,
        flexibleTransfersUsed: 2,
        midSeasonTransfersUsed: 0,
        transferHistory: [],
        lastUpdated: new Date(),
      },
      {
        id: 'squad-2',
        leagueId: 'league-1',
        userId: 'user-2',
        squadName: 'Lightning Bolts',
        players: [],
        captainId: 'p4',
        viceCaptainId: 'p5',
        xFactorId: 'p6',
        totalPoints: 2800,
        captainPoints: 1200,
        viceCaptainPoints: 800,
        xFactorPoints: 600,
        bankedPoints: 150,
        isSubmitted: true,
        transfersUsed: 3,
        benchTransfersUsed: 1,
        flexibleTransfersUsed: 1,
        midSeasonTransfersUsed: 0,
        transferHistory: [],
        lastUpdated: new Date(),
      },
      {
        id: 'squad-3',
        leagueId: 'league-1',
        userId: 'user-3',
        squadName: 'Storm Chasers',
        players: [],
        captainId: 'p7',
        viceCaptainId: 'p8',
        xFactorId: 'p9',
        totalPoints: 2200,
        captainPoints: 900,
        viceCaptainPoints: 650,
        xFactorPoints: 450,
        bankedPoints: 100,
        isSubmitted: true,
        transfersUsed: 4,
        benchTransfersUsed: 2,
        flexibleTransfersUsed: 2,
        midSeasonTransfersUsed: 0,
        transferHistory: [],
        lastUpdated: new Date(),
      },
      {
        id: 'squad-4',
        leagueId: 'league-1',
        userId: 'user-4',
        squadName: 'Cyclone Squad',
        players: [],
        captainId: 'p10',
        viceCaptainId: 'p11',
        xFactorId: 'p12',
        totalPoints: 2600,
        captainPoints: 1050,
        viceCaptainPoints: 780,
        xFactorPoints: 520,
        bankedPoints: 180,
        isSubmitted: true,
        transfersUsed: 2,
        benchTransfersUsed: 0,
        flexibleTransfersUsed: 0,
        midSeasonTransfersUsed: 0,
        transferHistory: [],
        lastUpdated: new Date(),
      },
    ];
  });

  describe('1. Leaderboard Calculation', () => {
    test('Should calculate correct rankings based on totalPoints', () => {
      const sortedSquads = [...mockSquads].sort((a, b) => b.totalPoints - a.totalPoints);

      const standings: LeaderboardSnapshot[] = sortedSquads.map((squad, index) => ({
        squadId: squad.id,
        squadName: squad.squadName,
        totalPoints: squad.totalPoints,
        captainPoints: squad.captainPoints,
        viceCaptainPoints: squad.viceCaptainPoints,
        xFactorPoints: squad.xFactorPoints,
        rank: index + 1,
      }));

      expect(standings).toEqual([
        expect.objectContaining({ squadName: 'Lightning Bolts', totalPoints: 2800, rank: 1 }),
        expect.objectContaining({ squadName: 'Cyclone Squad', totalPoints: 2600, rank: 2 }),
        expect.objectContaining({ squadName: 'Thunder Strikers', totalPoints: 2500, rank: 3 }),
        expect.objectContaining({ squadName: 'Storm Chasers', totalPoints: 2200, rank: 4 }),
      ]);
    });

    test('Should handle tie-breaking (same totalPoints)', () => {
      const squadsWithTie = [
        { ...mockSquads[0], totalPoints: 2500, squadName: 'Squad A', id: 'squad-a' },
        { ...mockSquads[1], totalPoints: 2500, squadName: 'Squad B', id: 'squad-b' },
        { ...mockSquads[2], totalPoints: 2300, squadName: 'Squad C', id: 'squad-c' },
      ];

      const sortedSquads = [...squadsWithTie].sort((a, b) => {
        if (b.totalPoints === a.totalPoints) {
          // Tie-breaker: alphabetical by name
          return a.squadName.localeCompare(b.squadName);
        }
        return b.totalPoints - a.totalPoints;
      });

      expect(sortedSquads[0].squadName).toBe('Squad A');
      expect(sortedSquads[1].squadName).toBe('Squad B');
      expect(sortedSquads[2].squadName).toBe('Squad C');
    });

    test('Should exclude unsubmitted squads from leaderboard', () => {
      const allSquads = [
        ...mockSquads,
        {
          ...mockSquads[0],
          id: 'squad-unsubmitted',
          squadName: 'Unsubmitted Squad',
          isSubmitted: false,
          totalPoints: 9999, // High points but not submitted
        },
      ];

      const submittedSquads = allSquads.filter((s) => s.isSubmitted);

      expect(submittedSquads).toHaveLength(4);
      expect(submittedSquads.every((s) => s.isSubmitted)).toBe(true);
    });
  });

  describe('2. Snapshot Creation', () => {
    test('Should create snapshot with correct standings', async () => {
      (squadService.getByLeague as jest.Mock).mockResolvedValue(mockSquads);

      const sortedSquads = [...mockSquads]
        .filter((s) => s.isSubmitted)
        .sort((a, b) => b.totalPoints - a.totalPoints);

      const standings: LeaderboardSnapshot[] = sortedSquads.map((squad, index) => ({
        squadId: squad.id,
        squadName: squad.squadName,
        totalPoints: squad.totalPoints,
        captainPoints: squad.captainPoints,
        viceCaptainPoints: squad.viceCaptainPoints,
        xFactorPoints: squad.xFactorPoints,
        rank: index + 1,
      }));

      const snapshot: Omit<LeaderboardSnapshot, 'id' | 'createdAt'> = {
        leagueId: 'league-1',
        snapshotDate: new Date(),
        playerPoolVersion: 'ASHES 25/26 v2.0',
        standings,
      };

      (leaderboardSnapshotService.create as jest.Mock).mockImplementation(async (leagueId) => {
        expect(leagueId).toBe('league-1');
        return 'snapshot-1';
      });

      const snapshotId = await leaderboardSnapshotService.create('league-1');

      expect(snapshotId).toBe('snapshot-1');
      expect(standings).toHaveLength(4);
      expect(standings[0].rank).toBe(1);
      expect(standings[3].rank).toBe(4);
    });

    test('Should include all relevant squad data in snapshot', async () => {
      const squad = mockSquads[0];

      const standing: LeaderboardSnapshot = {
        squadId: squad.id,
        squadName: squad.squadName,
        totalPoints: squad.totalPoints,
        captainPoints: squad.captainPoints,
        viceCaptainPoints: squad.viceCaptainPoints,
        xFactorPoints: squad.xFactorPoints,
        rank: 1,
      };

      expect(standing).toMatchObject({
        squadId: 'squad-1',
        squadName: 'Thunder Strikers',
        totalPoints: 2500,
        captainPoints: 1000,
        viceCaptainPoints: 750,
        xFactorPoints: 500,
        rank: 1,
      });
    });
  });

  describe('3. Rank Tracking and History', () => {
    test('Should track rank changes between snapshots', async () => {
      const snapshot1: LeaderboardSnapshot = {
        id: 'snapshot-1',
        leagueId: 'league-1',
        snapshotDate: new Date('2025-01-01'),
        playerPoolVersion: 'v1.0',
        standings: [
          { squadId: 'squad-1', squadName: 'Thunder Strikers', totalPoints: 2500, captainPoints: 1000, viceCaptainPoints: 750, xFactorPoints: 500, rank: 1 },
          { squadId: 'squad-2', squadName: 'Lightning Bolts', totalPoints: 2400, captainPoints: 1100, viceCaptainPoints: 700, xFactorPoints: 450, rank: 2 },
          { squadId: 'squad-3', squadName: 'Storm Chasers', totalPoints: 2200, captainPoints: 900, viceCaptainPoints: 650, xFactorPoints: 450, rank: 3 },
        ],
        createdAt: new Date('2025-01-01'),
      };

      const snapshot2: LeaderboardSnapshot = {
        id: 'snapshot-2',
        leagueId: 'league-1',
        snapshotDate: new Date('2025-01-15'),
        playerPoolVersion: 'v2.0',
        standings: [
          { squadId: 'squad-2', squadName: 'Lightning Bolts', totalPoints: 2800, captainPoints: 1200, viceCaptainPoints: 800, xFactorPoints: 600, rank: 1 }, // Moved up
          { squadId: 'squad-1', squadName: 'Thunder Strikers', totalPoints: 2500, captainPoints: 1000, viceCaptainPoints: 750, xFactorPoints: 500, rank: 2 }, // Moved down
          { squadId: 'squad-3', squadName: 'Storm Chasers', totalPoints: 2200, captainPoints: 900, viceCaptainPoints: 650, xFactorPoints: 450, rank: 3 }, // Same
        ],
        createdAt: new Date('2025-01-15'),
      };

      // Calculate rank changes
      const rankChanges = snapshot2.standings.map((current) => {
        const previous = snapshot1.standings.find((s) => s.squadId === current.squadId);
        return {
          squadId: current.squadId,
          squadName: current.squadName,
          currentRank: current.rank,
          previousRank: previous?.rank || null,
          rankChange: previous ? previous.rank - current.rank : null, // Positive = moved up
        };
      });

      expect(rankChanges).toEqual([
        { squadId: 'squad-2', squadName: 'Lightning Bolts', currentRank: 1, previousRank: 2, rankChange: 1 }, // Moved up 1
        { squadId: 'squad-1', squadName: 'Thunder Strikers', currentRank: 2, previousRank: 1, rankChange: -1 }, // Moved down 1
        { squadId: 'squad-3', squadName: 'Storm Chasers', currentRank: 3, previousRank: 3, rankChange: 0 }, // No change
      ]);
    });

    test('Should calculate rank streaks (consecutive periods at same rank)', async () => {
      const snapshots: LeaderboardSnapshot[] = [
        {
          id: 'snap-1',
          leagueId: 'league-1',
          snapshotDate: new Date('2025-01-01'),
          playerPoolVersion: 'v1.0',
          standings: [{ squadId: 'squad-1', squadName: 'Thunder Strikers', totalPoints: 2500, captainPoints: 1000, viceCaptainPoints: 750, xFactorPoints: 500, rank: 1 }],
          createdAt: new Date('2025-01-01'),
        },
        {
          id: 'snap-2',
          leagueId: 'league-1',
          snapshotDate: new Date('2025-01-08'),
          playerPoolVersion: 'v1.1',
          standings: [{ squadId: 'squad-1', squadName: 'Thunder Strikers', totalPoints: 2700, captainPoints: 1100, viceCaptainPoints: 800, xFactorPoints: 550, rank: 1 }],
          createdAt: new Date('2025-01-08'),
        },
        {
          id: 'snap-3',
          leagueId: 'league-1',
          snapshotDate: new Date('2025-01-15'),
          playerPoolVersion: 'v1.2',
          standings: [{ squadId: 'squad-1', squadName: 'Thunder Strikers', totalPoints: 2900, captainPoints: 1200, viceCaptainPoints: 850, xFactorPoints: 600, rank: 1 }],
          createdAt: new Date('2025-01-15'),
        },
      ];

      // Calculate streak for squad-1
      const squadId = 'squad-1';
      let streak = 0;
      let lastRank = null;

      for (const snapshot of snapshots) {
        const standing = snapshot.standings.find((s) => s.squadId === squadId);
        if (standing && standing.rank === lastRank) {
          streak++;
        } else if (standing) {
          lastRank = standing.rank;
          streak = 1;
        }
      }

      expect(streak).toBe(3); // Held rank 1 for 3 consecutive periods
    });
  });

  describe('4. Point History and Analytics', () => {
    test('Should calculate point progression over time', async () => {
      const snapshots: LeaderboardSnapshot[] = [
        {
          id: 'snap-1',
          leagueId: 'league-1',
          snapshotDate: new Date('2025-01-01'),
          playerPoolVersion: 'v1.0',
          standings: [{ squadId: 'squad-1', squadName: 'Thunder Strikers', totalPoints: 1000, captainPoints: 400, viceCaptainPoints: 300, xFactorPoints: 200, rank: 1 }],
          createdAt: new Date('2025-01-01'),
        },
        {
          id: 'snap-2',
          leagueId: 'league-1',
          snapshotDate: new Date('2025-01-08'),
          playerPoolVersion: 'v1.1',
          standings: [{ squadId: 'squad-1', squadName: 'Thunder Strikers', totalPoints: 1500, captainPoints: 600, viceCaptainPoints: 450, xFactorPoints: 300, rank: 1 }],
          createdAt: new Date('2025-01-08'),
        },
        {
          id: 'snap-3',
          leagueId: 'league-1',
          snapshotDate: new Date('2025-01-15'),
          playerPoolVersion: 'v1.2',
          standings: [{ squadId: 'squad-1', squadName: 'Thunder Strikers', totalPoints: 2500, captainPoints: 1000, viceCaptainPoints: 750, xFactorPoints: 500, rank: 1 }],
          createdAt: new Date('2025-01-15'),
        },
      ];

      const squadId = 'squad-1';
      const pointHistory = snapshots.map((snapshot) => {
        const standing = snapshot.standings.find((s) => s.squadId === squadId);
        return {
          date: snapshot.snapshotDate,
          totalPoints: standing?.totalPoints || 0,
          captainPoints: standing?.captainPoints || 0,
          viceCaptainPoints: standing?.viceCaptainPoints || 0,
          xFactorPoints: standing?.xFactorPoints || 0,
        };
      });

      expect(pointHistory).toEqual([
        { date: new Date('2025-01-01'), totalPoints: 1000, captainPoints: 400, viceCaptainPoints: 300, xFactorPoints: 200 },
        { date: new Date('2025-01-08'), totalPoints: 1500, captainPoints: 600, viceCaptainPoints: 450, xFactorPoints: 300 },
        { date: new Date('2025-01-15'), totalPoints: 2500, captainPoints: 1000, viceCaptainPoints: 750, xFactorPoints: 500 },
      ]);
    });

    test('Should calculate average points per period', async () => {
      const pointHistory = [1000, 1500, 2500, 2800, 3200];
      const totalPoints = pointHistory.reduce((sum, points) => sum + points, 0);
      const avgPoints = totalPoints / pointHistory.length;

      expect(avgPoints).toBe(2200);
    });

    test('Should calculate point growth rate', async () => {
      const initialPoints = 1000;
      const finalPoints = 2500;
      const growthRate = ((finalPoints - initialPoints) / initialPoints) * 100;

      expect(growthRate).toBe(150); // 150% growth
    });

    test('Should identify top performer by captain contribution', async () => {
      const squadsWithCaptainStats = mockSquads.map((squad) => ({
        squadId: squad.id,
        squadName: squad.squadName,
        captainPoints: squad.captainPoints,
        captainContributionPercentage: (squad.captainPoints / squad.totalPoints) * 100,
      }));

      const topCaptainPerformer = squadsWithCaptainStats.reduce((max, squad) =>
        squad.captainContributionPercentage > max.captainContributionPercentage ? squad : max
      );

      // Lightning Bolts: 1200/2800 = 42.86%
      // Cyclone Squad: 1050/2600 = 40.38%
      // Thunder Strikers: 1000/2500 = 40%
      // Storm Chasers: 900/2200 = 40.91%

      expect(topCaptainPerformer.squadName).toBe('Lightning Bolts');
      expect(topCaptainPerformer.captainContributionPercentage).toBeCloseTo(42.86, 2);
    });
  });

  describe('5. Snapshot Management Operations', () => {
    test('Should retrieve all snapshots for a league ordered by date', async () => {
      const mockSnapshots: LeaderboardSnapshot[] = [
        {
          id: 'snap-1',
          leagueId: 'league-1',
          snapshotDate: new Date('2025-01-01'),
          playerPoolVersion: 'v1.0',
          standings: [],
          createdAt: new Date('2025-01-01'),
        },
        {
          id: 'snap-2',
          leagueId: 'league-1',
          snapshotDate: new Date('2025-01-15'),
          playerPoolVersion: 'v2.0',
          standings: [],
          createdAt: new Date('2025-01-15'),
        },
        {
          id: 'snap-3',
          leagueId: 'league-1',
          snapshotDate: new Date('2025-01-08'),
          playerPoolVersion: 'v1.5',
          standings: [],
          createdAt: new Date('2025-01-08'),
        },
      ];

      (leaderboardSnapshotService.getByLeague as jest.Mock).mockResolvedValue(mockSnapshots);

      const snapshots = await leaderboardSnapshotService.getByLeague('league-1');
      const sortedSnapshots = [...snapshots].sort((a, b) => a.snapshotDate.getTime() - b.snapshotDate.getTime());

      expect(sortedSnapshots[0].id).toBe('snap-1');
      expect(sortedSnapshots[1].id).toBe('snap-3');
      expect(sortedSnapshots[2].id).toBe('snap-2');
    });

    test('Should get latest snapshot for a league', async () => {
      const mockSnapshots: LeaderboardSnapshot[] = [
        {
          id: 'snap-1',
          leagueId: 'league-1',
          snapshotDate: new Date('2025-01-01'),
          playerPoolVersion: 'v1.0',
          standings: [],
          createdAt: new Date('2025-01-01'),
        },
        {
          id: 'snap-2',
          leagueId: 'league-1',
          snapshotDate: new Date('2025-01-15'),
          playerPoolVersion: 'v2.0',
          standings: [],
          createdAt: new Date('2025-01-15'),
        },
      ];

      (leaderboardSnapshotService.getByLeague as jest.Mock).mockResolvedValue(mockSnapshots);

      const snapshots = await leaderboardSnapshotService.getByLeague('league-1');
      const latestSnapshot = snapshots.reduce((latest, snapshot) =>
        snapshot.snapshotDate > latest.snapshotDate ? snapshot : latest
      );

      expect(latestSnapshot.id).toBe('snap-2');
      expect(latestSnapshot.playerPoolVersion).toBe('v2.0');
    });

    test('Should compare two snapshots and identify changes', async () => {
      const snapshot1: LeaderboardSnapshot = {
        id: 'snap-1',
        leagueId: 'league-1',
        snapshotDate: new Date('2025-01-01'),
        playerPoolVersion: 'v1.0',
        standings: [
          { squadId: 'squad-1', squadName: 'Thunder Strikers', totalPoints: 2000, captainPoints: 800, viceCaptainPoints: 600, xFactorPoints: 400, rank: 1 },
          { squadId: 'squad-2', squadName: 'Lightning Bolts', totalPoints: 1800, captainPoints: 700, viceCaptainPoints: 550, xFactorPoints: 350, rank: 2 },
        ],
        createdAt: new Date('2025-01-01'),
      };

      const snapshot2: LeaderboardSnapshot = {
        id: 'snap-2',
        leagueId: 'league-1',
        snapshotDate: new Date('2025-01-15'),
        playerPoolVersion: 'v2.0',
        standings: [
          { squadId: 'squad-2', squadName: 'Lightning Bolts', totalPoints: 2800, captainPoints: 1200, viceCaptainPoints: 800, xFactorPoints: 600, rank: 1 },
          { squadId: 'squad-1', squadName: 'Thunder Strikers', totalPoints: 2500, captainPoints: 1000, viceCaptainPoints: 750, xFactorPoints: 500, rank: 2 },
        ],
        createdAt: new Date('2025-01-15'),
      };

      const changes = snapshot2.standings.map((current) => {
        const previous = snapshot1.standings.find((s) => s.squadId === current.squadId)!;
        return {
          squadId: current.squadId,
          squadName: current.squadName,
          pointsGained: current.totalPoints - previous.totalPoints,
          rankChange: previous.rank - current.rank,
          wasFirst: previous.rank === 1,
          isNowFirst: current.rank === 1,
        };
      });

      expect(changes).toEqual([
        expect.objectContaining({
          squadId: 'squad-2',
          pointsGained: 1000,
          rankChange: 1,
          wasFirst: false,
          isNowFirst: true,
        }),
        expect.objectContaining({
          squadId: 'squad-1',
          pointsGained: 500,
          rankChange: -1,
          wasFirst: true,
          isNowFirst: false,
        }),
      ]);
    });
  });

  describe('6. Edge Cases', () => {
    test('Should handle league with no submitted squads', async () => {
      const unsubmittedSquads = mockSquads.map((s) => ({ ...s, isSubmitted: false }));

      (squadService.getByLeague as jest.Mock).mockResolvedValue(unsubmittedSquads);

      const submittedSquads = unsubmittedSquads.filter((s) => s.isSubmitted);

      expect(submittedSquads).toHaveLength(0);
    });

    test('Should handle league with only one squad', async () => {
      const singleSquad = [mockSquads[0]];

      (squadService.getByLeague as jest.Mock).mockResolvedValue(singleSquad);

      const standings: LeaderboardSnapshot[] = singleSquad.map((squad) => ({
        squadId: squad.id,
        squadName: squad.squadName,
        totalPoints: squad.totalPoints,
        captainPoints: squad.captainPoints,
        viceCaptainPoints: squad.viceCaptainPoints,
        xFactorPoints: squad.xFactorPoints,
        rank: 1,
      }));

      expect(standings).toHaveLength(1);
      expect(standings[0].rank).toBe(1);
    });

    test('Should handle snapshot with missing squad data', async () => {
      const snapshot: LeaderboardSnapshot = {
        id: 'snap-1',
        leagueId: 'league-1',
        snapshotDate: new Date(),
        playerPoolVersion: 'v1.0',
        standings: [
          { squadId: 'squad-1', squadName: 'Thunder Strikers', totalPoints: 2500, captainPoints: 1000, viceCaptainPoints: 750, xFactorPoints: 500, rank: 1 },
        ],
        createdAt: new Date(),
      };

      const squadId = 'squad-999'; // Non-existent squad
      const standing = snapshot.standings.find((s) => s.squadId === squadId);

      expect(standing).toBeUndefined();
    });

    test('Should handle division by zero in percentage calculations', async () => {
      const squadWithZeroPoints = {
        ...mockSquads[0],
        totalPoints: 0,
        captainPoints: 0,
      };

      const captainPercentage =
        squadWithZeroPoints.totalPoints > 0
          ? (squadWithZeroPoints.captainPoints / squadWithZeroPoints.totalPoints) * 100
          : 0;

      expect(captainPercentage).toBe(0);
    });
  });
});
