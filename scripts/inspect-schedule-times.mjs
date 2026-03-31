import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function normalizeDate(rawDate) {
  if (!rawDate) return null;
  if (typeof rawDate?.toDate === 'function') {
    return rawDate.toDate();
  }
  const asDate = new Date(rawDate);
  return Number.isNaN(asDate.getTime()) ? null : asDate;
}

function parseArgs(argv) {
  const args = { leagueId: null, limit: 10 };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--leagueId' && argv[i + 1]) {
      args.leagueId = argv[i + 1];
      i += 1;
    } else if (token === '--limit' && argv[i + 1]) {
      const parsed = parseInt(argv[i + 1], 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        args.limit = parsed;
      }
      i += 1;
    }
  }
  return args;
}

async function main() {
  const projectId = requiredEnv('FIREBASE_PROJECT_ID');
  const clientEmail = requiredEnv('FIREBASE_CLIENT_EMAIL');
  const privateKey = requiredEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n');
  const { leagueId, limit } = parseArgs(process.argv.slice(2));

  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
  }

  const db = getFirestore();
  let docs = [];

  if (leagueId) {
    const doc = await db.collection('leagues').doc(leagueId).get();
    if (!doc.exists) {
      throw new Error(`League not found: ${leagueId}`);
    }
    docs = [doc];
  } else {
    const snap = await db.collection('leagues').limit(limit).get();
    docs = snap.docs;
  }

  console.log(`Leagues fetched: ${docs.length}`);

  for (const doc of docs) {
    const data = doc.data() || {};
    const schedule = Array.isArray(data.matchSchedule) ? data.matchSchedule : [];

    console.log('\n=== League ===');
    console.log(`id: ${doc.id}`);
    console.log(`name: ${data.name || 'Unknown'}`);
    console.log(`schedule_count: ${schedule.length}`);

    for (let i = 0; i < Math.min(10, schedule.length); i++) {
      const m = schedule[i];
      const normalizedDate = normalizeDate(m.date);
      const localRendered = normalizedDate
        ? normalizedDate.toLocaleString('en-US', { timeZoneName: 'short' })
        : 'Invalid Date';

      console.log(`  match_${i + 1}:`);
      console.log(`    description: ${m.description || ''}`);
      console.log(`    timeGMT: ${JSON.stringify(m.timeGMT ?? null)}`);
      console.log(`    timeLocal: ${JSON.stringify(m.timeLocal ?? null)}`);
      console.log(`    date_raw_type: ${m.date?.constructor?.name || typeof m.date}`);
      console.log(`    date_iso_utc: ${normalizedDate ? normalizedDate.toISOString() : 'Invalid Date'}`);
      console.log(`    date_local_rendered: ${localRendered}`);
      console.log(`    timezone_offset_min: ${normalizedDate ? normalizedDate.getTimezoneOffset() : 'n/a'}`);
    }
  }
}

main().catch((error) => {
  console.error('Failed to inspect schedule times:', error.message || error);
  process.exit(1);
});
