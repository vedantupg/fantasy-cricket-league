/**
 * Writes public/firebase-messaging-sw.js from the template using REACT_APP_FIREBASE_*
 * from the environment (.env.local / .env loaded manually so this works outside react-scripts).
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadDotEnvFiles() {
  for (const name of ['.env.local', '.env']) {
    const p = join(root, name);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      val = val.replace(/\\n/g, '\n');
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

loadDotEnvFiles();

const keys = {
  __FIREBASE_API_KEY__: 'REACT_APP_FIREBASE_API_KEY',
  __FIREBASE_AUTH_DOMAIN__: 'REACT_APP_FIREBASE_AUTH_DOMAIN',
  __FIREBASE_PROJECT_ID__: 'REACT_APP_FIREBASE_PROJECT_ID',
  __FIREBASE_STORAGE_BUCKET__: 'REACT_APP_FIREBASE_STORAGE_BUCKET',
  __FIREBASE_MESSAGING_SENDER_ID__: 'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  __FIREBASE_APP_ID__: 'REACT_APP_FIREBASE_APP_ID',
};

for (const envName of Object.values(keys)) {
  if (!process.env[envName]) {
    console.error(
      `Missing ${envName}. Copy .env.example to .env (or .env.local) and set Firebase Web App values.`,
    );
    process.exit(1);
  }
}

const templatePath = join(root, 'public', 'firebase-messaging-sw.template.js');
const outPath = join(root, 'public', 'firebase-messaging-sw.js');
let tpl = readFileSync(templatePath, 'utf8');

for (const [placeholder, envName] of Object.entries(keys)) {
  tpl = tpl.split(placeholder).join(process.env[envName]);
}

writeFileSync(outPath, tpl);
console.log('Wrote public/firebase-messaging-sw.js');
