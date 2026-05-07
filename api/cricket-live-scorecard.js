/**
 * Cricket Live Scorecard Cron
 * ----------------------------
 * Pulls live scores from cricketdata.org's free `currentMatches` API and
 * writes them to a single shared Firestore doc (`liveScorecard/current`)
 * which the React clients subscribe to via onSnapshot.
 *
 * Quota strategy (free tier = 100 hits/day):
 *  - The cron is invoked every 10 minutes by GitHub Actions.
 *  - This handler short-circuits with ZERO external API calls when the
 *    current time is outside any league's match window.
 *  - Match windows are derived from each league's existing `matchSchedule`
 *    (the same `ScheduleMatch[]` shape consumed by the transfer-toggle
 *    automator in `api/transfer-toggle-automator.js`).
 *  - Window for a given match day = [earliestStart - 5min, latestStart + 4h].
 *  - Daily safety cap (default 95) prevents overrun even if logic misbehaves.
 *
 * Auth: same `Bearer ${CRON_SECRET}` pattern as the transfer automator.
 */

let firebaseAdminApp = null;
let firestoreDb = null;

const WINDOW_PRE_BUFFER_MINUTES = 5;
const WINDOW_POST_BUFFER_HOURS = 4;
const DAILY_HIT_LIMIT = 95;
const SCORECARD_DOC_PATH = { collection: 'liveScorecard', docId: 'current' };

const CRICKETDATA_CURRENT_MATCHES_URL = 'https://api.cricapi.com/v1/currentMatches';

// ----------------------- Schedule / window logic -----------------------

function parseMatchTime(timeGMT, matchDate) {
  if (!timeGMT || typeof timeGMT !== 'string') return null;

  const cleanTime = timeGMT
    .replace(/\(GMT\)/gi, '')
    .replace(/\bGMT\b/gi, '')
    .trim();

  const twelveHourMatch = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHourMatch) {
    let hours = parseInt(twelveHourMatch[1], 10);
    const minutes = parseInt(twelveHourMatch[2], 10);
    const meridiem = twelveHourMatch[3].toUpperCase();

    if (meridiem === 'PM' && hours !== 12) hours += 12;
    else if (meridiem === 'AM' && hours === 12) hours = 0;

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

function utcDayKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function ordinal(n) {
  const v = n % 100;
  const s = ['th', 'st', 'nd', 'rd'];
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Group matches by UTC day and compute earliest/latest start times.
 * Falls back to 10:00 UTC (multi-match days) or 14:00 UTC (single-match days)
 * to mirror the transfer automator's fallback behaviour.
 */
function getMatchDays(schedule) {
  if (!schedule || schedule.length === 0) return [];

  const matchesByDate = new Map();
  schedule.forEach((match) => {
    const d = new Date(match.date);
    const key = utcDayKey(d);
    if (!matchesByDate.has(key)) matchesByDate.set(key, []);
    matchesByDate.get(key).push(match);
  });

  const matchDays = [];
  matchesByDate.forEach((matches, dateKey) => {
    const sorted = [...matches].sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));
    const parsedTimes = sorted
      .map((m) => parseMatchTime(m.timeGMT, m.date))
      .filter((t) => t !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    matchDays.push({
      date: dateKey,
      dateObject: new Date(sorted[0].date),
      matches: sorted,
      earliestStart: parsedTimes[0] || null,
      latestStart: parsedTimes[parsedTimes.length - 1] || null,
    });
  });

  matchDays.sort((a, b) => a.dateObject.getTime() - b.dateObject.getTime());
  return matchDays;
}

/**
 * For a single match-day, return the live window:
 *   start = earliestStart - 5min   (or fallback 10:00/14:00 UTC by match count)
 *   end   = latestStart + 4 hours  (or fallback start + 4 hours)
 */
function getMatchWindowForDay(matchDay) {
  let start;
  let end;

  if (matchDay.earliestStart) {
    start = new Date(matchDay.earliestStart);
    start.setMinutes(start.getMinutes() - WINDOW_PRE_BUFFER_MINUTES);
    const lastStart = matchDay.latestStart || matchDay.earliestStart;
    end = new Date(lastStart);
    end.setHours(end.getHours() + WINDOW_POST_BUFFER_HOURS);
  } else {
    const hasMultiple = matchDay.matches.length >= 2;
    start = new Date(matchDay.dateObject);
    start.setUTCHours(hasMultiple ? 10 : 14, 0, 0, 0);
    start.setMinutes(start.getMinutes() - WINDOW_PRE_BUFFER_MINUTES);
    end = new Date(start);
    end.setHours(end.getHours() + WINDOW_POST_BUFFER_HOURS + (hasMultiple ? 4 : 0));
    // Multi-match days get an extra 4h cushion to cover the second match.
  }

  return { start, end };
}

/**
 * Returns true if `now` falls inside ANY league's match window today (UTC).
 * Also returns the matched window for logging.
 */
function isWithinAnyMatchWindow(allSchedules, now) {
  for (const schedule of allSchedules) {
    const days = getMatchDays(schedule);
    for (const day of days) {
      const { start, end } = getMatchWindowForDay(day);
      if (now.getTime() >= start.getTime() && now.getTime() <= end.getTime()) {
        return { active: true, windowStart: start, windowEnd: end, day: day.date };
      }
    }
  }
  return { active: false };
}

// ----------------------- Team-name matching -----------------------

/**
 * Common short-form / alias map for team-name normalization.
 * Both the schedule and the API response are normalized through this
 * before comparison, so either side can use either form.
 */
const TEAM_ALIASES = {
  'csk': ['chennai super kings'],
  'mi': ['mumbai indians'],
  'rcb': ['royal challengers bengaluru', 'royal challengers bangalore'],
  'kkr': ['kolkata knight riders'],
  'dc': ['delhi capitals'],
  'rr': ['rajasthan royals'],
  'pbks': ['punjab kings', 'kxip', 'kings xi punjab'],
  'gt': ['gujarat titans'],
  'lsg': ['lucknow super giants'],
  'srh': ['sunrisers hyderabad'],
};

function normalizeTeamName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

/** Build a Set of all canonical (normalized) names a team might be known by. */
function teamAliasSet(name) {
  const normalized = normalizeTeamName(name);
  const set = new Set([normalized]);

  for (const [shortForm, fullNames] of Object.entries(TEAM_ALIASES)) {
    const shortNorm = normalizeTeamName(shortForm);
    const fullNorms = fullNames.map(normalizeTeamName);

    if (normalized === shortNorm || fullNorms.includes(normalized)) {
      set.add(shortNorm);
      fullNorms.forEach((n) => set.add(n));
    }
  }

  return set;
}

function teamsMatch(scheduleTeam, apiTeam) {
  const a = teamAliasSet(scheduleTeam);
  const b = teamAliasSet(apiTeam);
  for (const x of a) if (b.has(x)) return true;
  return false;
}

/**
 * Collect a deduped list of fixtures from all league schedules whose UTC date
 * falls within the given lookback / lookahead window around `now`.
 *
 * - lookbackDays=1 + lookaheadDays=0 → yesterday + today (default: covers the
 *   common case where the API hasn't yet ingested tonight's match but we still
 *   want yesterday's result on screen).
 */
function collectScheduledFixtures(allSchedules, now, lookbackDays = 1, lookaheadDays = 0) {
  const fixtures = [];
  const seen = new Set();

  // Use UTC-day boundaries directly so lookback=0 → today only, regardless of
  // the time-of-day of `now`.
  const startKey = utcDayKey(new Date(now.getTime() - lookbackDays * 86_400_000));
  const endKey = utcDayKey(new Date(now.getTime() + lookaheadDays * 86_400_000));

  for (const schedule of allSchedules) {
    for (const m of schedule) {
      const d = new Date(m.date);
      const key = utcDayKey(d);
      if (key < startKey || key > endKey) continue;
      const dedupeKey = `${normalizeTeamName(m.team1)}|${normalizeTeamName(m.team2)}|${key}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      fixtures.push({
        team1: m.team1,
        team2: m.team2,
        dateKey: key,
        date: d,
        timeGMT: m.timeGMT || '',
        matchNumber: m.matchNumber || null,
        tournamentName: m.tournamentName || '',
      });
    }
  }

  return fixtures;
}

/**
 * Filter API matches down to ones whose team-pair appears in `fixtures` on
 * the SAME UTC date as the match's `dateTimeGMT`.
 */
function filterMatchesByLeagueSchedules(apiMatches, allSchedules, now, lookbackDays = 1) {
  const fixtures = collectScheduledFixtures(allSchedules, now, lookbackDays, 0);
  if (fixtures.length === 0) return [];

  return (apiMatches || []).filter((apiMatch) => {
    const teams = Array.isArray(apiMatch.teams) ? apiMatch.teams : [];
    if (teams.length < 2) return false;

    const apiDate = apiMatch.dateTimeGMT ? new Date(apiMatch.dateTimeGMT) : null;
    const apiDateKey = apiDate ? utcDayKey(apiDate) : null;

    return fixtures.some((fx) => {
      if (apiDateKey && apiDateKey !== fx.dateKey) return false;
      const t1Match = teamsMatch(fx.team1, teams[0]) || teamsMatch(fx.team1, teams[1]);
      const t2Match = teamsMatch(fx.team2, teams[0]) || teamsMatch(fx.team2, teams[1]);
      return t1Match && t2Match;
    });
  });
}

/**
 * Build a synthetic "upcoming" placeholder card for today's scheduled fixture
 * when the API doesn't have it yet. Returns null if the fixture is already
 * present in `existingShapedMatches` or if no fixture is scheduled today.
 */
function buildUpcomingPlaceholders(allSchedules, now, existingShapedMatches) {
  const todayKey = utcDayKey(now);
  const todayFixtures = collectScheduledFixtures(allSchedules, now, 0, 0).filter(
    (fx) => fx.dateKey === todayKey
  );
  if (todayFixtures.length === 0) return [];

  const placeholders = [];
  for (const fx of todayFixtures) {
    const alreadyHave = existingShapedMatches.some((m) => {
      const t = m.teams || [];
      if (t.length < 2) return false;
      const apiDateKey = m.dateTimeGMT ? utcDayKey(new Date(m.dateTimeGMT)) : null;
      if (apiDateKey && apiDateKey !== fx.dateKey) return false;
      const t1 = teamsMatch(fx.team1, t[0].name) || teamsMatch(fx.team1, t[1].name);
      const t2 = teamsMatch(fx.team2, t[0].name) || teamsMatch(fx.team2, t[1].name);
      return t1 && t2;
    });

    if (alreadyHave) continue;

    // Compute a dateTimeGMT from the parsed timeGMT if possible; otherwise null.
    let dt = null;
    const parsed = parseMatchTime(fx.timeGMT, fx.date);
    if (parsed) dt = parsed.toISOString().replace(/\.\d{3}Z$/, '');

    const matchNumStr = fx.matchNumber ? `${ordinal(fx.matchNumber)} Match` : '';
    const nameParts = [`${fx.team1} vs ${fx.team2}`, matchNumStr, fx.tournamentName].filter(Boolean);

    placeholders.push({
      id: `placeholder-${normalizeTeamName(fx.team1)}-${normalizeTeamName(fx.team2)}-${fx.dateKey}`,
      name: nameParts.join(', '),
      matchType: '',
      status: 'Match yet to begin',
      venue: '',
      dateTimeGMT: dt,
      matchStarted: false,
      matchEnded: false,
      teams: [
        { name: fx.team1, shortName: null, img: null },
        { name: fx.team2, shortName: null, img: null },
      ],
      score: [],
    });
  }

  return placeholders;
}

/**
 * Sort matches in display priority: live > today's upcoming > today's completed
 * > older completed (most recent first within a tier).
 */
function sortMatchesForDisplay(matches, now) {
  const todayKey = utcDayKey(now);

  function tier(m) {
    const apiDateKey = m.dateTimeGMT ? utcDayKey(new Date(m.dateTimeGMT)) : null;
    if (m.matchStarted && !m.matchEnded) return 0; // live
    if (apiDateKey === todayKey && !m.matchStarted) return 1; // today upcoming
    if (apiDateKey === todayKey && m.matchEnded) return 2; // today completed
    return 3; // older
  }

  return [...matches].sort((a, b) => {
    const ta = tier(a);
    const tb = tier(b);
    if (ta !== tb) return ta - tb;
    // Within a tier, more recent first (descending dateTimeGMT)
    const da = a.dateTimeGMT ? new Date(a.dateTimeGMT).getTime() : 0;
    const db = b.dateTimeGMT ? new Date(b.dateTimeGMT).getTime() : 0;
    return db - da;
  });
}

// ----------------------- Response shaping -----------------------

function shapeMatchForFirestore(apiMatch) {
  const teams = Array.isArray(apiMatch.teams) ? apiMatch.teams : [];
  const teamInfo = Array.isArray(apiMatch.teamInfo) ? apiMatch.teamInfo : [];

  const findInfo = (teamName) =>
    teamInfo.find((t) => normalizeTeamName(t.name) === normalizeTeamName(teamName)) || {};

  return {
    id: apiMatch.id || null,
    name: apiMatch.name || '',
    matchType: apiMatch.matchType || '',
    status: apiMatch.status || '',
    venue: apiMatch.venue || '',
    dateTimeGMT: apiMatch.dateTimeGMT || null,
    matchStarted: apiMatch.matchStarted === true,
    matchEnded: apiMatch.matchEnded === true,
    teams: teams.map((name) => {
      const info = findInfo(name);
      return {
        name,
        shortName: info.shortname || null,
        img: info.img || null,
      };
    }),
    score: Array.isArray(apiMatch.score)
      ? apiMatch.score.map((s) => ({
          inning: s.inning || '',
          r: typeof s.r === 'number' ? s.r : 0,
          w: typeof s.w === 'number' ? s.w : 0,
          o: typeof s.o === 'number' ? s.o : 0,
        }))
      : [],
  };
}

// ----------------------- Firestore plumbing (admin) -----------------------

function convertTimestamps(data) {
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map((item) => convertTimestamps(item));

  const converted = { ...data };
  Object.keys(converted).forEach((key) => {
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
  if (firestoreDb) return firestoreDb;

  const errors = [];
  if (!process.env.FIREBASE_PROJECT_ID) errors.push('FIREBASE_PROJECT_ID is not set');
  if (!process.env.FIREBASE_CLIENT_EMAIL) errors.push('FIREBASE_CLIENT_EMAIL is not set');
  if (!process.env.FIREBASE_PRIVATE_KEY) errors.push('FIREBASE_PRIVATE_KEY is not set');
  if (errors.length > 0) {
    throw new Error(`Missing environment variables: ${errors.join(', ')}`);
  }

  const { initializeApp, cert, getApps } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  if (getApps().length === 0) {
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
  return firestoreDb;
}

// ----------------------- Main handler -----------------------

export default async function handler(req, res) {
  try {
    const authHeader = req.headers['authorization'];
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
      return res.status(500).json({
        error: 'Server configuration error',
        details: 'CRON_SECRET not set',
        timestamp: new Date().toISOString(),
      });
    }

    if (authHeader !== expectedAuth) {
      return res.status(401).json({
        error: 'Unauthorized',
        timestamp: new Date().toISOString(),
      });
    }

    if (!process.env.CRICKET_API_KEY) {
      return res.status(500).json({
        error: 'Server configuration error',
        details: 'CRICKET_API_KEY not set',
        timestamp: new Date().toISOString(),
      });
    }

    console.log('Cricket Live Scorecard: Starting...');
    const now = new Date();
    const todayKey = utcDayKey(now);
    console.log(`Current time: ${now.toISOString()} (UTC day=${todayKey})`);

    let db;
    try {
      db = await getFirebaseDb();
    } catch (initError) {
      return res.status(500).json({
        error: 'Firebase initialization failed',
        details: initError.message || 'Unknown error',
        timestamp: now.toISOString(),
      });
    }

    const { Timestamp } = await import('firebase-admin/firestore');

    // Read existing scorecard doc for hit-counter / dedupe metadata
    const docRef = db.collection(SCORECARD_DOC_PATH.collection).doc(SCORECARD_DOC_PATH.docId);
    const existingSnap = await docRef.get();
    const existing = existingSnap.exists ? convertTimestamps(existingSnap.data()) : null;

    const existingHits = existing && existing.hitsDayKey === todayKey ? existing.hitsToday || 0 : 0;

    if (existingHits >= DAILY_HIT_LIMIT) {
      console.log(`Daily hit limit reached (${existingHits}/${DAILY_HIT_LIMIT}), skipping fetch`);
      return res.status(200).json({
        skipped: true,
        reason: 'daily_hit_limit_reached',
        hitsToday: existingHits,
        timestamp: now.toISOString(),
      });
    }

    // Pull every active league's schedule
    const leaguesSnapshot = await db
      .collection('leagues')
      .where('status', 'in', ['squad_selection', 'active'])
      .get();

    const allSchedules = [];
    leaguesSnapshot.docs.forEach((doc) => {
      const data = convertTimestamps(doc.data());
      if (Array.isArray(data.matchSchedule) && data.matchSchedule.length > 0) {
        const enriched = data.matchSchedule.map((m) => ({
          ...m,
          tournamentName: data.tournamentName || '',
        }));
        allSchedules.push(enriched);
      }
    });

    console.log(`Found ${leaguesSnapshot.size} active leagues, ${allSchedules.length} with schedules`);

    if (allSchedules.length === 0) {
      // Nothing to gate on; clear any stale matches but don't fetch.
      await docRef.set(
        {
          updatedAt: Timestamp.now(),
          matches: [],
          hitsToday: existingHits,
          hitsDayKey: todayKey,
          lastSkipReason: 'no_schedules',
          source: 'cricketdata.org',
        },
        { merge: true }
      );

      return res.status(200).json({
        skipped: true,
        reason: 'no_schedules',
        timestamp: now.toISOString(),
      });
    }

    const windowResult = isWithinAnyMatchWindow(allSchedules, now);

    // Prime once per day even outside the match window so the strip can show
    // yesterday's completed result and today's "upcoming" placeholder. This
    // costs 1 hit per day at most (idempotent: we check `lastPrimedDayKey`).
    const needsDailyPrime =
      !existing ||
      !Array.isArray(existing.matches) ||
      existing.lastPrimedDayKey !== todayKey;

    if (!windowResult.active && !needsDailyPrime) {
      console.log('Outside all match windows AND already primed today, skipping fetch (0 API hits)');
      await docRef.set(
        {
          updatedAt: Timestamp.now(),
          matches: existing && Array.isArray(existing.matches) ? existing.matches : [],
          hitsToday: existingHits,
          hitsDayKey: todayKey,
          lastSkipReason: 'outside_match_window_already_primed',
          source: 'cricketdata.org',
        },
        { merge: true }
      );

      return res.status(200).json({
        skipped: true,
        reason: 'outside_match_window_already_primed',
        hitsToday: existingHits,
        timestamp: now.toISOString(),
      });
    }

    if (!windowResult.active && needsDailyPrime) {
      console.log('Outside match window but daily prime needed (will use 1 hit)');
    }

    if (windowResult.active) {
      console.log(
        `Inside match window for day ${windowResult.day}: ` +
          `${windowResult.windowStart.toISOString()} -> ${windowResult.windowEnd.toISOString()}`
      );
    }

    // Fetch live matches
    const url = `${CRICKETDATA_CURRENT_MATCHES_URL}?apikey=${encodeURIComponent(process.env.CRICKET_API_KEY)}&offset=0`;
    let apiData;
    try {
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      apiData = await response.json();
    } catch (fetchErr) {
      console.error('Cricket API fetch failed:', fetchErr.message);
      return res.status(502).json({
        error: 'Cricket API fetch failed',
        details: fetchErr.message,
        timestamp: now.toISOString(),
      });
    }

    const newHitsToday = existingHits + 1;

    if (apiData && apiData.status && apiData.status !== 'success') {
      console.error('Cricket API returned non-success status:', apiData.status, apiData.reason || '');
      // Still bump the counter; the hit was consumed.
      await docRef.set(
        {
          updatedAt: Timestamp.now(),
          hitsToday: newHitsToday,
          hitsDayKey: todayKey,
          lastError: apiData.reason || apiData.status,
          source: 'cricketdata.org',
        },
        { merge: true }
      );
      return res.status(502).json({
        error: 'Cricket API returned error',
        details: apiData.reason || apiData.status,
        timestamp: now.toISOString(),
      });
    }

    const apiMatches = Array.isArray(apiData && apiData.data) ? apiData.data : [];
    console.log(`Cricket API returned ${apiMatches.length} matches`);

    // Filter to league fixtures within yesterday + today (UTC). This way
    // when today's match isn't yet in `currentMatches`, we still display
    // the most recent league result instead of an empty strip.
    const filtered = filterMatchesByLeagueSchedules(apiMatches, allSchedules, now, 1);
    console.log(`Filtered to ${filtered.length} matches matching league fixtures (yesterday+today)`);

    let shaped = filtered.map(shapeMatchForFirestore);

    // If today's scheduled fixture isn't in the API response yet, prepend
    // a synthetic "upcoming" placeholder so the user always sees today's
    // match on the strip (rather than just yesterday's result).
    const placeholders = buildUpcomingPlaceholders(allSchedules, now, shaped);
    if (placeholders.length > 0) {
      console.log(`Added ${placeholders.length} placeholder(s) for today's scheduled fixtures not yet in API`);
      shaped = shaped.concat(placeholders);
    }

    shaped = sortMatchesForDisplay(shaped, now);

    await docRef.set(
      {
        updatedAt: Timestamp.now(),
        matches: shaped,
        hitsToday: newHitsToday,
        hitsDayKey: todayKey,
        lastPrimedDayKey: todayKey,
        lastSkipReason: null,
        lastError: null,
        source: 'cricketdata.org',
        windowDay: windowResult.active ? windowResult.day : null,
      },
      { merge: true }
    );

    return res.status(200).json({
      ok: true,
      matches: shaped.length,
      placeholders: placeholders.length,
      hitsToday: newHitsToday,
      windowDay: windowResult.active ? windowResult.day : null,
      withinWindow: windowResult.active,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    console.error('Cricket Live Scorecard handler error:', err);
    return res.status(500).json({
      error: 'Handler error',
      details: err && err.message ? err.message : String(err),
      timestamp: new Date().toISOString(),
    });
  }
}

// Exports for unit tests
export {
  parseMatchTime,
  getMatchDays,
  getMatchWindowForDay,
  isWithinAnyMatchWindow,
  normalizeTeamName,
  teamsMatch,
  collectScheduledFixtures,
  filterMatchesByLeagueSchedules,
  buildUpcomingPlaceholders,
  sortMatchesForDisplay,
  shapeMatchForFirestore,
};
