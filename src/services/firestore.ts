import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  League,
  LeagueSquad,
  SquadPlayer,
  Player,
  Transfer,
  Match,
  PlayerPool,
  PlayerPoolEntry,
  PlayerPoolSnapshot,
  LeaderboardSnapshot,
  StandingEntry,
  User,
} from '../types/database';
import { calculateSquadPoints } from '../utils/pointsCalculation';

// Collection References
const COLLECTIONS = {
  USERS: 'users',
  LEAGUES: 'leagues',
  SQUADS: 'squads',
  PLAYERS: 'players',
  PLAYER_POOLS: 'playerPools',
  PLAYER_POOL_SNAPSHOTS: 'playerPoolSnapshots',
  TRANSFERS: 'transfers',
  MATCHES: 'matches',
  PLAYER_PERFORMANCES: 'playerPerformances',
  POINTS_CONFIGS: 'pointsConfigs',
  LEADERBOARD_SNAPSHOTS: 'leaderboardSnapshots',
} as const;

// Utility function to convert Firestore Timestamp to Date
const convertTimestamps = (data: any): any => {
  if (data === null || typeof data !== 'object') return data;

  // Handle arrays separately to preserve array structure
  if (Array.isArray(data)) {
    return data.map(item => convertTimestamps(item));
  }

  const converted = { ...data };
  Object.keys(converted).forEach(key => {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate();
    } else if (typeof converted[key] === 'object') {
      converted[key] = convertTimestamps(converted[key]);
    }
  });

  return converted;
};

// League Operations
export const leagueService = {
  // Create a new league
  async create(league: Omit<League, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.LEAGUES), {
      ...league,
      createdAt: new Date(),
    });
    return docRef.id;
  },

  // Get league by ID
  async getById(leagueId: string): Promise<League | null> {
    const docRef = doc(db, COLLECTIONS.LEAGUES, leagueId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as League;
    }
    return null;
  },

  // Get leagues for a user
  async getForUser(userId: string): Promise<League[]> {
    const q = query(
      collection(db, COLLECTIONS.LEAGUES),
      where('participants', 'array-contains', userId)
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc =>
      convertTimestamps({ id: doc.id, ...doc.data() }) as League
    );
  },

  // Get all leagues (admin only)
  async getAll(): Promise<League[]> {
    const q = query(collection(db, COLLECTIONS.LEAGUES));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc =>
      convertTimestamps({ id: doc.id, ...doc.data() }) as League
    );
  },

  // Update league
  async update(leagueId: string, updates: Partial<League>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.LEAGUES, leagueId);
    await updateDoc(docRef, updates);
  },

  // Get league by code
  async getByCode(code: string): Promise<League | null> {
    const q = query(
      collection(db, COLLECTIONS.LEAGUES),
      where('code', '==', code.toUpperCase())
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return convertTimestamps({ id: doc.id, ...doc.data() }) as League;
    }
    return null;
  },

  // Join league
  async joinLeague(leagueId: string, userId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.LEAGUES, leagueId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const league = docSnap.data() as League;
      
      // Check if user is already a participant
      if (league.participants.includes(userId)) {
        throw new Error('You are already a member of this league');
      }
      
      // Check if league is full
      if (league.participants.length >= league.maxParticipants) {
        throw new Error('This league is full');
      }
      
      const updatedParticipants = [...league.participants, userId];
      
      await updateDoc(docRef, {
        participants: updatedParticipants,
      });
    } else {
      throw new Error('League not found');
    }
  },

  // Join league by code
  async joinLeagueByCode(code: string, userId: string): Promise<League> {
    const league = await this.getByCode(code);
    
    if (!league) {
      throw new Error('No leagues found for this code');
    }
    
    await this.joinLeague(league.id, userId);
    return league;
  },

  // Delete league (admin only)
  async delete(leagueId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.LEAGUES, leagueId);
    await deleteDoc(docRef);
  },

  // Real-time listener for league updates
  subscribeToLeague(leagueId: string, callback: (league: League | null) => void): () => void {
    const docRef = doc(db, COLLECTIONS.LEAGUES, leagueId);

    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback(convertTimestamps({ id: doc.id, ...doc.data() }) as League);
      } else {
        callback(null);
      }
    });
  },
};

// Squad Operations
export const squadService = {
  // Create squad for user in league
  async create(squad: Omit<LeagueSquad, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.SQUADS), {
      ...squad,
      createdAt: new Date(),
    });
    return docRef.id;
  },

  // Get squad by ID
  async getById(squadId: string): Promise<LeagueSquad | null> {
    const docRef = doc(db, COLLECTIONS.SQUADS, squadId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as LeagueSquad;
    }
    return null;
  },

  // Get squad by user and league
  async getByUserAndLeague(userId: string, leagueId: string): Promise<LeagueSquad | null> {
    const q = query(
      collection(db, COLLECTIONS.SQUADS),
      where('userId', '==', userId),
      where('leagueId', '==', leagueId)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return convertTimestamps({ id: doc.id, ...doc.data() }) as LeagueSquad;
    }
    return null;
  },

  // Get all squads in a league
  async getByLeague(leagueId: string): Promise<LeagueSquad[]> {
    const q = query(
      collection(db, COLLECTIONS.SQUADS),
      where('leagueId', '==', leagueId),
      orderBy('totalPoints', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => 
      convertTimestamps({ id: doc.id, ...doc.data() }) as LeagueSquad
    );
  },

  // Update squad
  async update(squadId: string, updates: Partial<LeagueSquad>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.SQUADS, squadId);
    await updateDoc(docRef, updates);
  },

  // Submit squad (lock for tournament)
  async submit(squadId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.SQUADS, squadId);
    await updateDoc(docRef, {
      isSubmitted: true,
      submittedAt: new Date(),
    });
  },
};

// Player Operations
export const playerService = {
  // Get all active players
  async getActive(): Promise<Player[]> {
    const q = query(
      collection(db, COLLECTIONS.PLAYERS),
      where('isActive', '==', true),
      orderBy('name')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => 
      convertTimestamps({ id: doc.id, ...doc.data() }) as Player
    );
  },

  // Get players by team
  async getByTeam(team: string): Promise<Player[]> {
    const q = query(
      collection(db, COLLECTIONS.PLAYERS),
      where('team', '==', team),
      where('isActive', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => 
      convertTimestamps({ id: doc.id, ...doc.data() }) as Player
    );
  },

  // Get player by ID
  async getById(playerId: string): Promise<Player | null> {
    const docRef = doc(db, COLLECTIONS.PLAYERS, playerId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as Player;
    }
    return null;
  },

  // Add new player (admin only)
  async create(player: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.PLAYERS), {
      ...player,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  },

  // Update player
  async update(playerId: string, updates: Partial<Player>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PLAYERS, playerId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date(),
    });
  },
};

// Transfer Operations
export const transferService = {
  // Create transfer request
  async create(transfer: Omit<Transfer, 'id' | 'requestedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.TRANSFERS), {
      ...transfer,
      requestedAt: new Date(),
    });
    return docRef.id;
  },

  // Get transfers for a league
  async getByLeague(leagueId: string): Promise<Transfer[]> {
    const q = query(
      collection(db, COLLECTIONS.TRANSFERS),
      where('leagueId', '==', leagueId)
      // Note: Removed orderBy to avoid needing a composite index
      // Sorting is done in-memory instead
    );
    const querySnapshot = await getDocs(q);

    const transfers = querySnapshot.docs.map(doc =>
      convertTimestamps({ id: doc.id, ...doc.data() }) as Transfer
    );

    // Sort in memory by requestedAt descending (newest first)
    return transfers.sort((a, b) =>
      new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
  },

  // Get pending transfers for admin approval
  async getPending(leagueId: string): Promise<Transfer[]> {
    const q = query(
      collection(db, COLLECTIONS.TRANSFERS),
      where('leagueId', '==', leagueId),
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => 
      convertTimestamps({ id: doc.id, ...doc.data() }) as Transfer
    );
  },

  // Approve/Reject transfer
  async updateStatus(
    transferId: string, 
    status: 'approved' | 'rejected', 
    adminId: string,
    rejectionReason?: string
  ): Promise<void> {
    const docRef = doc(db, COLLECTIONS.TRANSFERS, transferId);
    await updateDoc(docRef, {
      status,
      processedAt: new Date(),
      processedBy: adminId,
      ...(rejectionReason && { rejectionReason }),
    });
  },
};

// Match Operations
export const matchService = {
  // Get upcoming matches
  async getUpcoming(): Promise<Match[]> {
    const q = query(
      collection(db, COLLECTIONS.MATCHES),
      where('status', '==', 'upcoming'),
      orderBy('startTime', 'asc'),
      limit(10)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => 
      convertTimestamps({ id: doc.id, ...doc.data() }) as Match
    );
  },

  // Get matches for a league
  async getByLeague(leagueId: string): Promise<Match[]> {
    const q = query(
      collection(db, COLLECTIONS.MATCHES),
      where('leagueIds', 'array-contains', leagueId),
      orderBy('startTime', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => 
      convertTimestamps({ id: doc.id, ...doc.data() }) as Match
    );
  },
};

// Player Pool Operations
export const playerPoolService = {
  // Create a new player pool
  async create(pool: Omit<PlayerPool, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.PLAYER_POOLS), {
      ...pool,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  },

  // Get all active player pools
  async getAll(): Promise<PlayerPool[]> {
    const q = query(
      collection(db, COLLECTIONS.PLAYER_POOLS),
      where('isActive', '==', true)
    );
    const querySnapshot = await getDocs(q);

    // Sort by createdAt in memory to avoid needing a composite index
    const pools = querySnapshot.docs.map(doc =>
      convertTimestamps({ id: doc.id, ...doc.data() }) as PlayerPool
    );

    return pools.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  // Get player pool by ID
  async getById(poolId: string): Promise<PlayerPool | null> {
    const docRef = doc(db, COLLECTIONS.PLAYER_POOLS, poolId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as PlayerPool;
    }
    return null;
  },

  // Get player pools created by a user
  async getByCreator(userId: string): Promise<PlayerPool[]> {
    const q = query(
      collection(db, COLLECTIONS.PLAYER_POOLS),
      where('creatorId', '==', userId)
    );
    const querySnapshot = await getDocs(q);

    // Sort by createdAt in memory to avoid needing a composite index
    const pools = querySnapshot.docs.map(doc =>
      convertTimestamps({ id: doc.id, ...doc.data() }) as PlayerPool
    );

    return pools.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  // Update player pool
  async update(poolId: string, updates: Partial<PlayerPool>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PLAYER_POOLS, poolId);

    // Ensure players is always an array if it's being updated
    const updateData: any = {
      ...updates,
      updatedAt: new Date(),
    };

    if (updates.players !== undefined) {
      // Force players to be an array
      updateData.players = Array.isArray(updates.players)
        ? updates.players
        : (updates.players ? Object.values(updates.players) : []);
    }

    await updateDoc(docRef, updateData);
  },

  // Add player to pool
  async addPlayer(poolId: string, player: PlayerPoolEntry): Promise<void> {
    const poolDoc = await this.getById(poolId);
    if (!poolDoc) {
      throw new Error('Player pool not found');
    }

    const updatedPlayers = [...poolDoc.players, player];
    await this.update(poolId, { players: updatedPlayers });
  },

  // Update player in pool
  async updatePlayer(poolId: string, playerId: string, updates: Partial<PlayerPoolEntry>): Promise<void> {
    const poolDoc = await this.getById(poolId);
    if (!poolDoc) {
      throw new Error('Player pool not found');
    }

    const updatedPlayers = poolDoc.players.map(p =>
      p.playerId === playerId ? { ...p, ...updates, lastUpdated: new Date() } : p
    );
    await this.update(poolId, { players: updatedPlayers });

    // DISABLED: Automatic recalculation can corrupt points due to bad pointsWhenRoleAssigned data
    // Admin must manually recalculate after fixing role timestamps
    // if (updates.points !== undefined) {
    //   await this.recalculateLeaguesUsingPool(poolId);
    // }
    if (updates.points !== undefined) {
      console.warn('⚠️ AUTOMATIC RECALCULATION DISABLED - Manually recalculate from Admin Panel after fixing role timestamps');
    }
  },

  // Remove player from pool
  async removePlayer(poolId: string, playerId: string): Promise<void> {
    const poolDoc = await this.getById(poolId);
    if (!poolDoc) {
      throw new Error('Player pool not found');
    }

    const updatedPlayers = poolDoc.players.filter(p => p.playerId !== playerId);
    await this.update(poolId, { players: updatedPlayers });
  },

  // Update multiple player points at once
  async updatePlayerPoints(
    poolId: string,
    pointsUpdates: { playerId: string; points: number }[],
    updateMessage?: string,
    updatedBy?: string
  ): Promise<void> {
    const poolDoc = await this.getById(poolId);
    if (!poolDoc) {
      throw new Error('Player pool not found');
    }

    const updatedPlayers = poolDoc.players.map(player => {
      const update = pointsUpdates.find(u => u.playerId === player.playerId);
      if (update) {
        return {
          ...player,
          points: update.points,
          lastUpdated: new Date(),
        };
      }
      return player;
    });

    // Update the player pool with new points and optional update message
    const updateData: any = { players: updatedPlayers };
    if (updateMessage) {
      updateData.lastUpdateMessage = updateMessage;
    }

    await this.update(poolId, updateData);

    // Create a snapshot of the player pool with point changes
    try {
      await playerPoolSnapshotService.create(poolId, updateMessage, updatedBy);
      console.log('✅ Player pool snapshot created successfully');
    } catch (error) {
      console.error('Error creating player pool snapshot:', error);
      // Don't fail the update if snapshot creation fails
    }

    // DISABLED: Automatic recalculation can corrupt points due to bad pointsWhenRoleAssigned data
    // Admin must manually recalculate after fixing role timestamps
    // await this.recalculateLeaguesUsingPool(poolId);
    console.warn('⚠️ AUTOMATIC RECALCULATION DISABLED - Manually recalculate from Admin Panel after fixing role timestamps');
  },

  // Find all leagues using a specific player pool
  async getLeaguesUsingPool(poolId: string): Promise<League[]> {
    const q = query(
      collection(db, COLLECTIONS.LEAGUES),
      where('playerPoolId', '==', poolId)
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc =>
      convertTimestamps({ id: doc.id, ...doc.data() }) as League
    );
  },

  // Recalculate squad points and create snapshots for all leagues using this pool
  async recalculateLeaguesUsingPool(poolId: string): Promise<void> {
    console.log(`Recalculating leagues using player pool: ${poolId}`);

    // Get the updated player pool
    const playerPool = await this.getById(poolId);
    if (!playerPool) {
      throw new Error('Player pool not found');
    }

    // Find all leagues using this pool
    const leagues = await this.getLeaguesUsingPool(poolId);
    console.log(`Found ${leagues.length} leagues using this pool`);

    if (leagues.length === 0) {
      return;
    }

    // For each league, recalculate squad points using batch writes
    const updatePromises = leagues.map(async (league) => {
      try {
        console.log(`Updating squads for league ${league.id}`);

        // Get all squads in this league
        const squads = await squadService.getByLeague(league.id);
        console.log(`Found ${squads.length} squads to update`);

        if (squads.length === 0) {
          console.log(`No squads in league ${league.id}, skipping`);
          return;
        }

        // Use batch writes for efficiency
        // IMPORTANT: Always update ALL squads on every player pool save to ensure consistency
        const batch = writeBatch(db);

        for (const squad of squads) {
          // Update player points in the squad to match current pool
          const updatedPlayers = squad.players.map(squadPlayer => {
            const poolPlayer = playerPool.players.find(p => p.playerId === squadPlayer.playerId);

            if (poolPlayer) {
              return {
                ...squadPlayer,
                points: poolPlayer.points,
              };
            }
            return squadPlayer;
          });

          // FIXED: Use shared calculation utility for consistency
          // This ensures pool updates use the SAME formula as transfers
          const calculatedPoints = calculateSquadPoints(
            updatedPlayers,
            league.squadSize,
            squad.captainId,
            squad.viceCaptainId,
            squad.xFactorId,
            squad.bankedPoints || 0
          );

          const { totalPoints, captainPoints, viceCaptainPoints, xFactorPoints } = calculatedPoints;

          // Always update every squad on each player pool save
          const squadRef = doc(db, COLLECTIONS.SQUADS, squad.id);
          batch.update(squadRef, {
            players: updatedPlayers,
            totalPoints,
            captainPoints,
            viceCaptainPoints,
            xFactorPoints,
            lastUpdated: new Date(),
          });
        }

        // Commit all squad updates
        await batch.commit();
        console.log(`Updated ${squads.length} squads in league ${league.id}`);

        // Create a new leaderboard snapshot for this league
        console.log(`Creating snapshot for league: ${league.id}`);
        await leaderboardSnapshotService.create(league.id);
        console.log(`Leaderboard snapshot created for league ${league.id}`);
      } catch (error) {
        console.error(`Error recalculating league ${league.id}:`, error);
      }
    });

    await Promise.all(updatePromises);
    console.log('Recalculation complete for all leagues');
  },

  // Delete player pool (soft delete by setting isActive to false)
  async delete(poolId: string): Promise<void> {
    await this.update(poolId, { isActive: false });
  },

  // Real-time listener for player pool updates
  subscribeToPool(poolId: string, callback: (pool: PlayerPool | null) => void): () => void {
    const docRef = doc(db, COLLECTIONS.PLAYER_POOLS, poolId);

    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback(convertTimestamps({ id: doc.id, ...doc.data() }) as PlayerPool);
      } else {
        callback(null);
      }
    });
  },
};

// Player Pool Snapshot Operations
export const playerPoolSnapshotService = {
  // Create a new snapshot with deltas from previous snapshot
  async create(poolId: string, updateMessage?: string, updatedBy?: string): Promise<string> {
    try {
      console.log(`Creating player pool snapshot for pool: ${poolId}`);

      // Get the current player pool
      const playerPool = await playerPoolService.getById(poolId);
      if (!playerPool) {
        throw new Error('Player pool not found');
      }

      // Get the previous snapshot to calculate deltas
      const previousSnapshot = await this.getLatest(poolId);

      // Create the snapshot data
      const snapshotData: Omit<PlayerPoolSnapshot, 'id'> = {
        playerPoolId: poolId,
        snapshotDate: new Date(),
        updateMessage: updateMessage || playerPool.lastUpdateMessage,
        updatedBy,
        players: playerPool.players.map(p => ({
          playerId: p.playerId,
          name: p.name,
          team: p.team,
          role: p.role,
          points: p.points,
        })),
        changes: undefined,
      };

      // Calculate deltas if there's a previous snapshot
      if (previousSnapshot) {
        const changes: Array<{
          playerId: string;
          name: string;
          previousPoints: number;
          newPoints: number;
          delta: number;
        }> = [];

        playerPool.players.forEach(currentPlayer => {
          const previousPlayer = previousSnapshot.players.find(p => p.playerId === currentPlayer.playerId);

          if (previousPlayer) {
            const delta = currentPlayer.points - previousPlayer.points;

            // Only include players whose points changed
            if (delta !== 0) {
              changes.push({
                playerId: currentPlayer.playerId,
                name: currentPlayer.name,
                previousPoints: previousPlayer.points,
                newPoints: currentPlayer.points,
                delta,
              });
            }
          } else {
            // New player added to the pool
            changes.push({
              playerId: currentPlayer.playerId,
              name: currentPlayer.name,
              previousPoints: 0,
              newPoints: currentPlayer.points,
              delta: currentPlayer.points,
            });
          }
        });

        // Sort changes by delta (highest first)
        changes.sort((a, b) => b.delta - a.delta);
        snapshotData.changes = changes;
      }

      // Save the snapshot
      const docRef = await addDoc(collection(db, COLLECTIONS.PLAYER_POOL_SNAPSHOTS), {
        ...snapshotData,
        createdAt: new Date(),
      });

      console.log(`Player pool snapshot created with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error('Error creating player pool snapshot:', error);
      throw error;
    }
  },

  // Get all snapshots for a player pool
  async getByPoolId(poolId: string): Promise<PlayerPoolSnapshot[]> {
    const q = query(
      collection(db, COLLECTIONS.PLAYER_POOL_SNAPSHOTS),
      where('playerPoolId', '==', poolId),
      orderBy('snapshotDate', 'desc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc =>
      convertTimestamps({ id: doc.id, ...doc.data() }) as PlayerPoolSnapshot
    );
  },

  // Get the latest snapshot for a player pool
  async getLatest(poolId: string): Promise<PlayerPoolSnapshot | null> {
    const q = query(
      collection(db, COLLECTIONS.PLAYER_POOL_SNAPSHOTS),
      where('playerPoolId', '==', poolId),
      orderBy('snapshotDate', 'desc'),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    return convertTimestamps({
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data(),
    }) as PlayerPoolSnapshot;
  },

  // Get a specific snapshot by ID
  async getById(snapshotId: string): Promise<PlayerPoolSnapshot | null> {
    const docRef = doc(db, COLLECTIONS.PLAYER_POOL_SNAPSHOTS, snapshotId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as PlayerPoolSnapshot;
    }
    return null;
  },

  // Delete a snapshot
  async delete(snapshotId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PLAYER_POOL_SNAPSHOTS, snapshotId);
    await deleteDoc(docRef);
  },
};

// Leaderboard Snapshot Operations
export const leaderboardSnapshotService = {
  // Create a new leaderboard snapshot
  async create(leagueId: string): Promise<string> {
    try {
      console.log(`Creating leaderboard snapshot for league: ${leagueId}`);

      // Get league data to find player pool
      const league = await leagueService.getById(leagueId);

      // Get player pool version if league uses a player pool
      let playerPoolVersion: string | undefined;
      let pointsUpdatedAt: Date | undefined;
      if (league?.playerPoolId) {
        const playerPool = await playerPoolService.getById(league.playerPoolId);
        if (playerPool) {
          playerPoolVersion = playerPool.lastUpdateMessage;
          pointsUpdatedAt = playerPool.updatedAt;
        }
      }

      // Get all squads for this league
      const squads = await squadService.getByLeague(leagueId);
      console.log(`Found ${squads.length} squads in league`);

      if (squads.length === 0) {
        console.warn(`No squads found for league ${leagueId}. Creating empty snapshot.`);
      }

      // Get previous snapshot to calculate changes
      const previousSnapshot = await this.getLatest(leagueId);
      const previousStandings = previousSnapshot?.standings || [];
      console.log(`Previous snapshot had ${previousStandings.length} standings`);

      // Get user details for all squads
      const userPromises = squads.map(async (squad) => {
        try {
          const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, squad.userId));
          return userDoc.exists() ? convertTimestamps({ uid: userDoc.id, ...userDoc.data() }) as User : null;
        } catch (error) {
          console.error(`Error fetching user ${squad.userId}:`, error);
          return null;
        }
      });
      const users = await Promise.all(userPromises);
      console.log(`Fetched ${users.filter(u => u !== null).length} user documents`);

    // Build standings with rank changes and points gained
    // First, map squads to standings with calculated totalPoints (including predictionBonusPoints and powerplayPoints)
    const unsortedStandings: StandingEntry[] = squads.map((squad, index) => {
      const user = users[index];
      const previousEntry = previousStandings.find(s => s.userId === squad.userId);
      const previousRank = previousEntry?.rank;
      const previousPoints = previousEntry?.totalPoints || 0;
      const currentTotalPoints = (squad.totalPoints || 0) + (squad.predictionBonusPoints || 0) + (squad.powerplayPoints || 0);
      const pointsGainedToday = currentTotalPoints - previousPoints;

      // Get captain, vice-captain, and X-factor details
      const captain = squad.players.find(p => p.playerId === squad.captainId);
      const viceCaptain = squad.players.find(p => p.playerId === squad.viceCaptainId);
      const xFactor = squad.players.find(p => p.playerId === squad.xFactorId);

      // Build standing entry, only including defined fields (Firestore doesn't allow undefined)
      // IMPORTANT: Include predictionBonusPoints and powerplayPoints in totalPoints calculation
      const standing: any = {
        userId: squad.userId,
        squadId: squad.id,
        squadName: squad.squadName,
        displayName: user?.displayName || 'Unknown',
        totalPoints: currentTotalPoints,
        captainPoints: squad.captainPoints || 0,
        viceCaptainPoints: squad.viceCaptainPoints || 0,
        xFactorPoints: squad.xFactorPoints || 0,
        rank: 0, // Will be set after sorting
        rankChange: 0, // Will be calculated after sorting
        pointsGainedToday,
      };

      // Only add optional fields if they're defined
      if (user?.profilePicUrl) standing.profilePicUrl = user.profilePicUrl;
      if (previousRank !== undefined) standing.previousRank = previousRank;
      if (squad.captainId) standing.captainId = squad.captainId;
      if (captain?.playerName) standing.captainName = captain.playerName;
      if (squad.viceCaptainId) standing.viceCaptainId = squad.viceCaptainId;
      if (viceCaptain?.playerName) standing.viceCaptainName = viceCaptain.playerName;
      if (squad.xFactorId) standing.xFactorId = squad.xFactorId;
      if (xFactor?.playerName) standing.xFactorName = xFactor.playerName;
      if (squad.powerplayPoints !== undefined) standing.powerplayPoints = squad.powerplayPoints;
      if (squad.powerplayCompleted !== undefined) standing.powerplayCompleted = squad.powerplayCompleted;

      return standing as StandingEntry;
    });

    // Sort by totalPoints (descending) to get correct rankings
    const standings = unsortedStandings.sort((a, b) => b.totalPoints - a.totalPoints);

    // Now assign ranks and calculate rank changes and lead from next
    standings.forEach((standing, index) => {
      standing.rank = index + 1;
      standing.rankChange = standing.previousRank ? standing.previousRank - standing.rank : 0;

      // Calculate lead from next player
      if (index < standings.length - 1) {
        standing.leadFromNext = standing.totalPoints - standings[index + 1].totalPoints;
      }
    });

    // Find best performer (most points gained)
    let bestPerformer = undefined;
    if (standings.length > 0) {
      const topGainer = standings.reduce((max, current) =>
        current.pointsGainedToday > max.pointsGainedToday ? current : max
      );
      if (topGainer.pointsGainedToday > 0) {
        bestPerformer = {
          userId: topGainer.userId,
          squadName: topGainer.squadName,
          displayName: topGainer.displayName,
          pointsGained: topGainer.pointsGainedToday,
        } as any;
        // Only add profilePicUrl if defined
        if (topGainer.profilePicUrl) {
          bestPerformer.profilePicUrl = topGainer.profilePicUrl;
        }
      }
    }

    // Find rapid riser (most ranks gained)
    let rapidRiser = undefined;
    if (standings.length > 0) {
      const topClimber = standings
        .filter(s => s.rankChange && s.rankChange > 0)
        .reduce((max, current) =>
          (current.rankChange || 0) > (max.rankChange || 0) ? current : max
        , { rankChange: 0 } as StandingEntry);

      if (topClimber.rankChange && topClimber.rankChange > 0) {
        rapidRiser = {
          userId: topClimber.userId,
          squadName: topClimber.squadName,
          displayName: topClimber.displayName,
          ranksGained: topClimber.rankChange,
          previousRank: topClimber.previousRank || 0,
          currentRank: topClimber.rank,
        } as any;
        // Only add profilePicUrl if defined
        if (topClimber.profilePicUrl) {
          rapidRiser.profilePicUrl = topClimber.profilePicUrl;
        }
      }
    }

    // Create snapshot document
    // Only include bestPerformer and rapidRiser if they exist (Firestore doesn't allow undefined)
    const snapshot: Omit<LeaderboardSnapshot, 'id'> = {
      leagueId,
      snapshotDate: new Date(),
      standings,
      createdAt: new Date(),
      ...(bestPerformer && { bestPerformer }),
      ...(rapidRiser && { rapidRiser }),
      ...(playerPoolVersion && { playerPoolVersion }),
      ...(pointsUpdatedAt && { pointsUpdatedAt }),
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.LEADERBOARD_SNAPSHOTS), snapshot);

    // Update squad documents with rank changes
    const batch = writeBatch(db);
    standings.forEach((standing) => {
      const squadRef = doc(db, COLLECTIONS.SQUADS, standing.squadId);
      batch.update(squadRef, {
        rank: standing.rank,
        previousRank: standing.previousRank || standing.rank,
        rankChange: standing.rankChange || 0,
        pointsGainedToday: standing.pointsGainedToday,
        lastUpdated: new Date(),
      });
    });
    await batch.commit();

    console.log(`Successfully created leaderboard snapshot ${docRef.id} for league ${leagueId}`);
    return docRef.id;
    } catch (error) {
      console.error(`Error creating leaderboard snapshot for league ${leagueId}:`, error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  },

  // Get latest snapshot for a league
  async getLatest(leagueId: string): Promise<LeaderboardSnapshot | null> {
    try {
      console.log(`Fetching latest snapshot for league: ${leagueId}`);
      const q = query(
        collection(db, COLLECTIONS.LEADERBOARD_SNAPSHOTS),
        where('leagueId', '==', leagueId),
        orderBy('snapshotDate', 'desc'),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        console.log(`Found snapshot ${doc.id} for league ${leagueId}`);
        return convertTimestamps({ id: doc.id, ...doc.data() }) as LeaderboardSnapshot;
      }
      console.log(`No snapshots found for league ${leagueId}`);
      return null;
    } catch (error) {
      console.error(`Error fetching latest snapshot for league ${leagueId}:`, error);
      if (error instanceof Error && error.message.includes('index')) {
        console.error('This error may be due to missing Firestore indexes. Check the Firebase console for index creation links.');
      }
      throw error;
    }
  },

  // Get all snapshots for a league
  async getByLeague(leagueId: string): Promise<LeaderboardSnapshot[]> {
    const q = query(
      collection(db, COLLECTIONS.LEADERBOARD_SNAPSHOTS),
      where('leagueId', '==', leagueId),
      orderBy('snapshotDate', 'desc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc =>
      convertTimestamps({ id: doc.id, ...doc.data() }) as LeaderboardSnapshot
    );
  },

  // Get recent snapshots for a league (for streak calculation)
  async getRecent(leagueId: string, limitCount: number = 15): Promise<LeaderboardSnapshot[]> {
    const q = query(
      collection(db, COLLECTIONS.LEADERBOARD_SNAPSHOTS),
      where('leagueId', '==', leagueId),
      orderBy('snapshotDate', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc =>
      convertTimestamps({ id: doc.id, ...doc.data() }) as LeaderboardSnapshot
    );
  },

  // Get snapshot by ID
  async getById(snapshotId: string): Promise<LeaderboardSnapshot | null> {
    const docRef = doc(db, COLLECTIONS.LEADERBOARD_SNAPSHOTS, snapshotId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as LeaderboardSnapshot;
    }
    return null;
  },

  // Real-time listener for latest snapshot
  subscribeToLatest(leagueId: string, callback: (snapshot: LeaderboardSnapshot | null) => void): () => void {
    const q = query(
      collection(db, COLLECTIONS.LEADERBOARD_SNAPSHOTS),
      where('leagueId', '==', leagueId),
      orderBy('snapshotDate', 'desc'),
      limit(1)
    );

    return onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        callback(convertTimestamps({ id: doc.id, ...doc.data() }) as LeaderboardSnapshot);
      } else {
        callback(null);
      }
    });
  },
};

// Player Pool Update and Cascade Operations
export const playerPoolUpdateService = {
  // Update player points in a player pool
  async updatePlayerPoints(
    playerPoolId: string,
    playerUpdates: { playerId: string; points: number }[],
    updatedBy: string
  ): Promise<void> {
    try {
      console.log(`Updating ${playerUpdates.length} players in pool ${playerPoolId}`);

      // Get the player pool
      const poolDoc = await getDoc(doc(db, COLLECTIONS.PLAYER_POOLS, playerPoolId));
      if (!poolDoc.exists()) {
        throw new Error(`Player pool ${playerPoolId} not found`);
      }

      const pool = convertTimestamps({ id: poolDoc.id, ...poolDoc.data() }) as PlayerPool;

      // Update player points in the pool
      const updatedPlayers = pool.players.map(player => {
        const update = playerUpdates.find(u => u.playerId === player.playerId);
        if (update) {
          return {
            ...player,
            points: update.points,
            lastUpdated: new Date(),
            updatedBy,
          };
        }
        return player;
      });

      // Save updated pool
      await updateDoc(doc(db, COLLECTIONS.PLAYER_POOLS, playerPoolId), {
        players: updatedPlayers,
        updatedAt: new Date(),
      });

      console.log(`Player pool ${playerPoolId} updated successfully`);

      // Cascade updates to all leagues using this pool
      await this.cascadeUpdateToLeagues(playerPoolId, playerUpdates);
    } catch (error) {
      console.error('Error updating player points:', error);
      throw error;
    }
  },

  // Cascade player point updates to all leagues using this player pool
  async cascadeUpdateToLeagues(
    playerPoolId: string,
    playerUpdates: { playerId: string; points: number }[]
  ): Promise<void> {
    try {
      console.log(`Cascading updates to leagues using pool ${playerPoolId}`);

      // Find all leagues using this player pool
      const leaguesQuery = query(
        collection(db, COLLECTIONS.LEAGUES),
        where('playerPoolId', '==', playerPoolId)
      );
      const leaguesSnapshot = await getDocs(leaguesQuery);
      const leagues = leaguesSnapshot.docs.map(doc =>
        convertTimestamps({ id: doc.id, ...doc.data() }) as League
      );

      console.log(`Found ${leagues.length} leagues using this pool`);

      // Update squads and leaderboards for each league
      for (const league of leagues) {
        await this.updateLeagueSquadsAndLeaderboard(league.id, playerUpdates);
      }

      console.log('Cascade complete');
    } catch (error) {
      console.error('Error cascading updates to leagues:', error);
      throw error;
    }
  },

  // Update all squads in a league and refresh its leaderboard
  async updateLeagueSquadsAndLeaderboard(
    leagueId: string,
    playerUpdates: { playerId: string; points: number }[]
  ): Promise<void> {
    try {
      console.log(`Updating squads for league ${leagueId}`);

      // Get league to access squadSize
      const league = await leagueService.getById(leagueId);
      if (!league) {
        console.error(`League ${leagueId} not found`);
        return;
      }

      // Get all squads in the league
      const squads = await squadService.getByLeague(leagueId);
      console.log(`Found ${squads.length} squads to update`);

      if (squads.length === 0) {
        console.log(`No squads in league ${leagueId}, skipping`);
        return;
      }

      // Update each squad's player points and recalculate totals
      // IMPORTANT: Always update ALL squads on every player pool save to ensure consistency
      const batch = writeBatch(db);

      for (const squad of squads) {
        const { updatedPlayers, newTotalPoints, newCaptainPoints, newViceCaptainPoints, newXFactorPoints } =
          this.recalculateSquadPoints(squad, playerUpdates, league.squadSize);

        // Always update every squad on each player pool save
        const squadRef = doc(db, COLLECTIONS.SQUADS, squad.id);
        batch.update(squadRef, {
          players: updatedPlayers,
          totalPoints: newTotalPoints,
          captainPoints: newCaptainPoints,
          viceCaptainPoints: newViceCaptainPoints,
          xFactorPoints: newXFactorPoints,
          lastUpdated: new Date(),
        });
      }

      // Commit all squad updates
      await batch.commit();
      console.log(`Updated ${squads.length} squads in league ${leagueId}`);

      // Create a new leaderboard snapshot for this league
      console.log(`Creating new leaderboard snapshot for league ${leagueId}`);
      await leaderboardSnapshotService.create(leagueId);
      console.log(`Leaderboard snapshot created for league ${leagueId}`);
    } catch (error) {
      console.error(`Error updating league ${leagueId}:`, error);
      throw error;
    }
  },

  // Recalculate a squad's points based on player updates
  recalculateSquadPoints(
    squad: LeagueSquad,
    playerUpdates: { playerId: string; points: number }[],
    squadSize: number
  ): {
    updatedPlayers: LeagueSquad['players'];
    newTotalPoints: number;
    newCaptainPoints: number;
    newViceCaptainPoints: number;
    newXFactorPoints: number;
  } {
    // Update player points in the squad
    const updatedPlayers = squad.players.map(player => {
      const update = playerUpdates.find(u => u.playerId === player.playerId);

      if (update) {
        return {
          ...player,
          points: update.points,
        };
      }
      return player;
    });

    // FIXED: Use shared calculation utility for consistency
    // This ensures cascade updates use the SAME formula as transfers
    const calculatedPoints = calculateSquadPoints(
      updatedPlayers,
      squadSize,
      squad.captainId,
      squad.viceCaptainId,
      squad.xFactorId,
      squad.bankedPoints || 0
    );

    return {
      updatedPlayers,
      newTotalPoints: calculatedPoints.totalPoints,
      newCaptainPoints: calculatedPoints.captainPoints,
      newViceCaptainPoints: calculatedPoints.viceCaptainPoints,
      newXFactorPoints: calculatedPoints.xFactorPoints,
    };
  },
};

// Batch Operations for Performance
export const userService = {
  async getById(userId: string): Promise<User | null> {
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (!userDoc.exists()) return null;
    return convertTimestamps({ uid: userDoc.id, ...userDoc.data() }) as User;
  },

  async getByIds(userIds: string[]): Promise<User[]> {
    const users = await Promise.all(
      userIds.map(async (userId) => {
        try {
          return await this.getById(userId);
        } catch (error) {
          console.error(`Error fetching user ${userId}:`, error);
          return null;
        }
      })
    );
    return users.filter((user): user is User => user !== null);
  },
};

export const batchService = {
  // Update multiple squads' points after a match
  async updateSquadPoints(squadUpdates: { squadId: string; points: number; matchId: string }[]): Promise<void> {
    const batch = writeBatch(db);

    squadUpdates.forEach(({ squadId, points, matchId }) => {
      const squadRef = doc(db, COLLECTIONS.SQUADS, squadId);
      batch.update(squadRef, {
        [`matchPoints.${matchId}`]: points,
        totalPoints: points, // This would be calculated total
      });
    });

    await batch.commit();
  },
};

// Utility Functions for Squad Player Management
export const squadPlayerUtils = {
  /**
   * Create a SquadPlayer for initial squad creation
   * All current points count from the start (pointsAtJoining = 0)
   */
  createInitialSquadPlayer(
    player: {
      playerId: string;
      playerName: string;
      team: string;
      role: 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper';
      points: number;
      price?: number;
      isOverseas?: boolean;
    }
  ): SquadPlayer {
    const squadPlayer: SquadPlayer = {
      playerId: player.playerId,
      playerName: player.playerName,
      team: player.team,
      role: player.role,
      points: player.points,
      matchPerformances: {},
      addedAt: new Date(),
      pointsAtJoining: 0, // Set to 0 so ALL current points count - robust for testing & flexible deadlines
    };

    // Only include price if it's defined
    if (player.price !== undefined) {
      squadPlayer.price = player.price;
    }

    // Only include isOverseas if it's defined
    if (player.isOverseas !== undefined) {
      squadPlayer.isOverseas = player.isOverseas;
    }

    return squadPlayer;
  },

  /**
   * Create a SquadPlayer for transfer (replacing another player)
   * Snapshots current points - only future points will count
   */
  createTransferSquadPlayer(
    player: {
      playerId: string;
      playerName: string;
      team: string;
      role: 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper';
      points: number;
      price?: number;
      isOverseas?: boolean;
    }
  ): SquadPlayer {
    const squadPlayer: SquadPlayer = {
      playerId: player.playerId,
      playerName: player.playerName,
      team: player.team,
      role: player.role,
      points: player.points,
      matchPerformances: {},
      addedAt: new Date(),
      pointsAtJoining: player.points, // Snapshot current points - only future gains count
    };

    // Only include price if it's defined
    if (player.price !== undefined) {
      squadPlayer.price = player.price;
    }

    // Only include isOverseas if it's defined
    if (player.isOverseas !== undefined) {
      squadPlayer.isOverseas = player.isOverseas;
    }

    return squadPlayer;
  },

  /**
   * Calculate effective points for a squad player
   * Returns points earned while in this squad
   */
  calculateEffectivePoints(player: SquadPlayer): number {
    const pointsAtJoining = player.pointsAtJoining ?? 0;
    return Math.max(0, player.points - pointsAtJoining);
  },
};