import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin (only if not already initialized)
let adminApp: App;
if (getApps().length === 0) {
  adminApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
} else {
  adminApp = getApps()[0];
}

const db = getFirestore(adminApp);

// Import types (re-defined here for serverless environment)
interface ScheduleMatch {
  matchNumber: number;
  description: string;
  team1: string;
  team2: string;
  venue: string;
  stadium: string;
  date: Date;
  timeGMT: string;
  timeLocal: string;
  stage?: string;
}

interface League {
  id: string;
  name: string;
  matchSchedule?: ScheduleMatch[];
  flexibleChangesEnabled?: boolean;
  benchChangesEnabled?: boolean;
  autoToggleEnabled?: boolean;
  lastAutoToggleUpdate?: Date;
  lastAutoToggleAction?: 'enabled' | 'disabled';
  status: 'squad_selection' | 'active' | 'completed';
}

/**
 * Parse GMT time string and combine with date
 */
function parseMatchTime(timeGMT: string, matchDate: Date): Date {
  const cleanTime = timeGMT.replace(/\s*\(GMT\)\s*/gi, '').trim();
  const timeMatch = cleanTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  
  if (!timeMatch) {
    console.warn(`Could not parse time: ${timeGMT}`);
    return new Date(matchDate);
  }

  let hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  const meridiem = timeMatch[3].toUpperCase();

  if (meridiem === 'PM' && hours !== 12) {
    hours += 12;
  } else if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }

  const date = new Date(matchDate);
  date.setUTCHours(hours, minutes, 0, 0);
  
  return date;
}

/**
 * Get unique match days sorted chronologically
 */
function getMatchDays(schedule: ScheduleMatch[]) {
  if (!schedule || schedule.length === 0) return [];

  const matchesByDate = new Map<string, ScheduleMatch[]>();
  
  schedule.forEach(match => {
    const dateKey = match.date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    if (!matchesByDate.has(dateKey)) {
      matchesByDate.set(dateKey, []);
    }
    matchesByDate.get(dateKey)!.push(match);
  });

  const matchDays: any[] = [];
  
  matchesByDate.forEach((matches, dateKey) => {
    const sortedMatches = [...matches].sort((a, b) => {
      const timeA = parseMatchTime(a.timeGMT, a.date);
      const timeB = parseMatchTime(b.timeGMT, b.date);
      return timeA.getTime() - timeB.getTime();
    });

    const firstMatch = sortedMatches[0];
    const lastMatch = sortedMatches[sortedMatches.length - 1];

    matchDays.push({
      date: dateKey,
      dateObject: firstMatch.date,
      firstMatchTime: parseMatchTime(firstMatch.timeGMT, firstMatch.date),
      lastMatchTime: parseMatchTime(lastMatch.timeGMT, lastMatch.date),
      matches: sortedMatches
    });
  });

  matchDays.sort((a, b) => a.dateObject.getTime() - b.dateObject.getTime());
  return matchDays;
}

/**
 * Calculate if toggles should be enabled
 */
function calculateToggleStatus(schedule: ScheduleMatch[], currentTime: Date): boolean {
  const matchDays = getMatchDays(schedule);

  if (matchDays.length === 0) {
    return false;
  }

  const firstMatchDay = matchDays[0];
  const lastMatchDay = matchDays[matchDays.length - 1];

  // Enable time: 7:30 PM GMT (19:30) on match day
  const calculateEnableTime = (matchDay: any) => {
    const enableTime = new Date(matchDay.dateObject);
    enableTime.setUTCHours(19, 30, 0, 0);
    return enableTime;
  };

  // Disable time: 15 mins before first match of next day
  const calculateDisableTime = (nextMatchDay: any) => {
    const disableTime = new Date(nextMatchDay.firstMatchTime);
    disableTime.setMinutes(disableTime.getMinutes() - 15);
    return disableTime;
  };

  // Before first match day ends
  const firstDayEnableTime = calculateEnableTime(firstMatchDay);
  if (currentTime < firstDayEnableTime) {
    return false;
  }

  // After last match day ends
  const lastDayEnableTime = calculateEnableTime(lastMatchDay);
  if (currentTime >= lastDayEnableTime) {
    return false;
  }

  // Check if we're in any transfer window
  for (let i = 0; i < matchDays.length - 1; i++) {
    const currentMatchDay = matchDays[i];
    const nextMatchDay = matchDays[i + 1];

    const windowStart = calculateEnableTime(currentMatchDay);
    const windowEnd = calculateDisableTime(nextMatchDay);

    if (currentTime >= windowStart && currentTime < windowEnd) {
      return true;
    }
  }

  return false;
}

/**
 * Convert Firestore Timestamps to Dates
 */
function convertTimestamps(data: any): any {
  if (data === null || typeof data !== 'object') return data;

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
}

/**
 * Main handler for the cron job
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Security: Check for authorization header (Vercel cron secret)
    const authHeader = req.headers['authorization'];
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (authHeader !== expectedAuth) {
      console.error('Unauthorized cron request');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('🤖 Transfer Toggle Automator: Starting...');
    const currentTime = new Date();
    console.log(`Current time: ${currentTime.toISOString()}`);

    // Fetch all active leagues
    const leaguesSnapshot = await db.collection('leagues')
      .where('status', 'in', ['squad_selection', 'active'])
      .get();

    const leagues = leaguesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as League[];

    console.log(`Found ${leagues.length} active leagues`);

    const results: any[] = [];

    // Process each league
    for (const league of leagues) {
      try {
        // Skip if automation is disabled for this league
        if (league.autoToggleEnabled === false) {
          console.log(`⏭️  League ${league.id} (${league.name}): Automation disabled, skipping`);
          results.push({
            leagueId: league.id,
            name: league.name,
            status: 'skipped',
            reason: 'automation_disabled'
          });
          continue;
        }

        // Skip if no schedule
        if (!league.matchSchedule || league.matchSchedule.length === 0) {
          console.log(`⏭️  League ${league.id} (${league.name}): No schedule, skipping`);
          results.push({
            leagueId: league.id,
            name: league.name,
            status: 'skipped',
            reason: 'no_schedule'
          });
          continue;
        }

        // Calculate desired toggle state
        const desiredState = calculateToggleStatus(league.matchSchedule, currentTime);
        const currentState = league.flexibleChangesEnabled || false;

        // Check if update is needed
        if (currentState === desiredState) {
          console.log(`✅ League ${league.id} (${league.name}): Already in correct state (${currentState})`);
          results.push({
            leagueId: league.id,
            name: league.name,
            status: 'no_change',
            currentState,
            desiredState
          });
          continue;
        }

        // Update the league
        console.log(`🔄 League ${league.id} (${league.name}): Updating ${currentState} → ${desiredState}`);
        
        await db.collection('leagues').doc(league.id).update({
          flexibleChangesEnabled: desiredState,
          benchChangesEnabled: desiredState,
          lastAutoToggleUpdate: Timestamp.now(),
          lastAutoToggleAction: desiredState ? 'enabled' : 'disabled'
        });

        console.log(`✅ League ${league.id} (${league.name}): Updated successfully`);
        results.push({
          leagueId: league.id,
          name: league.name,
          status: 'updated',
          from: currentState,
          to: desiredState,
          timestamp: currentTime.toISOString()
        });

      } catch (error) {
        console.error(`❌ Error processing league ${league.id}:`, error);
        results.push({
          leagueId: league.id,
          name: league.name || 'Unknown',
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Summary
    const summary = {
      totalLeagues: leagues.length,
      updated: results.filter(r => r.status === 'updated').length,
      noChange: results.filter(r => r.status === 'no_change').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length
    };

    console.log('🎉 Transfer Toggle Automator: Complete');
    console.log('Summary:', summary);

    return res.status(200).json({
      success: true,
      timestamp: currentTime.toISOString(),
      summary,
      results
    });

  } catch (error) {
    console.error('❌ Fatal error in transfer toggle automator:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
