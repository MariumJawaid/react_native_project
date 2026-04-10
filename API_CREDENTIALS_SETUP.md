# API Credentials & Setup Guide

## Part 1: Google Gemini API Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a Project"** → **"NEW PROJECT"**
3. Enter project name: `AlzTwin-Voice-Assessment`
4. Click **Create**

### Step 2: Enable Gemini API

1. In Cloud Console, search for **"Generative Language API"**
2. Click on it
3. Click **"ENABLE"**

### Step 3: Create API Key

1. In Cloud Console, go to **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"** → **"API Key"**
3. Copy the generated API key
4. Optionally, **Restrict** it:
   - Application restrictions: **HTTP referrers (web)**
   - API restrictions: **Generative Language API**

### Step 4: Add to Backend `.env`

```env
GEMINI_API_KEY=your_copied_api_key_here
```

### Step 5: Test in Terminal

```bash
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Explain quantum computing in one sentence"
          }
        ]
      }
    ]
  }'
```

Expected response with text generation.

---

## Part 2: Firebase Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter name: `alztwin-voice`
4. Disable Google Analytics (optional)
5. Click **Create project**

### Step 2: Create Firestore Database

1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click **"Create Database"**
3. Select **"Start in test mode"** (for development)
   - **Note**: Change to production rules before deploying!
4. Choose region closest to you: `us-central1`
5. Click **Enable**

### Step 3: Set Up Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click **"Get Started"**
3. Enable **Email/Password**:
   - Click on Email/Password
   - Enable it
   - Click **Save**

### Step 4: Get Firebase Admin SDK Credentials

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Click **"Service Accounts"** tab
3. Click **"Generate New Private Key"** button
4. A JSON file downloads - keep it secure!

### Step 5: Extract Credentials

Open the downloaded JSON file. It contains:

```json
{
  "type": "service_account",
  "project_id": "alztwin-voice",
  "private_key_id": "xyz123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkq...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@alztwin-voice.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

### Step 6: Add to Backend `.env`

```env
FIREBASE_PROJECT_ID=alztwin-voice
FIREBASE_PRIVATE_KEY_ID=xyz123...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkq...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@alztwin-voice.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789
```

**IMPORTANT**: The `FIREBASE_PRIVATE_KEY` must preserve newlines as `\n` (NOT actual line breaks).

### Step 7: Create Firestore Collections

#### Create `voiceAssessmentResults` Collection

1. In Firestore Database, click **"Start collection"**
2. Collection ID: `voiceAssessmentResults`
3. Auto-generate first document
4. This collection will store all voice-based assessment results

#### Create `users` Collection (if not exists)

Same process, but Firebase Auth should auto-create this.

---

## Part 3: Configure Firestore Security Rules

### Production Security Rules

**Go to Firestore → Rules tab and replace with:**

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow users to read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Allow users to write their own test results
    match /voiceAssessmentResults/{sessionId} {
      allow create: if request.auth.uid != null;
      allow read: if request.auth.uid == resource.data.patientId || 
                     request.auth.uid == resource.data.caregiverId;
      allow update, delete: if request.auth.uid == resource.data.patientId;
    }

    // Patient data - only accessible by patient or caregiver
    match /patients/{patientId} {
      allow read, write: if request.auth.uid == patientId;
    }

    // Caregiver relationships
    match /caregivers/{caregiverId} {
      allow read: if request.auth.uid == caregiverId;
    }

    // Default deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Click **Publish**.

---

## Part 4: React Native Firebase Setup

### Add Firebase to React Native App

```bash
cd react_native_project

# Install Firebase
npm install firebase @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore

# Or with expo
npx expo install firebase
```

### Create Firebase Config File

**File: `firebaseConfig.js`** (update existing one)

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXX",
  authDomain: "alztwin-voice.firebaseapp.com",
  projectId: "alztwin-voice",
  storageBucket: "alztwin-voice.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

export default app;
```

Get these values from Firebase Console → Project Settings.

---

## Part 5: Backend Environment File - Complete Example

**File: `.env`** in alztwin-backend:

```env
# ============================================
# SERVER & ENVIRONMENT
# ============================================
PORT=5000
NODE_ENV=development
LOG_LEVEL=info

# ============================================
# GOOGLE GEMINI API
# ============================================
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXX

# ============================================
# FIREBASE ADMIN SDK
# ============================================
FIREBASE_PROJECT_ID=alztwin-voice
FIREBASE_PRIVATE_KEY_ID=abc123def456...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQE...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxxx@alztwin-voice.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789000

# ============================================
# FRONTEND ACCESS (CORS)
# ============================================
FRONTEND_URL=http://localhost:8081
FRONTEND_URL_PROD=https://yourappurl.com

# ============================================
# AUDIO PROCESSING
# ============================================
MAX_AUDIO_FILE_SIZE=26214400
AUDIO_UPLOAD_DIR=./uploads/audio
```

---

## Part 6: Getting Your IP Address

Your React Native app needs to connect to backend running on your machine.

### Windows PowerShell

```powershell
ipconfig

# Look for "IPv4 Address: 192.168.x.x"
```

### macOS/Linux

```bash
ifconfig

# Look for "inet 192.168.x.x"
```

Update `.env.local` in React Native project:

```env
# Replace with your actual IP address
BACKEND_URL=http://192.168.1.100:5000/api
```

---

## Part 7: Testing All Connections

### Test 1: Gemini API

```bash
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_GEMINI_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{"text": "Say hello"}]
    }]
  }'
```

Expected: `"Hello! How can I help you today?"`

### Test 2: Firebase Connection

```javascript
// In terminal:
node

// Then:
const admin = require('firebase-admin');
const creds = require('./path/to/firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(creds)
});

const db = admin.firestore();
db.collection('test').add({hello: 'world'})
  .then(() => console.log('✅ Firebase connected'))
  .catch(err => console.log('❌ Error:', err));
```

### Test 3: Backend Server

```bash
cd alztwin-backend

# Create logs directory
mkdir logs

# Start server
npm run dev

# Expected output:
# ✅ Backend server started on port 5000
# ✅ Firebase Admin initialized successfully
```

### Test 4: Frontend Connection

```bash
cd react_native_project

# Test health endpoint from another terminal
curl http://192.168.1.100:5000/api/health

# Expected:
# {"status":"OK","timestamp":"2026-04-07T...","uptime":123.45}
```

---

## Part 8: Quick Reference

| System | Key | Location | Status |
|--------|-----|----------|--------|
| Gemini API | AIzaSy... | .env (GEMINI_API_KEY) | ✅ Obtain |
| Firebase Project | alztwin-voice | Firebase Console | ✅ Create |
| Firestore DB | — | Firebase > Build | ✅ Enable |
| Auth | Email/Password | Firebase > Auth | ✅ Enable |
| Admin SDK | JSON file | Firebase > Service Accounts | ✅ Download |
| Backend | Port 5000 | alztwin-backend/.env | ✅ Run |
| Frontend | Port 8081 / 19000 | react_native_project | ✅ Run |

---

## Part 9: Troubleshooting

### "GEMINI_API_KEY is unauthorized"

- Verify API key is correct in .env
- Check Generative Language API is enabled in Cloud Console
- Ensure API key has usage in Cloud Console > Credentials

### "Firebase initialization failed"

- Check FIREBASE_PRIVATE_KEY format - must have `\n` not actual line breaks
- Verify all FIREBASE_* env vars are set
- Test: `npm run dev` and check logs

### "Backend not reachable from frontend"

- Verify IP address: `ipconfig` on Windows
- Update .env.local in React Native project
- Check firewall: port 5000 open?
- Test: `curl http://192.168.1.100:5000/api/health`

### "Audio recording not working"

- Grant microphone permission in iOS settings
- Check `app.json` has audio permissions plugin
- Test: Try recording in voice memo app first

### "Backend times out on Gemini API calls"

- Check internet connection
- Verify GEMINI_API_KEY is valid
- Some audio files may take >30s - increase timeout in voiceTestService.ts
- Check Gemini API quota limits in Cloud Console

---

## Part 10: Security Checklist Before Deployment

- [ ] Remove all `.env` files from git (in `.gitignore`)
- [ ] Enable Firestore production security rules
- [ ] Restrict Gemini API key to specific domains
- [ ] Update CORS in backend to production URLs only
- [ ] Enable HTTPS for backend server
- [ ] Set `NODE_ENV=production`
- [ ] Rotate API keys regularly
- [ ] Monitor Firebase usage and costs
- [ ] Set up Firebase backups
- [ ] Test authentication flows
- [ ] Verify data encryption in transit
