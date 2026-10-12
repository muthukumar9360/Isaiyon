import admin from 'firebase-admin';
import fs from 'node:fs';

const DEFAULT_ADMIN_EMAIL = 'perumpatayans@gmail.com';
let isFirebaseInitialized = false;

export function initializeFirebaseAdmin() {
  if (isFirebaseInitialized || admin.apps.length > 0) {
    isFirebaseInitialized = true;
    return admin;
  }

  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (serviceAccountJson && serviceAccountJson.trim()) {
      const parsed = JSON.parse(serviceAccountJson.trim());
      admin.initializeApp({
        credential: admin.credential.cert(parsed)
      });
      console.log('[FirebaseAdmin] Initialized via FIREBASE_SERVICE_ACCOUNT_JSON');
    } else if (credPath && fs.existsSync(credPath)) {
      admin.initializeApp({
        credential: admin.credential.cert(credPath)
      });
      console.log(`[FirebaseAdmin] Initialized via credentials file: ${credPath}`);
    } else {
      // Fallback: initialize with project ID for token verification
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'music-player-d0eb8'
      });
      console.log('[FirebaseAdmin] Initialized with default projectId');
    }

    isFirebaseInitialized = true;
  } catch (err) {
    console.warn(`[FirebaseAdmin] Initialization warning: ${err.message}`);
  }

  return admin;
}

export async function requireAdmin(req, res, next) {
  // Allow development bypass only if explicitly enabled
  if (process.env.DISABLE_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
    console.warn('[requireAdmin] Auth bypassed due to DISABLE_AUTH=true in non-production.');
    req.user = { email: DEFAULT_ADMIN_EMAIL };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing Firebase ID token in Authorization header (Bearer <token>).'
    });
  }

  const idToken = authHeader.split('Bearer ')[1].trim();

  try {
    initializeFirebaseAdmin();
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;

    const adminEmail = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).toLowerCase().trim();
    const userEmail = (decodedToken.email || '').toLowerCase().trim();

    if (userEmail !== adminEmail) {
      return res.status(403).json({
        error: `Forbidden: User (${userEmail}) is not authorized to perform admin actions.`
      });
    }

    next();
  } catch (err) {
    console.warn('[requireAdmin] Token verification failed:', err.message);
    return res.status(401).json({
      error: `Invalid or expired authorization token: ${err.message}`
    });
  }
}

export default requireAdmin;
