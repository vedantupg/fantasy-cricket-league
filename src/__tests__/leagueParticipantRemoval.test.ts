// @ts-nocheck
import { leagueService, squadService, leaderboardSnapshotService } from '../services/firestore';

const mockUpdateDoc = jest.fn();
const mockDoc = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn();
const mockWriteBatch = jest.fn();

jest.mock('../services/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => mockDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  writeBatch: (...args: any[]) => mockWriteBatch(...args),
  collection: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  Timestamp: class {},
}));

describe('leagueService.removeParticipantsFromLeague', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockWriteBatch.mockReturnValue({
      delete: mockBatchDelete,
      commit: mockBatchCommit,
    });
    mockBatchCommit.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);

    mockDoc.mockImplementation((_db: any, collectionName: string, id: string) => ({
      path: `${collectionName}/${id}`,
    }));

    jest.spyOn(leagueService, 'getById').mockResolvedValue({
      id: 'league-1',
      participants: ['u1', 'u2', 'u3'],
      squadsSubmitted: ['u1', 'u2'],
      creatorId: 'creator-1',
      adminIds: ['creator-1'],
      squadSize: 11,
    } as any);

    jest.spyOn(squadService, 'getByLeague').mockResolvedValue([
      { id: 'squad-1', userId: 'u2', leagueId: 'league-1' },
      { id: 'squad-2', userId: 'u5', leagueId: 'league-1' },
      { id: 'squad-3', userId: 'u3', leagueId: 'league-1' },
    ] as any);

    jest.spyOn(leaderboardSnapshotService, 'create').mockResolvedValue('snapshot-1');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('removes selected contestants, deletes their squads, and refreshes snapshot', async () => {
    const result = await leagueService.removeParticipantsFromLeague('league-1', ['u2', 'u3']);

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: 'leagues/league-1' },
      {
        participants: ['u1'],
        squadsSubmitted: ['u1'],
      }
    );

    expect(mockBatchDelete).toHaveBeenCalledTimes(2);
    expect(mockBatchDelete).toHaveBeenNthCalledWith(1, { path: 'squads/squad-1' });
    expect(mockBatchDelete).toHaveBeenNthCalledWith(2, { path: 'squads/squad-3' });
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    expect(leaderboardSnapshotService.create).toHaveBeenCalledWith('league-1');

    expect(result).toEqual({
      removedParticipants: 2,
      deletedSquads: 2,
    });
  });

  test('returns zeroes when no contestant ids are passed', async () => {
    const result = await leagueService.removeParticipantsFromLeague('league-1', []);

    expect(result).toEqual({ removedParticipants: 0, deletedSquads: 0 });
    expect(leagueService.getById).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(leaderboardSnapshotService.create).not.toHaveBeenCalled();
  });

  test('throws when league does not exist', async () => {
    (leagueService.getById as jest.Mock).mockResolvedValueOnce(null);

    await expect(
      leagueService.removeParticipantsFromLeague('league-missing', ['u1'])
    ).rejects.toThrow('League not found');

    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  test('still updates league and creates snapshot when removed contestants have no squads', async () => {
    (squadService.getByLeague as jest.Mock).mockResolvedValueOnce([
      { id: 'squad-9', userId: 'u99', leagueId: 'league-1' },
    ]);

    const result = await leagueService.removeParticipantsFromLeague('league-1', ['u2']);

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockBatchDelete).not.toHaveBeenCalled();
    expect(mockBatchCommit).not.toHaveBeenCalled();
    expect(leaderboardSnapshotService.create).toHaveBeenCalledWith('league-1');
    expect(result).toEqual({
      removedParticipants: 1,
      deletedSquads: 0,
    });
  });

  test('deduplicates repeated contestant ids before applying removal', async () => {
    const result = await leagueService.removeParticipantsFromLeague('league-1', ['u2', 'u2', 'u3']);

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: 'leagues/league-1' },
      {
        participants: ['u1'],
        squadsSubmitted: ['u1'],
      }
    );

    // Should only delete each affected squad once.
    expect(mockBatchDelete).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      removedParticipants: 2,
      deletedSquads: 2,
    });
  });

  test('keeps participant lists unchanged when user ids are not in league participants', async () => {
    const result = await leagueService.removeParticipantsFromLeague('league-1', ['u9']);

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: 'leagues/league-1' },
      {
        participants: ['u1', 'u2', 'u3'],
        squadsSubmitted: ['u1', 'u2'],
      }
    );

    // No squad belongs to u9 in base fixture.
    expect(mockBatchDelete).not.toHaveBeenCalled();
    expect(leaderboardSnapshotService.create).toHaveBeenCalledWith('league-1');
    expect(result).toEqual({
      removedParticipants: 0,
      deletedSquads: 0,
    });
  });

  test('deletes squads for selected ids even if those ids are not in participants array', async () => {
    // u5 is not in participants fixture but has a squad in this league fixture.
    const result = await leagueService.removeParticipantsFromLeague('league-1', ['u5']);

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: 'leagues/league-1' },
      {
        participants: ['u1', 'u2', 'u3'],
        squadsSubmitted: ['u1', 'u2'],
      }
    );

    expect(mockBatchDelete).toHaveBeenCalledTimes(1);
    expect(mockBatchDelete).toHaveBeenCalledWith({ path: 'squads/squad-2' });
    expect(result).toEqual({
      removedParticipants: 0,
      deletedSquads: 1,
    });
  });
});

