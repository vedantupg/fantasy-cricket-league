let firebaseAdminApp = null;
let firestoreDb = null;
let fcmMessaging = null;

async function getFirebaseAdmin() {
  if (firestoreDb && fcmMessaging) {
    return { db: firestoreDb, messaging: fcmMessaging };
  }

  const errors = [];
  if (!process.env.FIREBASE_PROJECT_ID) errors.push('FIREBASE_PROJECT_ID');
  if (!process.env.FIREBASE_CLIENT_EMAIL) errors.push('FIREBASE_CLIENT_EMAIL');
  if (!process.env.FIREBASE_PRIVATE_KEY) errors.push('FIREBASE_PRIVATE_KEY');

  if (errors.length > 0) {
    throw new Error(`Missing environment variables: ${errors.join(', ')}`);
  }

  const { initializeApp, cert, getApps } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const { getMessaging } = await import('firebase-admin/messaging');

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
  fcmMessaging = getMessaging(firebaseAdminApp);

  return { db: firestoreDb, messaging: fcmMessaging };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check
  if (!process.env.CRON_SECRET) {
    return res.status(500).json({ error: 'Server configuration error', details: 'CRON_SECRET not set' });
  }
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { leagueId, leagueName, message } = req.body || {};

  if (!leagueName) {
    return res.status(400).json({ error: 'leagueName is required' });
  }

  let db, messaging;
  try {
    ({ db, messaging } = await getFirebaseAdmin());
  } catch (initError) {
    return res.status(500).json({ error: 'Firebase initialization failed', details: initError.message });
  }

  // Query all users with notifications enabled and a valid FCM token
  let usersQuery = db.collection('users')
    .where('notificationsEnabled', '==', true)
    .where('fcmToken', '!=', null);

  const usersSnapshot = await usersQuery.get();

  // Optionally filter by leagueId membership
  let tokens = [];
  const expiredTokenUsers = [];

  usersSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (!data.fcmToken) return;
    if (leagueId && Array.isArray(data.leagues) && !data.leagues.includes(leagueId)) return;
    tokens.push({ uid: doc.id, token: data.fcmToken });
  });

  if (tokens.length === 0) {
    return res.status(200).json({ success: true, sent: 0, message: 'No eligible recipients' });
  }

  const notificationTitle = '🏏 Leaderboard Updated';
  const notificationBody = message || `${leagueName} standings are live!`;

  // FCM multicast (up to 500 tokens per request)
  const BATCH_SIZE = 500;
  let totalSent = 0;
  let totalFailed = 0;

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    const multicastMessage = {
      tokens: batch.map(t => t.token),
      notification: {
        title: notificationTitle,
        body: notificationBody,
      },
      webpush: {
        notification: {
          icon: '/logo192.png',
          badge: '/logo192.png',
        },
      },
    };

    const response = await messaging.sendEachForMulticast(multicastMessage);

    totalSent += response.successCount;
    totalFailed += response.failureCount;

    // Clean up expired/invalid tokens
    response.responses.forEach((result, idx) => {
      if (!result.success) {
        const errCode = result.error?.code;
        if (
          errCode === 'messaging/registration-token-not-registered' ||
          errCode === 'messaging/invalid-registration-token'
        ) {
          expiredTokenUsers.push(batch[idx].uid);
        }
      }
    });
  }

  // Remove expired tokens from Firestore in parallel
  if (expiredTokenUsers.length > 0) {
    const { FieldValue } = await import('firebase-admin/firestore');
    await Promise.all(
      expiredTokenUsers.map(uid =>
        db.collection('users').doc(uid).update({
          fcmToken: FieldValue.delete(),
          notificationsEnabled: false,
        })
      )
    );
  }

  return res.status(200).json({
    success: true,
    sent: totalSent,
    failed: totalFailed,
    expiredTokensCleaned: expiredTokenUsers.length,
    timestamp: new Date().toISOString(),
  });
}
