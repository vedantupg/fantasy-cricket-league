import { getToken, deleteToken } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY;

/**
 * Requests notification permission, retrieves the FCM token, and stores it in Firestore.
 * Idempotent — safe to call on every login; silently updates the token if already granted.
 */
export async function requestNotificationPermission(userId: string): Promise<void> {
  if (!('Notification' in window)) return;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  // Dynamically import messaging to avoid SSR / unsupported-env crashes
  const { messaging } = await import('./firebase');
  if (!messaging) return;
  if (!VAPID_KEY) {
    console.warn('[FCM] REACT_APP_FIREBASE_VAPID_KEY is not set — skipping token registration');
    return;
  }

  const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
  if (!token) return;

  await updateDoc(doc(db, 'users', userId), {
    fcmToken: token,
    notificationsEnabled: true,
  });
}

/**
 * Disables push notifications for the given user. Deletes the FCM token from the device
 * and sets notificationsEnabled = false in Firestore.
 */
export async function disableNotifications(userId: string): Promise<void> {
  const { messaging } = await import('./firebase');
  if (messaging) {
    try {
      await deleteToken(messaging);
    } catch {
      // Token may already be invalid — proceed to update Firestore regardless
    }
  }

  await updateDoc(doc(db, 'users', userId), {
    fcmToken: null,
    notificationsEnabled: false,
  });
}
