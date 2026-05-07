/**
 * One-off seed: invokes the same logic as `api/cricket-live-scorecard.js`
 * locally, against your real Firestore + cricketdata.org. Useful for verifying
 * the React UI shows the strip on `npm start` without waiting for Vercel + cron.
 *
 * Usage (from project root):
 *   node --env-file=.env.local scripts/seed-live-scorecard.mjs
 *
 * Flags:
 *   --force-window   Bypass the match-window gate (always fetch). Useful when
 *                    you want to populate the doc outside the IPL kickoff time.
 *   --no-filter      Skip the league-schedule filter; write whatever the API
 *                    returns. Helpful for sanity checking when no IPL match is
 *                    in `currentMatches` right now.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const args = new Set(process.argv.slice(2));
const FORCE_WINDOW = args.has('--force-window');
const NO_FILTER = args.has('--no-filter');

const WINDOW_PRE_BUFFER_MINUTES = 5;
const WINDOW_POST_BUFFER_HOURS = 4;
const CRICKETDATA_URL = 'https://api.cricapi.com/v1/currentMatches';

function req(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function normalizePrivateKey(raw) {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/^------BEGIN/, '-----BEGIN')
    .replace(/^-----+BEGIN/, '-----BEGIN')
    .replace(/-----+END PRIVATE KEY-----/g, '-----END PRIVATE KEY-----');
}

function parseMatchTime(timeGMT, matchDate) {
  if (!timeGMT || typeof timeGMT !== 'string') return null;
  const clean = timeGMT.replace(/\(GMT\)/gi, '').replace(/\bGMT\b/gi, '').trim();
  const t12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (t12) {
    let h = parseInt(t12[1], 10);
    const m = parseInt(t12[2], 10);
    const mer = t12[3].toUpperCase();
    if (mer === 'PM' && h !== 12) h += 12;
    else if (mer === 'AM' && h === 12) h = 0;
    const d = new Date(matchDate);
    d.setUTCHours(h, m, 0, 0);
    return d;
  }
  const t24 = clean.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (t24) {
    const d = new Date(matchDate);
    d.setUTCHours(parseInt(t24[1], 10), parseInt(t24[2], 10), 0, 0);
    return d;
  }
  return null;
}

function utcDayKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function getMatchDays(schedule) {
  if (!schedule || !schedule.length) return [];
  const map = new Map();
  schedule.forEach((m) => {
    const d = m.date?.toDate ? m.date.toDate() : new Date(m.date);
    const key = utcDayKey(d);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({ ...m, date: d });
  });
  const days = [];
  map.forEach((matches, dateKey) => {
    const sorted = [...matches].sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));
    const parsed = sorted
      .map((m) => parseMatchTime(m.timeGMT, m.date))
      .filter(Boolean)
      .sort((a, b) => a.getTime() - b.getTime());
    days.push({
      date: dateKey,
      dateObject: new Date(sorted[0].date),
      matches: sorted,
      earliestStart: parsed[0] || null,
      latestStart: parsed[parsed.length - 1] || null,
    });
  });
  days.sort((a, b) => a.dateObject.getTime() - b.dateObject.getTime());
  return days;
}

function getMatchWindowForDay(day) {
  let start;
  let end;
  if (day.earliestStart) {
    start = new Date(day.earliestStart);
    start.setMinutes(start.getMinutes() - WINDOW_PRE_BUFFER_MINUTES);
    const last = day.latestStart || day.earliestStart;
    end = new Date(last);
    end.setHours(end.getHours() + WINDOW_POST_BUFFER_HOURS);
  } else {
    const multi = day.matches.length >= 2;
    start = new Date(day.dateObject);
    start.setUTCHours(multi ? 10 : 14, 0, 0, 0);
    start.setMinutes(start.getMinutes() - WINDOW_PRE_BUFFER_MINUTES);
    end = new Date(start);
    end.setHours(end.getHours() + WINDOW_POST_BUFFER_HOURS + (multi ? 4 : 0));
  }
  return { start, end };
}

function isWithinAnyMatchWindow(allSchedules, now) {
  for (const schedule of allSchedules) {
    for (const day of getMatchDays(schedule)) {
      const { start, end } = getMatchWindowForDay(day);
      if (now.getTime() >= start.getTime() && now.getTime() <= end.getTime()) {
        return { active: true, windowStart: start, windowEnd: end, day: day.date };
      }
    }
  }
  return { active: false };
}

const TEAM_ALIASES = {
  csk: ['chennai super kings'],
  mi: ['mumbai indians'],
  rcb: ['royal challengers bengaluru', 'royal challengers bangalore'],
  kkr: ['kolkata knight riders'],
  dc: ['delhi capitals'],
  rr: ['rajasthan royals'],
  pbks: ['punjab kings', 'kxip', 'kings xi punjab'],
  gt: ['gujarat titans'],
  lsg: ['lucknow super giants'],
  srh: ['sunrisers hyderabad'],
};

function normalizeTeamName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function teamAliasSet(name) {
  const n = normalizeTeamName(name);
  const set = new Set([n]);
  for (const [short, fulls] of Object.entries(TEAM_ALIASES)) {
    const sn = normalizeTeamName(short);
    const fns = fulls.map(normalizeTeamName);
    if (n === sn || fns.includes(n)) {
      set.add(sn);
      fns.forEach((x) => set.add(x));
    }
  }
  return set;
}

function teamsMatch(a, b) {
  const sa = teamAliasSet(a);
  const sb = teamAliasSet(b);
  for (const x of sa) if (sb.has(x)) return true;
  return false;
}

function collectScheduledFixtures(allSchedules, now, lookbackDays = 1, lookaheadDays = 0) {
  const fixtures = [];
  const seen = new Set();
  const startKey = utcDayKey(new Date(now.getTime() - lookbackDays * 86_400_000));
  const endKey = utcDayKey(new Date(now.getTime() + lookaheadDays * 86_400_000));
  for (const schedule of allSchedules) {
    for (const m of schedule) {
      const d = m.date?.toDate ? m.date.toDate() : new Date(m.date);
      const key = utcDayKey(d);
      if (key < startKey || key > endKey) continue;
      const dedupeKey = `${normalizeTeamName(m.team1)}|${normalizeTeamName(m.team2)}|${key}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      fixtures.push({ team1: m.team1, team2: m.team2, dateKey: key, date: d, timeGMT: m.timeGMT || '' });
    }
  }
  return fixtures;
}

function filterMatchesByLeagueSchedules(apiMatches, allSchedules, now, lookbackDays = 1) {
  const fixtures = collectScheduledFixtures(allSchedules, now, lookbackDays, 0);
  if (!fixtures.length) return [];
  return (apiMatches || []).filter((am) => {
    const teams = Array.isArray(am.teams) ? am.teams : [];
    if (teams.length < 2) return false;
    const ad = am.dateTimeGMT ? new Date(am.dateTimeGMT) : null;
    const adk = ad ? utcDayKey(ad) : null;
    return fixtures.some((fx) => {
      if (adk && adk !== fx.dateKey) return false;
      const t1 = teamsMatch(fx.team1, teams[0]) || teamsMatch(fx.team1, teams[1]);
      const t2 = teamsMatch(fx.team2, teams[0]) || teamsMatch(fx.team2, teams[1]);
      return t1 && t2;
    });
  });
}

function buildUpcomingPlaceholders(allSchedules, now, existingShapedMatches) {
  const todayKey = utcDayKey(now);
  const todayFixtures = collectScheduledFixtures(allSchedules, now, 0, 0).filter((fx) => fx.dateKey === todayKey);
  if (!todayFixtures.length) return [];
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
    let dt = null;
    const parsed = parseMatchTime(fx.timeGMT, fx.date);
    if (parsed) dt = parsed.toISOString().replace(/\.\d{3}Z$/, '');
    placeholders.push({
      id: `placeholder-${normalizeTeamName(fx.team1)}-${normalizeTeamName(fx.team2)}-${fx.dateKey}`,
      name: `${fx.team1} vs ${fx.team2}`,
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

function sortMatchesForDisplay(matches, now) {
  const todayKey = utcDayKey(now);
  function tier(m) {
    const apiDateKey = m.dateTimeGMT ? utcDayKey(new Date(m.dateTimeGMT)) : null;
    if (m.matchStarted && !m.matchEnded) return 0;
    if (apiDateKey === todayKey && !m.matchStarted) return 1;
    if (apiDateKey === todayKey && m.matchEnded) return 2;
    return 3;
  }
  return [...matches].sort((a, b) => {
    const ta = tier(a);
    const tb = tier(b);
    if (ta !== tb) return ta - tb;
    const da = a.dateTimeGMT ? new Date(a.dateTimeGMT).getTime() : 0;
    const db = b.dateTimeGMT ? new Date(b.dateTimeGMT).getTime() : 0;
    return db - da;
  });
}

function shapeMatchForFirestore(am) {
  const teams = Array.isArray(am.teams) ? am.teams : [];
  const teamInfo = Array.isArray(am.teamInfo) ? am.teamInfo : [];
  const findInfo = (name) =>
    teamInfo.find((t) => normalizeTeamName(t.name) === normalizeTeamName(name)) || {};
  return {
    id: am.id || null,
    name: am.name || '',
    matchType: am.matchType || '',
    status: am.status || '',
    venue: am.venue || '',
    dateTimeGMT: am.dateTimeGMT || null,
    matchStarted: am.matchStarted === true,
    matchEnded: am.matchEnded === true,
    teams: teams.map((name) => {
      const info = findInfo(name);
      return { name, shortName: info.shortname || null, img: info.img || null };
    }),
    score: Array.isArray(am.score)
      ? am.score.map((s) => ({
          inning: s.inning || '',
          r: typeof s.r === 'number' ? s.r : 0,
          w: typeof s.w === 'number' ? s.w : 0,
          o: typeof s.o === 'number' ? s.o : 0,
        }))
      : [],
  };
}

async function main() {
  console.log('--- seed-live-scorecard ---');
  console.log(`Flags: forceWindow=${FORCE_WINDOW} noFilter=${NO_FILTER}`);

  const projectId = req('FIREBASE_PROJECT_ID');
  const clientEmail = req('FIREBASE_CLIENT_EMAIL');
  const privateKey = normalizePrivateKey(req('FIREBASE_PRIVATE_KEY'));
  const cricketKey = req('CRICKET_API_KEY');

  if (!getApps().length) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  const db = getFirestore();

  const now = new Date();
  console.log(`Now: ${now.toISOString()} (UTC day=${utcDayKey(now)})`);

  // Load every active league's schedule
  const snapshot = await db
    .collection('leagues')
    .where('status', 'in', ['squad_selection', 'active'])
    .get();
  console.log(`Active leagues: ${snapshot.size}`);

  const allSchedules = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (Array.isArray(data.matchSchedule) && data.matchSchedule.length > 0) {
      allSchedules.push(data.matchSchedule);
    }
  });
  console.log(`Schedules with fixtures: ${allSchedules.length}`);

  if (!FORCE_WINDOW) {
    const win = isWithinAnyMatchWindow(allSchedules, now);
    if (!win.active) {
      console.log('Outside match window. Use --force-window to bypass.');
      // Find the next upcoming window for context
      const upcoming = allSchedules
        .flatMap(getMatchDays)
        .map((d) => ({ d, w: getMatchWindowForDay(d) }))
        .filter((x) => x.w.start.getTime() > now.getTime())
        .sort((a, b) => a.w.start.getTime() - b.w.start.getTime())[0];
      if (upcoming) {
        console.log(`Next window: ${upcoming.w.start.toISOString()} -> ${upcoming.w.end.toISOString()}`);
      }
      process.exit(0);
    }
    console.log(`Inside window for day ${win.day}: ${win.windowStart.toISOString()} -> ${win.windowEnd.toISOString()}`);
  } else {
    console.log('Window gate BYPASSED (--force-window).');
  }

  // Fetch
  const url = `${CRICKETDATA_URL}?apikey=${encodeURIComponent(cricketKey)}&offset=0`;
  console.log('Fetching cricketdata.org currentMatches...');
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`cricketdata.org HTTP ${res.status} ${res.statusText}`);
  }
  const apiData = await res.json();
  if (apiData?.status !== 'success') {
    throw new Error(`API non-success: ${apiData?.status} ${apiData?.reason || ''}`);
  }
  const apiMatches = Array.isArray(apiData.data) ? apiData.data : [];
  console.log(`API returned ${apiMatches.length} matches. Hits today: ${apiData.info?.hitsToday}/${apiData.info?.hitsLimit}`);

  let chosen;
  if (NO_FILTER) {
    console.log('Skipping league-schedule filter (--no-filter); using ALL matches.');
    chosen = apiMatches;
  } else {
    chosen = filterMatchesByLeagueSchedules(apiMatches, allSchedules, now, 1);
    console.log(`After filter to league fixtures (yesterday+today): ${chosen.length} matches.`);
  }

  let shaped = chosen.map(shapeMatchForFirestore);

  if (!NO_FILTER) {
    const placeholders = buildUpcomingPlaceholders(allSchedules, now, shaped);
    if (placeholders.length) {
      console.log(`Added ${placeholders.length} upcoming-placeholder card(s) for today's fixtures not yet in API.`);
      shaped = shaped.concat(placeholders);
    }
  }

  shaped = sortMatchesForDisplay(shaped, now);

  if (shaped.length) {
    console.log('\nMatches written:');
    shaped.forEach((m) => {
      const scoreStr = m.score.length
        ? m.score.map((s) => `${s.inning}: ${s.r}/${s.w} (${s.o})`).join(' | ')
        : 'no score yet';
      console.log(`  - ${m.name}`);
      console.log(`    started=${m.matchStarted} ended=${m.matchEnded} | ${m.status}`);
      console.log(`    ${scoreStr}`);
    });
  }

  const todayKey = utcDayKey(now);
  await db.collection('liveScorecard').doc('current').set(
    {
      updatedAt: Timestamp.now(),
      matches: shaped,
      hitsToday: (apiData.info?.hitsToday ?? 0),
      hitsDayKey: todayKey,
      lastSkipReason: null,
      lastError: null,
      source: 'cricketdata.org (seed script)',
      windowDay: todayKey,
    },
    { merge: true }
  );

  console.log(`\nWrote liveScorecard/current with ${shaped.length} matches.`);
  console.log('Refresh your browser at http://localhost:3000 — strip should appear (or stay hidden if 0 matches).');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
