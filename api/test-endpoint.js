export default async function handler(req, res) {
  return res.status(200).json({
    success: true,
    message: 'API endpoint is working!',
    timestamp: new Date().toISOString(),
    envVarsPresent: {
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      CRON_SECRET: !!process.env.CRON_SECRET,
    },
    nodeVersion: process.version
  });
}
