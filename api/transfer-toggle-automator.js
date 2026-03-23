let firebaseAdminApp = null;
let firestoreDb = null;

function parseMatchTime(timeGMT, matchDate) {
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
    const sortedMatches = [...matches].sort((a, b) => {
      const timeA = parseMatchTime(a.timeGMT, a.date);
      const timeB = parseMatchTime(b.timeGMT, b.date);
      return timeA.getTime() - timeB.getTime();
    });

    const firstMatch = sortedMatches[0];
    const lastMatch = sortedMatches[sortedMatches.length - 1];

    matchDays.push({
      date: dateKey,
      dateObject: new Date(firstMatch.date),
      firstMatchTime: parseMatchTime(firstMatch.timeGMT, firstMatch.date),
      lastMatchTime: parseMatchTime(lastMatch.timeGMT, lastMatch.date),
      matches: sortedMatches
    });
  });

  matchDays.sort((a, b) => a.dateObject.getTime() - b.dateObject.getTime());
  return matchDays;
}

function calculateToggleStatus(schedule, currentTime) {
  const matchDays = getMatchDays(schedule);

  if (matchDays.length === 0) {
    return false;
  }

  const firstMatchDay = matchDays[0];
  const lastMatchDay = matchDays[matchDays.length - 1];

  const calculateEnableTime = (matchDay) => {
    const enableTime = new Date(matchDay.dateObject);
    enableTime.setUTCHours(19, 30, 0, 0);
    return enableTime;
  };

  const calculateDisableTime = (nextMatchDay) => {
    const disableTime = new Date(nextMatchDay.firstMatchTime);
    disableTime.setMinutes(disableTime.getMinutes() + 1);
    return disableTime;
  };

  const firstDayEnableTime = calculateEnableTime(firstMatchDay);
  if (currentTime < firstDayEnableTime) {
    return false;
  }

  const lastDayEnableTime = calculateEnableTime(lastMatchDay);
  if (currentTime >= lastDayEnableTime) {
    return false;
  }

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

        const desiredState = calculateToggleStatus(league.matchSchedule, currentTime);
        const currentFlexibleState = league.flexibleChangesEnabled || false;
        const currentBenchState = league.benchChangesEnabled || false;
        const managesPowerplayActivation = league.powerplayEnabled && (league.ppMatchMode ?? 'fixed') === 'activation';
        const currentPpActivationState = league.ppActivationEnabled || false;

        const needsTransferUpdate =
          currentFlexibleState !== desiredState ||
          currentBenchState !== desiredState;
        const needsPpActivationUpdate =
          managesPowerplayActivation &&
          currentPpActivationState !== desiredState;

        if (!needsTransferUpdate && !needsPpActivationUpdate) {
          console.log(`League ${league.id} (${league.name}): Already in correct state (${desiredState})`);
          results.push({
            leagueId: league.id,
            name: league.name,
            status: 'no_change',
            currentFlexibleState,
            currentBenchState,
            currentPpActivationState,
            desiredState,
            managesPowerplayActivation
          });
          continue;
        }

        const updatePayload = {
          flexibleChangesEnabled: desiredState,
          benchChangesEnabled: desiredState,
          lastAutoToggleUpdate: Timestamp.now(),
          lastAutoToggleAction: desiredState ? 'enabled' : 'disabled'
        };

        if (managesPowerplayActivation) {
          updatePayload.ppActivationEnabled = desiredState;
        }

        console.log(
          `League ${league.id} (${league.name}): Updating transfers ${currentFlexibleState}/${currentBenchState} -> ${desiredState}` +
          (managesPowerplayActivation ? `, ppActivation ${currentPpActivationState} -> ${desiredState}` : '')
        );

        await db.collection('leagues').doc(league.id).update(updatePayload);

        console.log(`League ${league.id} (${league.name}): Updated successfully`);
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
            flexibleChangesEnabled: desiredState,
            benchChangesEnabled: desiredState,
            ...(managesPowerplayActivation ? { ppActivationEnabled: desiredState } : {})
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
