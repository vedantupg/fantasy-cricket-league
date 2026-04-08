// Firebase Messaging Service Worker
// Required for background push notification delivery via FCM.
// This file is intentionally kept separate from sw.js because FCM requires
// its service worker to be registered at the root scope by the Firebase SDK.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAT7uu2q_ej91X3u9zNagCMYteUkckOOtc',
  authDomain: 'fantasy-cricket-league-2554c.firebaseapp.com',
  projectId: 'fantasy-cricket-league-2554c',
  storageBucket: 'fantasy-cricket-league-2554c.firebasestorage.app',
  messagingSenderId: '310912152259',
  appId: '1:310912152259:web:dba9c4b0e34e3665682876',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || '🏏 FCL';
  const body = payload.notification?.body || 'You have a new notification';

  self.registration.showNotification(title, {
    body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: payload.data,
  });
});
