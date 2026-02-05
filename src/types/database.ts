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

export interface ScheduleMatch {
  matchNumber: number;
  description: string; // e.g., "1st Match, Group A"
  team1: string;
  team2: string;
  venue: string;
  stadium: string;
  date: Date;
  timeGMT: string; // e.g., "5:30 AM (GMT)"
  timeLocal: string; // e.g., "11:00 AM (LOCAL)"
  stage?: string; // e.g., "Group A", "Super 8 Group 1", "Semi-Final", "Final"
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
  maxPowerplayMatches?: number; // Number of matches for powerplay dropdown (default 20)
  matchSchedule?: ScheduleMatch[]; // Tournament match schedule

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

  // Overseas player constraints
  overseasPlayersEnabled?: boolean; // Whether to enforce overseas player limits
  maxOverseasPlayers?: number; // Maximum overseas players allowed (e.g., 4)

  // Budget rules
  hasBudget: boolean;
  totalBudget?: number;
}

export interface TransferTypeConfig {
  // Bench transfers - Most powerful, limited availability
  // Option 1: Player Substitution - Swap any playing XI player with a bench player (can remove Captain)
  // Option 2: Role Assignment - Change Captain/Vice-Captain/X-Factor assignments
  benchTransfers: {
    enabled: boolean;
    maxAllowed: number;
    description: string;
    benchSlots: number; // Number of bench player slots available
  };

  // Mid-season transfers - Available during breaks (same rules as flexible)
  // Option 1: Player Substitution - Replace any player except Captain (follows min batter/bowler rules)
  // Option 2: Role Assignment - Change Vice-Captain/X-Factor only (NOT Captain)
  midSeasonTransfers: {
    enabled: boolean;
    maxAllowed: number;
    description: string;
    windowStartDate: Date; // When the transfer window opens
    windowEndDate: Date; // When the transfer window closes
    deadlines?: Date[]; // specific windows when these can be used
  };

  // Flexible transfers - Can be saved and used strategically
  // Option 1: Player Substitution - Replace any player except Captain (follows min batter/bowler rules)
  // Option 2: Role Assignment - Change Vice-Captain/X-Factor only (NOT Captain)
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
  predictionBonusPoints?: number; // Manual bonus points added by admin for correct predictions
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

  // Powerplay
  powerplayMatchNumber?: number; // Selected match number for powerplay bonus
  powerplayPoints?: number; // Points awarded by admin for the powerplay match
  powerplayCompleted?: boolean; // Whether the powerplay match has been played and points awarded

  // Predictions
  predictions?: {
    topRunScorer?: string; // Player name prediction for top run scorer
    topWicketTaker?: string; // Player name prediction for top wicket taker
    winningTeam?: string; // Predicted winning team
    seriesScoreline?: string; // Legacy: Series scoreline prediction (for older leagues)
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

  // Player Substitution fields
  playerOut?: string; // Player removed from squad
  playerIn?: string; // Player added to squad

  // Role Reassignment fields
  newCaptainId?: string; // New captain (only for bench transfers)
  oldCaptainId?: string; // Previous captain (for history tracking)
  newViceCaptainId?: string; // New vice-captain
  oldViceCaptainId?: string; // Previous vice-captain (for history tracking)
  newXFactorId?: string; // New X-Factor
  oldXFactorId?: string; // Previous X-Factor (for history tracking)

  // Enhanced Tracking (Added 2026-02-03)
  bankedAmount?: number; // Points banked in this transfer
  totalBankedAfter?: number; // Total banked points after this transfer
  pointsBefore?: number; // Total squad points before transfer
  pointsAfter?: number; // Total squad points after transfer

  // Pre-Transfer Snapshot for Rollback (Added 2026-02-03)
  preTransferSnapshot?: {
    players: SquadPlayer[]; // Deep copy of players array before transfer
    captainId: string | null;
    viceCaptainId: string | null;
    xFactorId: string | null;
    bankedPoints: number;
    totalPoints: number;
    timestamp: Date;
  };
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
  isOverseas?: boolean; // Whether this player is an overseas player (for transfer validation)
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
  format?: 'T20' | 'ODI' | 'Test'; // Format determines auto scoring mode (optional for backward compatibility)
  creatorId: string; // who created this pool (must be admin)
  adminIds: string[]; // admins who can edit this pool

  // Players in this pool with their current points
  players: PlayerPoolEntry[];

  // Scoring Mode - determines how points are calculated
  // 'automated': Uses detailed battingConfig/bowlingConfig with performance tracking (T20/ODI)
  // 'manual': Simple point input by admin (Test format)
  // Auto-set based on format: T20/ODI = 'automated', Test = 'manual'
  // Defaults to 'automated' for backward compatibility
  scoringMode?: 'automated' | 'manual';

  // Scoring Configuration (REQUIRED for 'automated' mode, optional for 'manual' mode)
  battingConfig?: BattingConfig;
  bowlingConfig?: BowlingConfig;
  fieldingConfig?: FieldingConfig;

  // Update Message (optional commit message for points updates)
  lastUpdateMessage?: string; // e.g., "Test 1 - Day 1"

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface BattingConfig {
  minBallsThreshold: number; // Minimum balls for bonus calculation (e.g., 7)
  bonusSRTrigger: number; // SR threshold for bonus (e.g., 150)
  bonusSRBaseline: number; // SR baseline for calculation (e.g., 130)
  bonusDivisor: number; // Divisor for bonus calculation (e.g., 200)
  penaltiesEnabled: boolean; // Whether to apply penalties for poor SR
  penaltySRThreshold?: number; // SR threshold for penalty (e.g., 120) - only if penalties enabled
}

export interface BowlingConfig {
  wicketPoints: number; // Points per wicket (e.g., 25)
  economyBonusThreshold: number; // Economy threshold for bonus (e.g., 7)
  economyMultiplier: number; // Multiplier for economy bonus (e.g., 5)
  penaltiesEnabled: boolean; // Whether to apply penalties for poor economy
  economyPenaltyThreshold?: number; // Economy threshold for penalty (e.g., 8) - only if penalties enabled
  minOversForEconomy: number; // Minimum overs for economy calculation (e.g., 1)
}

export interface FieldingConfig {
  catchPoints: number; // Points per catch (e.g., 5)
  runOutPoints: number; // Points per run out (e.g., 5)
  stumpingPoints: number; // Points per stumping (e.g., 5)
}

export interface BattingInnings {
  id: string;
  matchId?: string;
  matchLabel?: string; // e.g., "Test 1 - Day 1" or "Match 5"
  runs: number;
  ballsFaced: number;
  pointsEarned: number; // Calculated points from this innings
  date: Date;
  addedBy?: string;
}

export interface BowlingSpell {
  id: string;
  matchId?: string;
  matchLabel?: string;
  overs: number;
  runsConceded: number;
  wickets: number;
  pointsEarned: number; // Calculated points from this spell
  date: Date;
  addedBy?: string;
}

export interface FieldingPerformance {
  id: string;
  matchId?: string;
  matchLabel?: string;
  catches: number;
  runOuts: number;
  stumpings: number;
  pointsEarned: number; // Calculated points from this performance
  date: Date;
  addedBy?: string;
}

export interface PlayerPoolEntry {
  playerId: string;
  name: string;
  team: string;
  role: 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper';
  points: number; // Current fantasy points for this player
  isOverseas: boolean; // Whether this player is an overseas player
  lastUpdated: Date;
  updatedBy?: string; // admin who last updated points

  // Performance tracking for granular point calculation
  battingInnings?: BattingInnings[];
  bowlingSpells?: BowlingSpell[];
  fieldingPerformances?: FieldingPerformance[];
}

export interface PlayerPoolSnapshot {
  id: string;
  playerPoolId: string;
  snapshotDate: Date;
  updateMessage?: string; // Commit message for this update (e.g., "Match 5 - Updated after Day 1")
  updatedBy?: string; // Admin who made the update

  // Snapshot of all player points at this moment
  players: Array<{
    playerId: string;
    name: string;
    team: string;
    role: 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper';
    points: number;
  }>;

  // Point changes from previous snapshot
  changes?: Array<{
    playerId: string;
    name: string;
    previousPoints: number;
    newPoints: number;
    delta: number; // newPoints - previousPoints
  }>;
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
  isOverseas?: boolean; // Whether this player is an overseas player

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
  powerplayPoints?: number; // Points from powerplay match
  powerplayCompleted?: boolean; // Whether the powerplay match has been completed
  rank: number;
  previousRank?: number;
  rankChange?: number; // Positive for improvement, negative for decline
  rankStreak?: number; // Consecutive updates at the same rank

  // Daily Stats
  pointsGainedToday: number;
  leadFromNext?: number; // Points ahead of the next rank

  // Transfer Management
  benchTransfersUsed?: number; // Bench transfers used
  flexibleTransfersUsed?: number; // Flexible transfers used
  midSeasonTransfersUsed?: number; // Mid-season transfers used

  // Team Composition
  captainId?: string;
  captainName?: string;
  viceCaptainId?: string;
  viceCaptainName?: string;
  xFactorId?: string;
  xFactorName?: string;
}