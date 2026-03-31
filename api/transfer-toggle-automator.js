let firebaseAdminApp = null;
let firestoreDb = null;
const DISABLE_BUFFER_MINUTES = -5;

function parseMatchTime(timeGMT, matchDate) {
  if (!timeGMT || typeof timeGMT !== 'string') {
    return null;
  }

  const cleanTime = timeGMT
    .replace(/\(GMT\)/gi, '')
    .replace(/\bGMT\b/gi, '')
    .trim();

  const twelveHourMatch = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHourMatch) {
    let hours = parseInt(twelveHourMatch[1], 10);
    const minutes = parseInt(twelveHourMatch[2], 10);
    const meridiem = twelveHourMatch[3].toUpperCase();

    if (meridiem === 'PM' && hours !== 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }

    const date = new Date(matchDate);
    date.setUTCHours(hours, minutes, 0, 0);
    return date;
  }

  const twentyFourHourMatch = cleanTime.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (twentyFourHourMatch) {
    const hours = parseInt(twentyFourHourMatch[1], 10);
    const minutes = parseInt(twentyFourHourMatch[2], 10);
    const date = new Date(matchDate);
    date.setUTCHours(hours, minutes, 0, 0);
    return date;
  }

  return null;
}

function getMatchDays(schedule) {
  if (!schedule || schedule.length === 0) return [];

  const matchesByDate = new Map();

  schedule.forEach(match => {
    const d = new Date(match.date);
    const dateKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

    if (!matchesByDate.has(dateKey)) {
      matchesByDate.set(dateKey, []);
    }
    matchesByDate.get(dateKey).push(match);
  });

  const matchDays = [];

  matchesByDate.forEach((matches, dateKey) => {
    const sortedMatches = [...matches].sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));
    const firstMatch = sortedMatches[0];
    const parsedTimes = sortedMatches
      .map((match) => parseMatchTime(match.timeGMT, match.date))
      .filter((time) => time !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    matchDays.push({
      date: dateKey,
      dateObject: new Date(firstMatch.date),
      firstParsedMatchTime: parsedTimes.length > 0 ? parsedTimes[0] : null,
      matches: sortedMatches
    });
  });

  matchDays.sort((a, b) => a.dateObject.getTime() - b.dateObject.getTime());
  return matchDays;
}

function calculateDisableTime(matchDay) {
  if (matchDay.firstParsedMatchTime) {
    const parsedBoundary = new Date(matchDay.firstParsedMatchTime);
    parsedBoundary.setMinutes(parsedBoundary.getMinutes() + DISABLE_BUFFER_MINUTES);
    return parsedBoundary;
  }

  const disableTime = new Date(matchDay.dateObject);
  const hasMultipleMatches = Array.isArray(matchDay.matches) && matchDay.matches.length >= 2;
  disableTime.setUTCHours(hasMultipleMatches ? 10 : 14, 0, 0, 0);
  disableTime.setMinutes(disableTime.getMinutes() + DISABLE_BUFFER_MINUTES);
  return disableTime;
}

function getDisableBoundaryDetails(schedule) {
  const matchDays = getMatchDays(schedule);
  const boundaries = matchDays.map((matchDay) => {
    const usedParsedTime = !!matchDay.firstParsedMatchTime;
    const boundary = calculateDisableTime(matchDay);
    const fallbackBaseTime = matchDay.matches.length >= 2 ? '10:00 GMT' : '14:00 GMT';

    return {
      date: matchDay.date,
      matchCount: matchDay.matches.length,
      source: usedParsedTime ? 'parsed_timeGMT' : 'fallback_match_count',
      parsedTime: usedParsedTime ? matchDay.firstParsedMatchTime.toISOString() : null,
      fallbackBaseTime: usedParsedTime ? null : fallbackBaseTime,
      bufferMinutes: DISABLE_BUFFER_MINUTES,
      boundary
    };
  });

  boundaries.sort((a, b) => a.boundary.getTime() - b.boundary.getTime());
  return boundaries;
}

function getDisableBoundaries(schedule) {
  return getDisableBoundaryDetails(schedule).map((entry) => entry.boundary);
}

function evaluateDisableDecision(schedule, currentTime, lastAutoToggleUpdate, lastAutoToggleAction) {
  const boundaryDetails = getDisableBoundaryDetails(schedule);
  const reachedBoundaryDetails = boundaryDetails.filter((entry) => entry.boundary.getTime() <= currentTime.getTime());
  const nextBoundaryDetail = boundaryDetails.find((entry) => entry.boundary.getTime() > currentTime.getTime()) || null;

  if (reachedBoundaryDetails.length === 0) {
    return {
      shouldDisable: false,
      reason: 'no_boundary_reached_yet',
      latestReachedBoundary: null,
      nextBoundary: nextBoundaryDetail,
      reachedCount: 0,
      totalBoundaries: boundaryDetails.length
    };
  }

  const latestReachedBoundary = reachedBoundaryDetails[reachedBoundaryDetails.length - 1];
  if (
    lastAutoToggleAction === 'disabled' &&
    lastAutoToggleUpdate instanceof Date &&
    lastAutoToggleUpdate.getTime() >= latestReachedBoundary.boundary.getTime()
  ) {
    return {
      shouldDisable: false,
      reason: 'already_disabled_for_latest_boundary',
      latestReachedBoundary,
      nextBoundary: nextBoundaryDetail,
      reachedCount: reachedBoundaryDetails.length,
      totalBoundaries: boundaryDetails.length
    };
  }

  return {
    shouldDisable: true,
    reason: 'boundary_reached_and_not_yet_processed',
    latestReachedBoundary,
    nextBoundary: nextBoundaryDetail,
    reachedCount: reachedBoundaryDetails.length,
    totalBoundaries: boundaryDetails.length
  };
}

function shouldDisableNow(schedule, currentTime, lastAutoToggleUpdate, lastAutoToggleAction) {
  return evaluateDisableDecision(schedule, currentTime, lastAutoToggleUpdate, lastAutoToggleAction).shouldDisable;
}

function formatBoundaryLog(boundaryDetail, label) {
  if (!boundaryDetail) {
    return `${label}: none`;
  }

  const sourceLabel = boundaryDetail.source === 'parsed_timeGMT'
    ? 'parsed timeGMT'
    : `fallback ${boundaryDetail.fallbackBaseTime}`;

  return `${label}: ${boundaryDetail.boundary.toISOString()} | day=${boundaryDetail.date} | source=${sourceLabel} | matches=${boundaryDetail.matchCount} | buffer=${boundaryDetail.bufferMinutes}m`;
}

function logLeagueDecision({
  league,
  decision,
  currentFlexibleState,
  currentBenchState,
  currentPpActivationState,
  managesPowerplayActivation,
  lastAutoToggleAction,
  lastAutoToggleUpdate
}) {
  const headline = `League ${league.id} (${league.name})`;
  console.log('\n========================');
  console.log(`[Automator] ${headline}`);
  console.log(`Decision: ${decision.reason} | shouldDisable=${decision.shouldDisable}`);
  console.log(`Boundaries reached: ${decision.reachedCount}/${decision.totalBoundaries}`);
  console.log(formatBoundaryLog(decision.latestReachedBoundary, 'Latest reached'));
  console.log(formatBoundaryLog(decision.nextBoundary, 'Next'));
  console.log(
    `Current state: transfers(flexible=${currentFlexibleState}, bench=${currentBenchState})` +
    `${managesPowerplayActivation ? ` | ppActivation=${currentPpActivationState}` : ' | ppActivation=not_managed'}`
  );
  console.log(
    `Last auto update: action=${lastAutoToggleAction || 'none'} | at=${
      lastAutoToggleUpdate instanceof Date ? lastAutoToggleUpdate.toISOString() : 'none'
    }`
  );
  console.log('========================');
}

function convertTimestamps(data) {
  if (data === null || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => convertTimestamps(item));
  }

  const converted = { ...data };
  Object.keys(converted).forEach(key => {
    const value = converted[key];
    if (value && typeof value === 'object' && typeof value.toDate === 'function' && '_seconds' in value) {
      converted[key] = value.toDate();
    } else if (typeof value === 'object') {
      converted[key] = convertTimestamps(value);
    }
  });

  return converted;
}

async function getFirebaseDb() {
  if (firestoreDb) {
    return firestoreDb;
  }

  const errors = [];

  if (!process.env.FIREBASE_PROJECT_ID) {
    errors.push('FIREBASE_PROJECT_ID is not set');
  }
  if (!process.env.FIREBASE_CLIENT_EMAIL) {
    errors.push('FIREBASE_CLIENT_EMAIL is not set');
  }
  if (!process.env.FIREBASE_PRIVATE_KEY) {
    errors.push('FIREBASE_PRIVATE_KEY is not set');
  }

  if (errors.length > 0) {
    throw new Error(`Missing environment variables: ${errors.join(', ')}`);
  }

  const { initializeApp, cert, getApps } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  if (getApps().length === 0) {
    console.log('Initializing Firebase Admin...');
    firebaseAdminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    firebaseAdminApp = getApps()[0];
  }

  firestoreDb = getFirestore(firebaseAdminApp);
  console.log('Firebase Admin initialized successfully');

  return firestoreDb;
}

export default async function handler(req, res) {
  try {
    const authHeader = req.headers['authorization'];
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
      return res.status(500).json({
        error: 'Server configuration error',
        details: 'CRON_SECRET not set',
        timestamp: new Date().toISOString()
      });
    }

    if (authHeader !== expectedAuth) {
      return res.status(401).json({
        error: 'Unauthorized',
        timestamp: new Date().toISOString()
      });
    }

    console.log('Transfer Toggle Automator: Starting...');
    const currentTime = new Date();
    console.log(`Current time: ${currentTime.toISOString()}`);

    let db;

    try {
      db = await getFirebaseDb();
    } catch (initError) {
      return res.status(500).json({
        error: 'Firebase initialization failed',
        details: initError.message || 'Unknown error',
        timestamp: currentTime.toISOString()
      });
    }

    const { Timestamp } = await import('firebase-admin/firestore');
    const leaguesSnapshot = await db.collection('leagues')
      .where('status', 'in', ['squad_selection', 'active'])
      .get();

    const leagues = leaguesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    }));

    console.log(`Found ${leagues.length} active leagues`);

    const results = [];

    for (const league of leagues) {
      try {
        if (league.autoToggleEnabled === false) {
          console.log(`League ${league.id} (${league.name}): Automation disabled, skipping`);
          results.push({
            leagueId: league.id,
            name: league.name,
            status: 'skipped',
            reason: 'automation_disabled'
          });
          continue;
        }

        if (!league.matchSchedule || league.matchSchedule.length === 0) {
          console.log(`League ${league.id} (${league.name}): No schedule, skipping`);
          results.push({
            leagueId: league.id,
            name: league.name,
            status: 'skipped',
            reason: 'no_schedule'
          });
          continue;
        }

        const decision = evaluateDisableDecision(
          league.matchSchedule,
          currentTime,
          league.lastAutoToggleUpdate,
          league.lastAutoToggleAction
        );
        const shouldDisable = decision.shouldDisable;
        const currentFlexibleState = league.flexibleChangesEnabled || false;
        const currentBenchState = league.benchChangesEnabled || false;
        const managesPowerplayActivation = league.powerplayEnabled && (league.ppMatchMode ?? 'fixed') === 'activation';
        const currentPpActivationState = league.ppActivationEnabled || false;

        const needsTransferUpdate =
          shouldDisable &&
          (currentFlexibleState || currentBenchState);
        const needsPpActivationUpdate =
          shouldDisable &&
          managesPowerplayActivation &&
          currentPpActivationState;

        logLeagueDecision({
          league,
          decision,
          currentFlexibleState,
          currentBenchState,
          currentPpActivationState,
          managesPowerplayActivation,
          lastAutoToggleAction: league.lastAutoToggleAction,
          lastAutoToggleUpdate: league.lastAutoToggleUpdate
        });

        if (!needsTransferUpdate && !needsPpActivationUpdate) {
          console.log('Action: no_change (nothing to disable right now)');
          results.push({
            leagueId: league.id,
            name: league.name,
            status: 'no_change',
            shouldDisable,
            currentFlexibleState,
            currentBenchState,
            currentPpActivationState,
            managesPowerplayActivation
          });
          continue;
        }

        console.log('Action: update (auto-disable toggles)');

        const updatePayload = {
          flexibleChangesEnabled: false,
          benchChangesEnabled: false,
          lastAutoToggleUpdate: Timestamp.now(),
          lastAutoToggleAction: 'disabled'
        };

        if (managesPowerplayActivation) {
          updatePayload.ppActivationEnabled = false;
        }

        console.log(
          `Update payload: transfers ${currentFlexibleState}/${currentBenchState} -> false` +
          (managesPowerplayActivation ? ` | ppActivation ${currentPpActivationState} -> false` : '')
        );

        await db.collection('leagues').doc(league.id).update(updatePayload);

        console.log('Result: updated successfully');
        results.push({
          leagueId: league.id,
          name: league.name,
          status: 'updated',
          from: {
            flexibleChangesEnabled: currentFlexibleState,
            benchChangesEnabled: currentBenchState,
            ...(managesPowerplayActivation ? { ppActivationEnabled: currentPpActivationState } : {})
          },
          to: {
            flexibleChangesEnabled: false,
            benchChangesEnabled: false,
            ...(managesPowerplayActivation ? { ppActivationEnabled: false } : {})
          },
          managesPowerplayActivation,
          timestamp: currentTime.toISOString()
        });

      } catch (error) {
        console.error(`Error processing league ${league.id}:`, error);
        results.push({
          leagueId: league.id,
          name: league.name || 'Unknown',
          status: 'error',
          error: error.message || 'Unknown error'
        });
      }
    }

    const summary = {
      totalLeagues: leagues.length,
      updated: results.filter(r => r.status === 'updated').length,
      noChange: results.filter(r => r.status === 'no_change').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length
    };

    console.log('Transfer Toggle Automator: Complete');
    console.log('Summary:', summary);

    return res.status(200).json({
      success: true,
      timestamp: currentTime.toISOString(),
      summary,
      results
    });

  } catch (error) {
    console.error('Fatal error in transfer toggle automator:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

export {
  parseMatchTime,
  getMatchDays,
  calculateDisableTime,
  getDisableBoundaryDetails,
  getDisableBoundaries,
  evaluateDisableDecision,
  shouldDisableNow
};
