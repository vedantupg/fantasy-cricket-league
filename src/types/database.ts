// Database Types for Fantasy Cricket League

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  profilePicUrl?: string;
  isAdmin: boolean;
  leagues: string[]; // league IDs
  totalPoints: number;
  createdAt: Date;

  // User Preferences & Favorites
  favoriteBatter?: string; // Favorite batsman in the world
  favoriteBowler?: string; // Favorite bowler in the world
  favoriteFielder?: string; // Favorite fielder in the world
  favoriteIPLTeam?: string; // Favorite IPL team they support

  // User Stats (calculated)
  stats?: {
    totalLeaguesJoined: number;
    activeLeagues: number;
    completedLeagues: number;
    highestRankAchieved?: number; // Best rank across all leagues
    totalSquadsSubmitted: number;
    totalPredictionsMade: number;
  };
}

export interface League {
  id: string;
  name: string;
  code: string; // 6-digit alphanumeric join code
  creatorId: string;
  adminIds: string[];
  
  // League Settings
  format: 'T20' | 'ODI' | 'Test';
  maxParticipants: number;
  powerplayEnabled: boolean; // NEW: Powerplay feature toggle

  // Squad Selection Settings
  squadSize: number; // default 11
  squadDeadline: Date;

  // Transfer Settings
  maxTransfers: number;
  transferTypes?: TransferTypeConfig; // NEW: Granular transfer types (optional for backward compatibility)
  transfersUsed: { [userId: string]: number };
  transferDeadline: Date;
  transferWindow: {
    startDate: Date;
    endDate: Date;
  };

  // Admin Controls for Squad Changes
  flexibleChangesEnabled?: boolean; // Admin toggle for allowing flexible changes
  benchChangesEnabled?: boolean; // Admin toggle for allowing bench changes
  
  // League States
  status: 'squad_selection' | 'active' | 'completed';
  tournamentStarted: boolean;
  teamsLocked: boolean;
  
  // Participants
  participants: string[];
  squadsSubmitted: string[];
  
  // Tournament Details
  tournamentName: string;
  startDate: Date;
  endDate: Date;

  // Squad Selection Rules
  playerPoolId?: string; // Reference to PlayerPool
  playerPool: string[]; // Legacy: array of player IDs (kept for backward compatibility)
  squadRules: SquadRules;

  createdAt: Date;
}

export interface SquadRules {
  // Minimum requirements for squad composition
  minBatsmen: number;
  minBowlers: number;
  minAllrounders: number;
  minWicketkeepers: number;

  // Budget rules
  hasBudget: boolean;
  totalBudget?: number;
}

export interface TransferTypeConfig {
  // Bench transfers - can be used anytime during active matches
  benchTransfers: {
    enabled: boolean;
    maxAllowed: number;
    description: string;
    benchSlots: number; // Number of bench player slots available
  };

  // Mid-season transfers - major changes during breaks
  midSeasonTransfers: {
    enabled: boolean;
    maxAllowed: number;
    description: string;
    windowStartDate: Date; // When the transfer window opens
    windowEndDate: Date; // When the transfer window closes
    deadlines?: Date[]; // specific windows when these can be used
  };

  // Flexible transfers - can be saved and used strategically
  flexibleTransfers: {
    enabled: boolean;
    maxAllowed: number;
    description: string;
  };
}

export interface LeagueSquad {
  id: string;
  userId: string;
  leagueId: string;

  // Squad Details
  squadName: string;
  players: SquadPlayer[];
  isSubmitted: boolean;

  // Captain, Vice-Captain, and X-Factor
  captainId?: string; // playerId of captain (gets 2x points)
  viceCaptainId?: string; // playerId of vice-captain (gets 1.5x points)
  xFactorId?: string; // playerId of X-factor (gets 1.25x points)

  // Performance
  totalPoints: number;
  captainPoints: number; // Points contributed by captain
  viceCaptainPoints: number; // Points contributed by vice-captain
  xFactorPoints: number; // Points contributed by X-factor
  rank: number;
  previousRank?: number; // Rank from previous snapshot
  rankChange?: number; // Positive for improvement, negative for decline
  pointsGainedToday?: number; // Points gained since last snapshot
  matchPoints: { [matchId: string]: number };

  // Transfer Management
  transfersUsed: number; // Legacy: total transfers used (kept for backward compatibility)
  benchTransfersUsed: number; // Bench transfers used
  flexibleTransfersUsed: number; // Flexible transfers used
  midSeasonTransfersUsed: number; // Mid-season transfers used
  transferHistory: TransferHistoryEntry[];
  bankedPoints: number; // Points accumulated from removed players or role changes

  // Predictions
  predictions?: {
    topRunScorer?: string; // Player name prediction for top run scorer
    topWicketTaker?: string; // Player name prediction for top wicket taker
    seriesScoreline?: string; // Predicted series scoreline (e.g., "3-1", "2-2")
  };

  // Squad Validation
  isValid: boolean;
  validationErrors: string[];

  createdAt: Date;
  submittedAt?: Date;
  lastUpdated?: Date;
}

export interface TransferHistoryEntry {
  timestamp: Date;
  transferType: 'bench' | 'flexible' | 'midSeason';
  changeType: 'playerSubstitution' | 'roleReassignment';
  playerOut?: string;
  playerIn?: string;
  newViceCaptainId?: string;
  newXFactorId?: string;
}

export interface SquadPlayer {
  playerId: string;
  playerName: string;
  team: string;
  role: 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper';
  price?: number;
  points: number;
  matchPerformances: { [matchId: string]: number };
  addedAt?: Date; // When this player was added to the squad (optional for backward compatibility)
  pointsAtJoining?: number; // Player's total points when they joined this squad (defaults to 0 for initial squad)
  pointsWhenRoleAssigned?: number; // Snapshot of points when C/VC/X role was assigned (for future multiplier tracking)
}

export interface Transfer {
  id: string;
  leagueId: string;
  userId: string;
  
  // Transfer Details
  playerOut: string;
  playerIn: string;
  
  // Status & Approval
  status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
  requiresApproval: boolean;
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string;
  
  // Transfer Window Validation
  isWithinWindow: boolean;
  transferNumber: number;
  
  // Rejection Reason
  rejectionReason?: string;
}

export interface PlayerPool {
  id: string;
  name: string;
  description?: string;
  creatorId: string; // who created this pool (must be admin)
  adminIds: string[]; // admins who can edit this pool

  // Players in this pool with their current points
  players: PlayerPoolEntry[];

  // Update Message (optional commit message for points updates)
  lastUpdateMessage?: string; // e.g., "Test 1 - Day 1"

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface PlayerPoolEntry {
  playerId: string;
  name: string;
  team: string;
  role: 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper';
  points: number; // Current fantasy points for this player
  lastUpdated: Date;
  updatedBy?: string; // admin who last updated points
}

export interface Player {
  id: string;
  name: string;
  team: string;
  country: string;
  role: 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper';

  // Fantasy Relevance
  isActive: boolean;
  availability: 'available' | 'injured' | 'not_selected';

  // Pricing
  basePrice?: number;
  currentPrice?: number;

  // Stats by Format
  stats: {
    T20: PlayerStats;
    ODI: PlayerStats;
    Test: PlayerStats;
  };

  // Media
  imageUrl?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerStats {
  matches: number;
  runs?: number;
  wickets?: number;
  economy?: number;
  strikeRate?: number;
  catches: number;
  recentForm: number;
}

export interface Match {
  id: string;
  externalMatchId?: string;
  
  // Match Details
  team1: string;
  team2: string;
  format: 'T20' | 'ODI' | 'Test';
  venue: string;
  startTime: Date;
  
  // League Integration
  leagueIds: string[];
  
  // Scoring
  status: 'upcoming' | 'live' | 'completed';
  playerPerformances: string[]; // PlayerPerformance IDs
  
  createdAt: Date;
}

export interface PlayerPerformance {
  id: string;
  playerId: string;
  matchId: string;
  
  // Batting
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  
  // Bowling
  overs: number;
  wickets: number;
  runsGiven: number;
  maidens: number;
  
  // Fielding
  catches: number;
  runouts: number;
  stumpings: number;
  
  // Calculated Points
  totalPoints: number;
}

export interface PointsConfig {
  id: string;
  format: 'T20' | 'ODI' | 'Test';

  // Batting Points
  runsMultiplier: number;
  boundaryBonus: number;
  sixBonus: number;
  halfCenturyBonus: number;
  centuryBonus: number;

  // Bowling Points
  wicketPoints: number;
  maidenBonus: number;
  economyBonus: number;

  // Fielding Points
  catchPoints: number;
  runoutPoints: number;
  stumpingPoints: number;

  // Penalties
  duckPenalty: number;

  isActive: boolean;
}

export interface LeaderboardSnapshot {
  id: string;
  leagueId: string;
  snapshotDate: Date; // Date of this snapshot (usually end of day)

  // Snapshot Data
  standings: StandingEntry[];

  // Player Pool Version Info
  playerPoolVersion?: string; // e.g., "Test 1 - Day 1" - captured from PlayerPool.lastUpdateMessage
  pointsUpdatedAt?: Date; // When the player pool was last updated

  // Best Performer (most points gained since last snapshot)
  bestPerformer?: {
    userId: string;
    squadName: string;
    displayName: string;
    profilePicUrl?: string;
    pointsGained: number;
    matchNumber?: number; // Which match contributed most
  };

  // Rapid Riser (most ranks gained since last snapshot)
  rapidRiser?: {
    userId: string;
    squadName: string;
    displayName: string;
    profilePicUrl?: string;
    ranksGained: number;
    previousRank: number;
    currentRank: number;
  };

  createdAt: Date;
}

export interface StandingEntry {
  userId: string;
  squadId: string;
  squadName: string;
  displayName: string;
  profilePicUrl?: string;

  // Points & Rank
  totalPoints: number;
  captainPoints: number;
  viceCaptainPoints: number;
  xFactorPoints: number;
  rank: number;
  previousRank?: number;
  rankChange?: number; // Positive for improvement, negative for decline

  // Daily Stats
  pointsGainedToday: number;
  leadFromNext?: number; // Points ahead of the next rank

  // Team Composition
  captainId?: string;
  captainName?: string;
  viceCaptainId?: string;
  viceCaptainName?: string;
  xFactorId?: string;
  xFactorName?: string;
}