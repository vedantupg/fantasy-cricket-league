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
    windowDurationHours: number; // How long the transfer window stays open (24, 36, or 48 hours)
    windowStartDate: Date; // When the transfer window opens
    deadlines?: Date[]; // specific windows when these can be used
  };

  // Flexible transfers - can be saved and used strategically
  flexibleTransfers: {
    enabled: boolean;
    maxAllowed: number;
    description: string;
    canCarryForward: boolean; // if unused transfers can be saved
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
  
  // Performance
  totalPoints: number;
  rank: number;
  matchPoints: { [matchId: string]: number };
  
  // Transfer Management
  transfersUsed: number;
  transferHistory: string[]; // transfer IDs
  
  // Squad Validation
  isValid: boolean;
  validationErrors: string[];
  
  createdAt: Date;
  submittedAt?: Date;
}

export interface SquadPlayer {
  playerId: string;
  playerName: string;
  team: string;
  role: 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper';
  price?: number;
  points: number;
  matchPerformances: { [matchId: string]: number };
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