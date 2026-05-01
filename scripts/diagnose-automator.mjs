import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const DISABLE_BUFFER_MINUTES = -5;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
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
  const cleanTime = timeGMT.replace(/\(GMT\)/gi, '').replace(/\bGMT\b/gi, '').trim();
  const t12 = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
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
  const t24 = cleanTime.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (t24) {
    const d = new Date(matchDate);
    d.setUTCHours(parseInt(t24[1], 10), parseInt(t24[2], 10), 0, 0);
    return d;
  }
  return null;
}

function getMatchDays(schedule) {
  if (!schedule || !schedule.length) return [];
  const map = new Map();
  schedule.forEach((m) => {
    const d = m.date?.toDate ? m.date.toDate() : new Date(m.date);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
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
      dateObject: sorted[0].date,
      firstParsedMatchTime: parsed[0] || null,
      matches: sorted,
    });
  });
  days.sort((a, b) => a.dateObject.getTime() - b.dateObject.getTime());
  return days;
}

function calcDisable(day) {
  if (day.firstParsedMatchTime) {
    const b = new Date(day.firstParsedMatchTime);
    b.setMinutes(b.getMinutes() + DISABLE_BUFFER_MINUTES);
    return { boundary: b, source: 'parsed_timeGMT' };
  }
  const b = new Date(day.dateObject);
  const multi = day.matches.length >= 2;
  b.setUTCHours(multi ? 10 : 14, 0, 0, 0);
  b.setMinutes(b.getMinutes() + DISABLE_BUFFER_MINUTES);
  return { boundary: b, source: multi ? 'fallback_10:00' : 'fallback_14:00' };
}

function getBoundaries(schedule) {
  return getMatchDays(schedule)
    .map((d) => ({ date: d.date, matches: d.matches.length, ...calcDisable(d) }))
    .sort((a, b) => a.boundary.getTime() - b.boundary.getTime());
}

function evaluateDecision(schedule, now, lastUpdate, lastAction, togglesOn) {
  const boundaries = getBoundaries(schedule);
  const reached = boundaries.filter((b) => b.boundary.getTime() <= now.getTime());
  const next = boundaries.find((b) => b.boundary.getTime() > now.getTime()) || null;
  if (!reached.length) {
    return { shouldDisable: false, reason: 'no_boundary_reached_yet', latest: null, next, total: boundaries.length, reached: 0 };
  }
  const latest = reached[reached.length - 1];
  const alreadyProcessed = lastAction === 'disabled' && lastUpdate instanceof Date && lastUpdate.getTime() >= latest.boundary.getTime();
  if (alreadyProcessed && !togglesOn) {
    return { shouldDisable: false, reason: 'already_disabled_for_latest_boundary', latest, next, total: boundaries.length, reached: reached.length };
  }
  if (alreadyProcessed && togglesOn) {
    return { shouldDisable: true, reason: 'reopened_after_boundary_self_heal', latest, next, total: boundaries.length, reached: reached.length };
  }
  return { shouldDisable: true, reason: 'boundary_reached_and_not_yet_processed', latest, next, total: boundaries.length, reached: reached.length };
}

function fmt(d) {
  return d ? d.toISOString() : 'none';
}

async function main() {
  const projectId = requiredEnv('FIREBASE_PROJECT_ID');
  const clientEmail = requiredEnv('FIREBASE_CLIENT_EMAIL');
  const privateKey = normalizePrivateKey(requiredEnv('FIREBASE_PRIVATE_KEY'));

  if (getApps().length === 0) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  const db = getFirestore();

  const now = new Date();
  console.log(`\nAutomator diagnostic at: ${now.toISOString()}\n`);

  const snap = await db
    .collection('leagues')
    .where('status', 'in', ['squad_selection', 'active'])
    .get();

  console.log(`Active leagues fetched: ${snap.size}\n`);

  for (const doc of snap.docs) {
    const data = doc.data();
    const lastUpdate = data.lastAutoToggleUpdate?.toDate ? data.lastAutoToggleUpdate.toDate() : null;
    const lastAction = data.lastAutoToggleAction || null;
    const flexible = !!data.flexibleChangesEnabled;
    const bench = !!data.benchChangesEnabled;
    const ppEnabled = !!data.powerplayEnabled;
    const ppMode = data.ppMatchMode ?? 'fixed';
    const managesPp = ppEnabled && ppMode === 'activation';
    const ppActivation = !!data.ppActivationEnabled;
    const autoOn = data.autoToggleEnabled !== false;

    console.log('========================');
    console.log(`League ${doc.id} — ${data.name || 'unnamed'}`);
    console.log(`autoToggleEnabled=${autoOn} | scheduleCount=${(data.matchSchedule || []).length}`);
    console.log(`State: flexible=${flexible} | bench=${bench} | ppActivation=${ppActivation} (managed=${managesPp})`);
    console.log(`Last auto: action=${lastAction || 'none'} | at=${fmt(lastUpdate)}`);

    if (!autoOn) {
      console.log('-> SKIP (automation off)\n');
      continue;
    }
    if (!data.matchSchedule || !data.matchSchedule.length) {
      console.log('-> SKIP (no schedule)\n');
      continue;
    }

    const togglesOn = flexible || bench || (managesPp && ppActivation);
    const decision = evaluateDecision(data.matchSchedule, now, lastUpdate, lastAction, togglesOn);
    console.log(`Decision: ${decision.reason} | shouldDisable=${decision.shouldDisable}`);
    console.log(`Boundaries: ${decision.reached}/${decision.total}`);
    if (decision.latest) {
      console.log(`Latest reached: ${fmt(decision.latest.boundary)} | day=${decision.latest.date} | source=${decision.latest.source} | matches=${decision.latest.matches}`);
    } else {
      console.log('Latest reached: none');
    }
    if (decision.next) {
      console.log(`Next boundary:  ${fmt(decision.next.boundary)} | day=${decision.next.date} | source=${decision.next.source} | matches=${decision.next.matches}`);
    } else {
      console.log('Next boundary:  none');
    }

    // Surface anomalies
    const flags = [];
    if (decision.shouldDisable && (flexible || bench || (managesPp && ppActivation))) {
      flags.push('STUCK_ON_AFTER_DEADLINE');
    }
    if (!decision.shouldDisable && lastAction === 'disabled' && (flexible || bench)) {
      flags.push('FLAG_RE_OPENED_MANUALLY_OR_RACE');
    }
    if (lastUpdate && decision.latest && lastUpdate.getTime() < decision.latest.boundary.getTime() && lastAction === 'disabled') {
      flags.push('LAST_UPDATE_BEFORE_LATEST_BOUNDARY');
    }
    if (flags.length) {
      console.log(`!! Flags: ${flags.join(', ')}`);
    }
    console.log('');
  }
}

main().catch((e) => {
  console.error('Diagnostic failed:', e.message || e);
  process.exit(1);
});
