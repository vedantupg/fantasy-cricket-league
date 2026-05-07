import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { LiveScorecardDoc } from '../types/database';

const COLLECTION = 'liveScorecard';
const DOC_ID = 'current';

function convertScorecardDoc(data: any): LiveScorecardDoc {
  const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date();
  return {
    updatedAt,
    matches: Array.isArray(data.matches) ? data.matches : [],
    hitsToday: typeof data.hitsToday === 'number' ? data.hitsToday : undefined,
    hitsDayKey: typeof data.hitsDayKey === 'string' ? data.hitsDayKey : undefined,
    lastSkipReason: typeof data.lastSkipReason === 'string' ? data.lastSkipReason : null,
    lastError: typeof data.lastError === 'string' ? data.lastError : null,
    source: typeof data.source === 'string' ? data.source : undefined,
    windowDay: typeof data.windowDay === 'string' ? data.windowDay : undefined,
  };
}

/**
 * Subscribe to the shared live scorecard doc.
 * Returns the unsubscribe function from `onSnapshot`.
 *
 * The doc is updated by the server-side cron only — clients can only read.
 * If the doc doesn't exist yet (e.g., first deploy, no matches ever fetched),
 * the callback fires with `null`.
 */
export function subscribeLiveScorecard(
  callback: (scorecard: LiveScorecardDoc | null) => void
): () => void {
  const docRef = doc(db, COLLECTION, DOC_ID);

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback(convertScorecardDoc(snap.data()));
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('liveScorecard subscription error:', err);
      callback(null);
    }
  );
}
