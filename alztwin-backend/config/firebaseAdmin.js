const admin = require('firebase-admin');
const logger = require('./logger');

let db;
let adminInstance;

try {
  adminInstance = admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  });

  db = admin.firestore();
  logger.info('✅ Firebase Admin initialized successfully');
} catch (error) {
  logger.error('❌ Firebase initialization failed:', error.message);
  throw new Error('Firebase Admin SDK initialization failed');
}

module.exports = {
  admin,
  db,
  adminInstance
};
