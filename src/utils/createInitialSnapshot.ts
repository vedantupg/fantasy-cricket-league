/**
 * One-time utility to create an initial baseline snapshot for existing player pools
 * Run this from the browser console after importing
 */

import { playerPoolSnapshotService, playerPoolService } from '../services/firestore';

export async function createInitialSnapshotForPool(poolId: string, message: string = 'Initial Baseline Snapshot') {
  try {
    console.log(`Creating initial snapshot for pool: ${poolId}`);

    // Verify the pool exists
    const pool = await playerPoolService.getById(poolId);
    if (!pool) {
      throw new Error(`Player pool ${poolId} not found`);
    }

    // Create the initial snapshot
    const snapshotId = await playerPoolSnapshotService.create(poolId, message);

    console.log(`✅ Initial snapshot created successfully with ID: ${snapshotId}`);
    return snapshotId;
  } catch (error) {
    console.error('Error creating initial snapshot:', error);
    throw error;
  }
}

export async function createInitialSnapshotsForAllPools() {
  try {
    console.log('Creating initial snapshots for all player pools...');

    const pools = await playerPoolService.getAll();
    console.log(`Found ${pools.length} player pools`);

    for (const pool of pools) {
      console.log(`Creating snapshot for: ${pool.name}`);
      await createInitialSnapshotForPool(pool.id, `Initial Baseline - ${pool.name}`);
    }

    console.log(`✅ Created initial snapshots for ${pools.length} player pools`);
  } catch (error) {
    console.error('Error creating initial snapshots:', error);
    throw error;
  }
}
