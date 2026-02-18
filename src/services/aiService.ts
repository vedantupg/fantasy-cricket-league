/**
 * AI Service using Google Gemini
 * Provides intelligent assistance for fantasy cricket league
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LeagueSquad, League, PlayerPoolEntry, SquadPlayer, StandingEntry } from '../types/database';

// Initialize Gemini AI
// NOTE: In production, move this to Firebase Cloud Functions for security
const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY || '');

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface PeerSquad {
  squadName: string;
  rank: number;
  totalPoints: number;
  captainName: string;
  viceCaptainName: string;
  xFactorName: string;
  players: string[]; // player names only, keep tokens lean
}

export interface LeagueContext {
  userSquad: {
    userName: string;
    totalPoints: number;
    rank: number;
    // Playing XI — these are the scored players
    players: Array<{
      name: string;
      role: string;
      points: number;
      isCaptain: boolean;
      isViceCaptain: boolean;
      isXFactor: boolean;
      ownershipPercent: number;
    }>;
    // Bench players — in the squad but NOT in the playing XI
    // Can be swapped in via a Bench Transfer (see transferRules)
    benchPlayers: Array<{
      name: string;
      role: string;
      points: number;
      ownershipPercent: number;
    }>;
    bankedPoints: number;
    // Transfer summary
    flexibleTransfersRemaining: number;
    flexibleTransfersUsed: number;
    flexibleTransfersTotal: number;
    benchTransfersRemaining: number;
    benchTransfersUsed: number;
    benchTransfersTotal: number;
  };
  // Transfer rules — always include so Gemini understands what each transfer type does
  transferRules: {
    benchTransferExplained: string;
    flexibleTransferExplained: string;
    benchSlotsCount: number;
  };
  leagueStats: {
    totalPlayers: number;
    averagePoints: number;
    topScore: number;
    userRank: number;
  };
  availablePlayers: Array<{
    name: string;
    role: string;
    points: number;
    team: string;
    isOverseas: boolean;
  }>;
  // Peer intelligence — always included, token-light
  peerIntelligence: {
    top3Squads: PeerSquad[];         // Top 3 squads compressed
    captainDistribution: Array<{ name: string; count: number; percent: number }>; // Top 5 captain picks across league
    // Per-player ownership is already on userSquad.players.ownershipPercent
  };
  // On-demand: full squad of a specific peer for head-to-head
  comparisonSquad?: PeerSquad & { players: string[] };
}

/**
 * Compress a squad into a lean PeerSquad for the prompt
 */
function compressToPeerSquad(squad: LeagueSquad, rank: number): PeerSquad {
  const captainPlayer = squad.players.find((p: SquadPlayer) => p.playerId === squad.captainId);
  const vcPlayer = squad.players.find((p: SquadPlayer) => p.playerId === squad.viceCaptainId);
  const xfPlayer = squad.players.find((p: SquadPlayer) => p.playerId === squad.xFactorId);
  return {
    squadName: squad.squadName || 'Unknown Squad',
    rank,
    totalPoints: squad.totalPoints || 0,
    captainName: captainPlayer?.playerName || 'Unknown',
    viceCaptainName: vcPlayer?.playerName || 'Unknown',
    xFactorName: xfPlayer?.playerName || 'Unknown',
    players: squad.players.map((p: SquadPlayer) => p.playerName),
  };
}

/**
 * Build context from user data
 * standings: from the latest LeaderboardSnapshot — these are the AUTHORITATIVE
 *   rank and totalPoints values (include predictionBonusPoints, powerplayPoints, etc.)
 *   If no snapshot exists yet, pass [] and we fall back to squad docs.
 */
export function buildLeagueContext(
  userSquad: LeagueSquad,
  allSquads: LeagueSquad[],
  playerPool: PlayerPoolEntry[],
  league: League,
  standings: StandingEntry[] = []
): LeagueContext {
  const totalLeaguePlayers = allSquads.length;

  // Use snapshot standings as authoritative rank/points source.
  // Standings are already sorted by rank from the snapshot service.
  const userStanding = standings.find(s => s.userId === userSquad.userId);
  const userRank = userStanding?.rank ?? userSquad.rank ?? 1;
  const userTotalPoints = userStanding?.totalPoints ?? userSquad.totalPoints ?? 0;
  const averagePoints = standings.length > 0
    ? standings.reduce((sum, s) => sum + s.totalPoints, 0) / standings.length
    : allSquads.reduce((sum, s) => sum + (s.totalPoints || 0), 0) / (totalLeaguePlayers || 1);
  const topScore = standings.length > 0
    ? standings[0].totalPoints  // standings[0] = rank #1
    : Math.max(...allSquads.map(s => s.totalPoints || 0));

  // Sort all squads by snapshot rank for peer ordering
  const sortedSquads = standings.length > 0
    ? [...standings].sort((a, b) => a.rank - b.rank)
        .map(s => allSquads.find(sq => sq.userId === s.userId))
        .filter((sq): sq is LeagueSquad => !!sq)
    : [...allSquads].sort((a, b) => (a.rank || 999) - (b.rank || 999));

  // ---- Transfer counts ----
  const flexibleTotal = league.transferTypes?.flexibleTransfers?.maxAllowed || 0;
  const flexibleUsed = userSquad.flexibleTransfersUsed || 0;
  const flexibleRemaining = Math.max(0, flexibleTotal - flexibleUsed);

  const benchTotal = league.transferTypes?.benchTransfers?.maxAllowed || 0;
  const benchUsed = userSquad.benchTransfersUsed || 0;
  const benchRemaining = Math.max(0, benchTotal - benchUsed);
  const benchSlots = league.transferTypes?.benchTransfers?.benchSlots || 0;

  // ---- Bench vs playing XI split ----
  // Playing XI = first 11 players; bench = remainder (benchSlots count)
  const playingXI = userSquad.players.slice(0, 11);
  const benchPlayersList = userSquad.players.slice(11);

  // ---- Ownership % per player ----
  const ownershipMap = new Map<string, number>();
  allSquads.forEach(squad => {
    squad.players.forEach((p: SquadPlayer) => {
      ownershipMap.set(p.playerId, (ownershipMap.get(p.playerId) || 0) + 1);
    });
  });

  // ---- Captain distribution ----
  const captainMap = new Map<string, { name: string; count: number }>();
  allSquads.forEach(squad => {
    if (squad.captainId) {
      const captainPlayer = squad.players.find((p: SquadPlayer) => p.playerId === squad.captainId);
      const name = captainPlayer?.playerName || 'Unknown';
      const existing = captainMap.get(squad.captainId);
      if (existing) {
        existing.count++;
      } else {
        captainMap.set(squad.captainId, { name, count: 1 });
      }
    }
  });
  const captainDistribution = Array.from(captainMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(c => ({
      name: c.name,
      count: c.count,
      percent: Math.round((c.count / (totalLeaguePlayers || 1)) * 100),
    }));

  // ---- Top 3 peer squads (authoritative rank/points from snapshot) ----
  const top3Squads = sortedSquads
    .filter(s => s.userId !== userSquad.userId)
    .slice(0, 3)
    .map((squad) => {
      const standing = standings.find(s => s.userId === squad.userId);
      const rank = standing?.rank ?? squad.rank ?? 0;
      const peer = compressToPeerSquad(squad, rank);
      // Override totalPoints with snapshot value if available
      if (standing) peer.totalPoints = standing.totalPoints;
      return peer;
    });

  return {
    userSquad: {
      userName: userSquad.squadName || 'Unknown Squad',
      totalPoints: userTotalPoints,
      rank: userRank,
      players: playingXI.map((p: SquadPlayer) => ({
        name: p.playerName,
        role: p.role,
        points: p.points,
        isCaptain: p.playerId === userSquad.captainId,
        isViceCaptain: p.playerId === userSquad.viceCaptainId,
        isXFactor: p.playerId === userSquad.xFactorId,
        ownershipPercent: Math.round(((ownershipMap.get(p.playerId) || 0) / (totalLeaguePlayers || 1)) * 100),
      })),
      benchPlayers: benchPlayersList.map((p: SquadPlayer) => ({
        name: p.playerName,
        role: p.role,
        points: p.points,
        ownershipPercent: Math.round(((ownershipMap.get(p.playerId) || 0) / (totalLeaguePlayers || 1)) * 100),
      })),
      bankedPoints: userSquad.bankedPoints || 0,
      flexibleTransfersRemaining: flexibleRemaining,
      flexibleTransfersUsed: flexibleUsed,
      flexibleTransfersTotal: flexibleTotal,
      benchTransfersRemaining: benchRemaining,
      benchTransfersUsed: benchUsed,
      benchTransfersTotal: benchTotal,
    },
    transferRules: {
      benchSlotsCount: benchSlots,
      benchTransferExplained: `A Bench Transfer lets you swap any player in your Playing XI with one of your ${benchSlots} bench players. You can also use it to reassign Captain/VC/XF roles. You have ${benchRemaining} of ${benchTotal} bench transfers remaining. Bench players do NOT score points until they are moved into the Playing XI via a bench transfer.`,
      flexibleTransferExplained: `A Flexible Transfer lets you replace any non-Captain player in your Playing XI with any player from the global player pool. You can also use it to reassign VC/XF roles (but NOT the Captain). You have ${flexibleRemaining} of ${flexibleTotal} flexible transfers remaining.`,
    },
    leagueStats: {
      totalPlayers: totalLeaguePlayers,
      averagePoints,
      topScore,
      userRank,
    },
    availablePlayers: playerPool.map(p => ({
      name: p.name,
      role: p.role,
      points: p.points,
      team: p.team,
      isOverseas: p.isOverseas,
    })),
    peerIntelligence: {
      top3Squads,
      captainDistribution,
    },
  };
}

/**
 * Inject a specific peer squad for head-to-head comparison
 */
export function injectComparisonSquad(
  context: LeagueContext,
  peerSquad: LeagueSquad,
  peerRank: number
): LeagueContext {
  return {
    ...context,
    comparisonSquad: compressToPeerSquad(peerSquad, peerRank),
  };
}

/**
 * Query the AI assistant
 */
export async function queryAI(
  question: string,
  context: LeagueContext,
  conversationHistory: Message[] = []
): Promise<string> {
  try {
    // Validate API key is present
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key not found. Please ensure REACT_APP_GEMINI_API_KEY is set in your .env.local file and restart the dev server.');
    }

    console.log('AI Query - API Key status:', apiKey ? 'Present' : 'Missing');
    console.log('AI Query - Context:', {
      squadName: context.userSquad.userName,
      rank: context.userSquad.rank,
      totalPoints: context.userSquad.totalPoints,
      playersCount: context.userSquad.players.length,
    });

    // Build conversation context
    const conversationContext = conversationHistory
      .slice(-5) // Only use last 5 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Pre-compute all numeric gaps so Gemini never has to do arithmetic
    const userPts = context.userSquad.totalPoints;
    const avgPts = context.leagueStats.averagePoints;
    const topPts = context.leagueStats.topScore;
    const vsAvg = (userPts - avgPts).toFixed(2);
    const vsTop = (userPts - topPts).toFixed(2);
    const vsAvgLabel = userPts >= avgPts ? `${vsAvg} pts ABOVE average` : `${Math.abs(Number(vsAvg))} pts BELOW average`;
    const vsTopLabel = `${Math.abs(Number(vsTop))} pts behind the leader`;

    // Create system prompt
    const systemPrompt = `You are Gemini, an expert fantasy cricket assistant helping users optimize their league performance.

CRITICAL ACCURACY RULES — FOLLOW WITHOUT EXCEPTION:
1. NEVER perform arithmetic yourself. Every point total, gap, rank, and percentage is already computed and provided in the context below. Use those exact numbers only.
2. NEVER invent or estimate any number. If a number is not explicitly in the context, say you don't have that data.
3. NEVER say "X points ahead/behind" unless that exact gap is already written below — use the pre-computed gap values provided.
4. Always quote player names, squad names, ranks, and points exactly as they appear in the context.
5. For transfer recommendations: always specify the transfer TYPE (Bench Transfer or Flexible Transfer), name the exact player going OUT and the exact player coming IN, and reference their points from the data. NEVER recommend more transfers than the user has remaining. When recommending from the available players list, suggest the best player per ROLE (batsman/bowler/allrounder) not just the overall highest scorer.
6. CRITICAL — bench players are NOT scoring and should NEVER be criticised for low points. If a bench player is high-scoring, suggest bringing them in via a Bench Transfer to replace a weaker Playing XI player.
7. If asked about captaincy, recommend the highest-performing player with justification from the data.
8. Keep responses structured and informative (2-5 paragraphs) with bullet points for recommendations.
9. Add relevant emojis for readability (⭐ 🎯 📊 ✅ ⬆️ ⬇️ 💡 🔄 🔍 ⚔️).
10. When comparing squads, ALWAYS structure the response as: (a) Shared players list, (b) Your differentials list, (c) Opponent's differentials list, (d) Captaincy/VC/XF comparison with points edge, (e) 1-2 specific transfer recommendations from the available player pool to close the gap.
11. ALWAYS end your response with "**💡 What else can I help with?**" followed by 2-3 relevant follow-up questions.

USER'S CURRENT SITUATION:
━━━━━━━━━━━━━━━━━━━━━━━━
Squad: ${context.userSquad.userName}
Total Points: ${userPts.toFixed(2)}
Rank: #${context.userSquad.rank} of ${context.leagueStats.totalPlayers}
Banked Points: ${context.userSquad.bankedPoints.toFixed(2)}
Flexible Transfers Remaining: ${context.userSquad.flexibleTransfersRemaining}
Bench Transfers Remaining: ${context.userSquad.benchTransfersRemaining}
vs League Average: ${vsAvgLabel} (average = ${avgPts.toFixed(2)} pts)
vs League Leader: ${vsTopLabel} (leader = ${topPts.toFixed(2)} pts)

PLAYING XI (with league ownership %):
${context.userSquad.players.map(p =>
  `- ${p.name} (${p.role}): ${p.points.toFixed(2)} pts | ${p.ownershipPercent}% owned${p.isCaptain ? ' ⭐ CAPTAIN' : ''}${p.isViceCaptain ? ' 🔸 VC' : ''}${p.isXFactor ? ' ⚡ X-FACTOR' : ''}`
).join('\n')}

BENCH PLAYERS (NOT scoring — must use a Bench Transfer to bring them into Playing XI):
${context.userSquad.benchPlayers.length > 0
  ? context.userSquad.benchPlayers.map(p =>
      `- ${p.name} (${p.role}): ${p.points.toFixed(2)} pts | ${p.ownershipPercent}% owned [BENCH — not currently scoring]`
    ).join('\n')
  : '- No bench players'}

TRANSFER STATUS:
Flexible Transfers: ${context.userSquad.flexibleTransfersRemaining} remaining (${context.userSquad.flexibleTransfersUsed}/${context.userSquad.flexibleTransfersTotal} used)
Bench Transfers: ${context.userSquad.benchTransfersRemaining} remaining (${context.userSquad.benchTransfersUsed}/${context.userSquad.benchTransfersTotal} used)

TRANSFER RULES (understand these before recommending any transfer):
- ${context.transferRules.flexibleTransferExplained}
- ${context.transferRules.benchTransferExplained}

LEAGUE STATISTICS:
League Average: ${avgPts.toFixed(2)} pts
Top Score (Rank #1): ${topPts.toFixed(2)} pts
Total Participants: ${context.leagueStats.totalPlayers}

CAPTAIN PICKS ACROSS THE LEAGUE (top 5):
${context.peerIntelligence.captainDistribution.map(c =>
  `- ${c.name}: ${c.count} teams (${c.percent}%)`
).join('\n')}

TOP 3 SQUADS IN THE LEAGUE (pre-computed gaps vs you):
${context.peerIntelligence.top3Squads.map(s => {
  const gap = (s.totalPoints - userPts).toFixed(2);
  const gapLabel = s.totalPoints > userPts ? `${gap} pts ahead of you` : `${Math.abs(Number(gap))} pts behind you`;
  return `#${s.rank} ${s.squadName} — ${s.totalPoints.toFixed(2)} pts [${gapLabel}] | Captain: ${s.captainName} | VC: ${s.viceCaptainName} | XF: ${s.xFactorName}\n  Players: ${s.players.join(', ')}`;
}).join('\n')}

${context.comparisonSquad ? `HEAD-TO-HEAD COMPARISON TARGET:
━━━━━━━━━━━━━━━━━━━━━━━━
#${context.comparisonSquad.rank} ${context.comparisonSquad.squadName} — ${context.comparisonSquad.totalPoints.toFixed(2)} pts
Gap: ${Math.abs(userPts - context.comparisonSquad.totalPoints).toFixed(2)} pts (${userPts >= context.comparisonSquad.totalPoints ? 'you are ahead' : 'they are ahead'})
Captain: ${context.comparisonSquad.captainName} | VC: ${context.comparisonSquad.viceCaptainName} | XF: ${context.comparisonSquad.xFactorName}
Players: ${context.comparisonSquad.players.join(', ')}
` : ''}
AVAILABLE PLAYERS FROM POOL (top 2 per role — NOT already in your Playing XI):
${(() => {
  const myPlayerNames = new Set(context.userSquad.players.map(p => p.name));
  const sorted = context.availablePlayers
    .filter(p => !myPlayerNames.has(p.name))
    .sort((a, b) => b.points - a.points);
  const roles = ['batsman', 'allrounder', 'bowler', 'wicketkeeper'];
  return roles.flatMap(role => {
    const forRole = sorted.filter(p => p.role === role).slice(0, 2);
    if (forRole.length === 0) return [];
    return [`${role.toUpperCase()}S:`, ...forRole.map(p => `  - ${p.name} (${p.team}): ${p.points.toFixed(2)} pts${p.isOverseas ? ' 🌍' : ''}`)];
  }).join('\n');
})()}

${conversationContext ? `RECENT CONVERSATION:\n${conversationContext}\n` : ''}

USER QUESTION: ${question}

Provide a helpful, data-driven answer with specific recommendations. ALWAYS end with "**💡 What else can I help with?**" and 2-3 relevant follow-up questions.`;

    // Call Gemini API
    // Using Gemini 2.5 Flash - stable production model optimized for assistants
    // Note: gemini-pro was retired January 2026, replaced with Gemini 2.5/3 series
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192, // Large enough for full comparison responses
        topP: 0.9,
      },
    });

    const result = await model.generateContent(systemPrompt);
    const response = result.response;
    const text = response.text();

    return text;
  } catch (error: any) {
    console.error('AI Query Error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response,
      apiKey: process.env.REACT_APP_GEMINI_API_KEY ? 'Present' : 'Missing',
    });

    // Handle specific error cases
    if (error.message?.includes('API key') || error.message?.includes('API_KEY_INVALID')) {
      throw new Error('AI service not configured. Please add REACT_APP_GEMINI_API_KEY to your .env file.');
    }

    if (error.message?.includes('quota') || error.message?.includes('QUOTA_EXCEEDED')) {
      throw new Error('API quota exceeded. Please try again later.');
    }

    if (error.message?.includes('404') && error.message?.includes('not found')) {
      throw new Error('⚠️ API Key Issue: Your Gemini API key cannot access any models. Please:\n1. Go to https://aistudio.google.com/apikey\n2. Create a new API key\n3. Update REACT_APP_GEMINI_API_KEY in .env.local\n4. Restart the dev server');
    }

    // Return more specific error message
    throw new Error(`Failed to get AI response: ${error.message || 'Unknown error'}. Please try again.`);
  }
}

/**
 * Quick suggestions for common queries
 */
export const SUGGESTED_QUESTIONS = [
  "How do I beat the league leader?",
  "What are my differentials?",
  "Who should I make my captain?",
  "Suggest 3 transfers to improve my squad",
  "Am I at risk of dropping ranks?",
  "Analyse the captain picks across the league",
  "Which players are underperforming?",
  "How unique is my squad compared to the rest?",
];

/**
 * Get a smart suggestion based on context
 */
export function getSmartSuggestion(context: LeagueContext): string {
  const { userSquad, leagueStats } = context;

  // If below average, suggest transfers
  if (userSquad.totalPoints < leagueStats.averagePoints) {
    return "How can I improve my squad to catch up?";
  }

  // If no transfers remaining
  if (userSquad.flexibleTransfersRemaining === 0 && userSquad.benchTransfersRemaining === 0) {
    return "What captain should I choose for maximum points?";
  }

  // If in top 3, suggest how to maintain lead
  if (userSquad.rank <= 3) {
    return "Am I at risk of dropping ranks?";
  }

  // Close to a rival — suggest comparison
  if (userSquad.rank <= 5) {
    return "How do I beat the league leader?";
  }

  // Default
  return "What are my differentials?";
}
