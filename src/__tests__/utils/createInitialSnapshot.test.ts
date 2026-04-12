// @ts-nocheck
/**
 * Unit Tests: createInitialSnapshot utilities
 */

import { playerPoolService, playerPoolSnapshotService } from '../../services/firestore';
import {
  createInitialSnapshotForPool,
  createInitialSnapshotsForAllPools,
} from '../../utils/createInitialSnapshot';

jest.mock('../../services/firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  writeBatch: jest.fn(),
  Timestamp: class {},
}));

describe('createInitialSnapshotForPool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws if pool not found (getById returns null)', async () => {
    jest.spyOn(playerPoolService, 'getById').mockResolvedValue(null);

    await expect(createInitialSnapshotForPool('missing-pool')).rejects.toThrow(
      'Player pool missing-pool not found'
    );
  });

  it('calls snapshotService.create with correct poolId and message', async () => {
    jest.spyOn(playerPoolService, 'getById').mockResolvedValue({ id: 'pool-1', name: 'Test Pool' });
    jest.spyOn(playerPoolSnapshotService, 'create').mockResolvedValue('snap-123');

    await createInitialSnapshotForPool('pool-1', 'Custom Message');

    expect(playerPoolSnapshotService.create).toHaveBeenCalledWith('pool-1', 'Custom Message');
  });

  it('returns snapshotId on success', async () => {
    jest.spyOn(playerPoolService, 'getById').mockResolvedValue({ id: 'pool-1', name: 'Test Pool' });
    jest.spyOn(playerPoolSnapshotService, 'create').mockResolvedValue('snap-abc');

    const result = await createInitialSnapshotForPool('pool-1', 'msg');

    expect(result).toBe('snap-abc');
  });

  it('uses default message "Initial Baseline Snapshot" when no message provided', async () => {
    jest.spyOn(playerPoolService, 'getById').mockResolvedValue({ id: 'pool-1', name: 'Test Pool' });
    jest.spyOn(playerPoolSnapshotService, 'create').mockResolvedValue('snap-default');

    await createInitialSnapshotForPool('pool-1');

    expect(playerPoolSnapshotService.create).toHaveBeenCalledWith(
      'pool-1',
      'Initial Baseline Snapshot'
    );
  });
});

describe('createInitialSnapshotsForAllPools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls createInitialSnapshotForPool for each pool', async () => {
    const pools = [
      { id: 'pool-1', name: 'Pool One' },
      { id: 'pool-2', name: 'Pool Two' },
    ];
    jest.spyOn(playerPoolService, 'getAll').mockResolvedValue(pools);
    jest.spyOn(playerPoolService, 'getById').mockImplementation(async (id) =>
      pools.find((p) => p.id === id) ?? null
    );
    jest.spyOn(playerPoolSnapshotService, 'create').mockResolvedValue('snap-x');

    await createInitialSnapshotsForAllPools();

    expect(playerPoolSnapshotService.create).toHaveBeenCalledTimes(2);
    expect(playerPoolSnapshotService.create).toHaveBeenCalledWith(
      'pool-1',
      'Initial Baseline - Pool One'
    );
    expect(playerPoolSnapshotService.create).toHaveBeenCalledWith(
      'pool-2',
      'Initial Baseline - Pool Two'
    );
  });

  it('propagates errors from createInitialSnapshotForPool', async () => {
    jest.spyOn(playerPoolService, 'getAll').mockResolvedValue([{ id: 'pool-bad', name: 'Bad Pool' }]);
    jest.spyOn(playerPoolService, 'getById').mockResolvedValue(null);

    await expect(createInitialSnapshotsForAllPools()).rejects.toThrow(
      'Player pool pool-bad not found'
    );
  });
});
