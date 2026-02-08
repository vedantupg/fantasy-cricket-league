/**
 * AI Service using Google Gemini
 * Provides intelligent assistance for fantasy cricket league
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LeagueSquad, League, PlayerPoolEntry, SquadPlayer } from '../types/database';

// Initialize Gemini AI
// NOTE: In production, move this to Firebase Cloud Functions for security
const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY || '');

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface LeagueContext {
  userSquad: {
    userName: string;
    totalPoints: number;
    rank: number;
    players: Array<{
      name: string;
      role: string;
      points: number;
      isCaptain: boolean;
      isViceCaptain: boolean;
      isXFactor: boolean;
    }>;
    bankedPoints: number;
    transfersRemaining: number;
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
}

/**
 * Build context from user data
 */
export function buildLeagueContext(
  userSquad: LeagueSquad,
  allSquads: LeagueSquad[],
  playerPool: PlayerPoolEntry[],
  league: League
): LeagueContext {
  // Calculate leaderboard
  const leaderboard = allSquads
    .map(squad => ({
      userId: squad.userId,
      userName: squad.squadName || 'Unknown Squad',
      points: squad.totalPoints || 0,
    }))
    .sort((a, b) => b.points - a.points);

  const userRank = leaderboard.findIndex(s => s.userId === userSquad.userId) + 1;
  const averagePoints = leaderboard.reduce((sum, s) => sum + s.points, 0) / leaderboard.length;

  // Calculate transfers remaining
  const flexibleTransfers = league.transferTypes?.flexibleTransfers?.maxAllowed || 0;
  const usedTransfers = userSquad.flexibleTransfersUsed || 0;
  const transfersRemaining = Math.max(0, flexibleTransfers - usedTransfers);

  return {
    userSquad: {
      userName: userSquad.squadName || 'Unknown Squad',
      totalPoints: userSquad.totalPoints || 0,
      rank: userRank,
      players: userSquad.players.map((p: SquadPlayer) => ({
        name: p.playerName,
        role: p.role,
        points: p.points,
        isCaptain: p.playerId === userSquad.captainId,
        isViceCaptain: p.playerId === userSquad.viceCaptainId,
        isXFactor: p.playerId === userSquad.xFactorId,
      })),
      bankedPoints: userSquad.bankedPoints || 0,
      transfersRemaining,
    },
    leagueStats: {
      totalPlayers: leaderboard.length,
      averagePoints,
      topScore: leaderboard[0]?.points || 0,
      userRank,
    },
    availablePlayers: playerPool.map(p => ({
      name: p.name,
      role: p.role,
      points: p.points,
      team: p.team,
      isOverseas: p.isOverseas,
    })),
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

    // Create system prompt
    const systemPrompt = `You are Gemini, an expert fantasy cricket assistant helping users optimize their league performance.

IMPORTANT RULES:
1. Always be specific with numbers and player names - cite exact points and ranks
2. Provide data-driven recommendations based on the statistics provided
3. If asked about transfers, check if they have transfers remaining and suggest specific player swaps
4. If asked about captaincy, recommend the highest-performing player with justification
5. Keep responses structured and informative (2-5 paragraphs)
6. Use bullet points for lists of recommendations
7. Add relevant emojis for readability (⭐ 🎯 📊 ✅ ⬆️ ⬇️ 💡 🔄)
8. Be encouraging but realistic about squad performance
9. ALWAYS end your response with a section titled "**💡 What else can I help with?**" followed by 2-3 relevant follow-up questions the user might ask

USER'S CURRENT SITUATION:
━━━━━━━━━━━━━━━━━━━━━━━━
Squad: ${context.userSquad.userName}
Total Points: ${context.userSquad.totalPoints}
Rank: #${context.userSquad.rank} of ${context.leagueStats.totalPlayers}
Banked Points: ${context.userSquad.bankedPoints}
Transfers Remaining: ${context.userSquad.transfersRemaining}

SQUAD PLAYERS:
${context.userSquad.players.map(p =>
  `- ${p.name} (${p.role}): ${p.points} pts${p.isCaptain ? ' ⭐ CAPTAIN' : ''}${p.isViceCaptain ? ' 🔸 VC' : ''}${p.isXFactor ? ' ⚡ X-FACTOR' : ''}`
).join('\n')}

LEAGUE STATISTICS:
Average Points: ${context.leagueStats.averagePoints.toFixed(0)}
Top Score: ${context.leagueStats.topScore}
Your Position: ${context.userSquad.totalPoints > context.leagueStats.averagePoints ? 'Above' : 'Below'} average (${(context.userSquad.totalPoints - context.leagueStats.averagePoints).toFixed(0)} points)

AVAILABLE PLAYERS (Top 20 by points):
${context.availablePlayers
  .sort((a, b) => b.points - a.points)
  .slice(0, 20)
  .map(p => `- ${p.name} (${p.role}, ${p.team}): ${p.points} pts${p.isOverseas ? ' 🌍' : ''}`)
  .join('\n')}

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
        maxOutputTokens: 2048, // Increased for complete, detailed responses
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
  "Who should I make my captain?",
  "Suggest 3 transfers to improve my squad",
  "How is my squad performing?",
  "Compare my squad with the league leader",
  "Which players are underperforming?",
  "Who are the top scorers in the league?",
  "What's the best bench transfer I can make?",
  "Analyze my captain's performance",
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
  if (userSquad.transfersRemaining === 0) {
    return "What captain should I choose for maximum points?";
  }

  // If in top 3, suggest optimization
  if (userSquad.rank <= 3) {
    return "How can I maintain my lead?";
  }

  // Default
  return "Suggest 3 transfers to improve my squad";
}
