// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Integration tests import firestore, which loads firebase.ts; provide dummy config in test only.
if (process.env.NODE_ENV === 'test') {
  const placeholders: Record<string, string> = {
    REACT_APP_FIREBASE_API_KEY: 'test-firebase-api-key',
    REACT_APP_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
    REACT_APP_FIREBASE_PROJECT_ID: 'test-project',
    REACT_APP_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
    REACT_APP_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
    REACT_APP_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000000000',
  };
  for (const [key, value] of Object.entries(placeholders)) {
    if (!process.env[key]) process.env[key] = value;
  }
}
