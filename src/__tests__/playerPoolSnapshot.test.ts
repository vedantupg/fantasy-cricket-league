// @ts-nocheck
/**
 * Unit Tests: playerPoolSnapshotService.create — changes / Top Gainers logic
 */

import { playerPoolSnapshotService, playerPoolService } from '../services/firestore';
import { addDoc } from 'firebase/firestore';

jest.mock('../services/firebase', () => ({
  db: {},
}));

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

const makePlayer = (playerId, name, points) => ({
  playerId,
  name,
  team: 'Team A',
  role: 'batsman',
  points,
});

describe('playerPoolSnapshotService.create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addDoc.mockResolvedValue({ id: 'new-snapshot-id' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('First snapshot (no prior snapshot)', () => {
    beforeEach(() => {
      jest.spyOn(playerPoolService, 'getById').mockResolvedValue({
        id: 'pool-1',
        name: 'Test Pool',
        version: '1.0',
        players: [makePlayer('p1', 'Alice', 50), makePlayer('p2', 'Bob', 30)],
        createdAt: new Date(),
        lastUpdated: new Date(),
        lastUpdateMessage: 'First update',
      });

      jest.spyOn(playerPoolSnapshotService, 'getLatest').mockResolvedValue(null);
    });

    test('changes is undefined — no Top Gainers on first snapshot', async () => {
      await playerPoolSnapshotService.create('pool-1');

      expect(addDoc).toHaveBeenCalledTimes(1);
      const savedData = addDoc.mock.calls[0][1];
      expect(savedData.changes).toBeUndefined();
    });

    test('players array is still populated on first snapshot', async () => {
      await playerPoolSnapshotService.create('pool-1');

      const savedData = addDoc.mock.calls[0][1];
      expect(savedData.players).toHaveLength(2);
      expect(savedData.players[0].playerId).toBe('p1');
    });
  });

  describe('Subsequent snapshot (prior snapshot exists)', () => {
    beforeEach(() => {
      jest.spyOn(playerPoolService, 'getById').mockResolvedValue({
        id: 'pool-1',
        name: 'Test Pool',
        version: '1.0',
        players: [
          makePlayer('p1', 'Alice', 60),   // gained 10
          makePlayer('p2', 'Bob', 30),     // unchanged
          makePlayer('p3', 'Charlie', 20), // new player
        ],
        createdAt: new Date(),
        lastUpdated: new Date(),
        lastUpdateMessage: 'Second update',
      });

      jest.spyOn(playerPoolSnapshotService, 'getLatest').mockResolvedValue({
        id: 'prev-snapshot',
        playerPoolId: 'pool-1',
        snapshotDate: new Date(),
        players: [makePlayer('p1', 'Alice', 50), makePlayer('p2', 'Bob', 30)],
      });
    });

    test('changes contains only players whose points changed', async () => {
      await playerPoolSnapshotService.create('pool-1');

      const savedData = addDoc.mock.calls[0][1];
      expect(savedData.changes).toBeDefined();

      const changedIds = savedData.changes.map((c) => c.playerId);
      expect(changedIds).toContain('p1'); // gained 10
      expect(changedIds).toContain('p3'); // new player
      expect(changedIds).not.toContain('p2'); // unchanged
    });

    test('changes are sorted by delta descending', async () => {
      await playerPoolSnapshotService.create('pool-1');

      const savedData = addDoc.mock.calls[0][1];
      const deltas = savedData.changes.map((c) => c.delta);
      expect(deltas).toEqual([...deltas].sort((a, b) => b - a));
    });

    test('delta values are correctly calculated', async () => {
      await playerPoolSnapshotService.create('pool-1');

      const savedData = addDoc.mock.calls[0][1];
      const alice = savedData.changes.find((c) => c.playerId === 'p1');
      expect(alice.previousPoints).toBe(50);
      expect(alice.newPoints).toBe(60);
      expect(alice.delta).toBe(10);
    });

    test('new player in pool gets delta equal to their current points', async () => {
      await playerPoolSnapshotService.create('pool-1');

      const savedData = addDoc.mock.calls[0][1];
      const charlie = savedData.changes.find((c) => c.playerId === 'p3');
      expect(charlie.previousPoints).toBe(0);
      expect(charlie.newPoints).toBe(20);
      expect(charlie.delta).toBe(20);
    });
  });

  describe('Subsequent snapshot — negative deltas', () => {
    test('includes players whose points decreased', async () => {
      jest.spyOn(playerPoolService, 'getById').mockResolvedValue({
        id: 'pool-1',
        name: 'Test Pool',
        version: '1.0',
        players: [makePlayer('p1', 'Alice', 40)],
        createdAt: new Date(),
        lastUpdated: new Date(),
        lastUpdateMessage: 'Update',
      });

      jest.spyOn(playerPoolSnapshotService, 'getLatest').mockResolvedValue({
        id: 'prev-snapshot',
        playerPoolId: 'pool-1',
        snapshotDate: new Date(),
        players: [makePlayer('p1', 'Alice', 50)],
      });

      await playerPoolSnapshotService.create('pool-1');

      const savedData = addDoc.mock.calls[0][1];
      expect(savedData.changes).toHaveLength(1);
      expect(savedData.changes[0].delta).toBe(-10);
    });
  });
});
