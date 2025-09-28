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
  Player,
  Transfer,
  Match,
  PlayerPerformance,
  PointsConfig,
} from '../types/database';

// Collection References
const COLLECTIONS = {
  USERS: 'users',
  LEAGUES: 'leagues',
  SQUADS: 'squads',
  PLAYERS: 'players',
  TRANSFERS: 'transfers',
  MATCHES: 'matches',
  PLAYER_PERFORMANCES: 'playerPerformances',
  POINTS_CONFIGS: 'pointsConfigs',
} as const;

// Utility function to convert Firestore Timestamp to Date
const convertTimestamps = (data: any): any => {
  if (data === null || typeof data !== 'object') return data;
  
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
      where('leagueId', '==', leagueId),
      orderBy('requestedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => 
      convertTimestamps({ id: doc.id, ...doc.data() }) as Transfer
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

// Batch Operations for Performance
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

export default {
  leagueService,
  squadService,
  playerService,
  transferService,
  matchService,
  batchService,
};