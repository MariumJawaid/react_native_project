# Voice Assessment Implementation - Quick Start Guide

## 📋 Overview

This guide walks you through implementing voice-based cognitive assessment for the AlzTwin patient portal in **3 phases: Setup, Backend, Frontend**.

---

## Phase 1: Setup (30 minutes)

### 1.1 Get API Keys

#### Gemini API Key
```
1. Go to console.cloud.google.com
2. Create project "AlzTwin-Voice-Assessment"
3. Enable "Generative Language API"
4. Create API Key in Credentials
5. Copy key
```

#### Firebase Credentials
```
1. Go to firebase.google.com
2. Create project "alztwin-voice"
3. Enable Firestore Database (test mode)
4. Enable Email/Password Authentication
5. Go to Project Settings > Service Accounts
6. Click "Generate New Private Key"
7. Download JSON file (keep secure!)
```

### 1.2 Get Your Machine IP Address

**Windows PowerShell:**
```powershell
ipconfig
# Look for "IPv4 Address: 192.168.x.x"
```

**macOS/Linux:**
```bash
ifconfig
# Look for "inet 192.168.x.x"
```

Example: `192.168.1.100`

---

## Phase 2: Backend Setup (1 hour)

### 2.1 Create Backend Project

```bash
# Create directory
mkdir alztwin-backend
cd alztwin-backend

# Initialize
npm init -y

# Install dependencies
npm install express cors multer axios dotenv firebase-admin winston compression
npm install --save-dev nodemon
```

### 2.2 Create Directory Structure

```bash
mkdir config middleware services routes controllers logs
```

### 2.3 Copy Backend Files

Use the files from `BACKEND_IMPLEMENTATION.md`:

1. Copy `server.js` to root
2. Copy `package.json` to root (replaces generated)
3. Copy config files to `config/` folder
4. Copy middleware files to `middleware/` folder
5. Copy service files to `services/` folder
6. Copy route files to `routes/` folder
7. Copy controller to `controllers/` folder
8. Create `logs/.gitkeep`

### 2.4 Configure Environment

Create `.env` file in alztwin-backend:

```env
PORT=5000
NODE_ENV=development
LOG_LEVEL=info

GEMINI_API_KEY=your_api_key_here

FIREBASE_PROJECT_ID=alztwin-voice
FIREBASE_PRIVATE_KEY_ID=from_json_file
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@alztwin-voice.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789

FRONTEND_URL=http://localhost:8081
MAX_AUDIO_FILE_SIZE=26214400
```

**Get values from Firebase JSON file downloaded earlier!**

### 2.5 Test Backend

```bash
npm run dev

# Expected output:
# ✅ Backend server started on port 5000
# ✅ Firebase Admin initialized successfully
# 🚀 Voice Assessment Backend Ready
```

**Keep this terminal open!**

### 2.6 Verify Connection

In another terminal:

```bash
curl http://localhost:5000/api/health

# Expected response:
# {"status":"OK","timestamp":"2026-04-07T...","uptime":123.45}
```

---

## Phase 3: Frontend Setup (1.5 hours)

### 3.1 Install Packages

```bash
cd react_native_project

npm install expo-av expo-speech axios
npm install react-native-signature-canvas  # For drawing (next phase)
```

### 3.2 Create Frontend Services

Copy these files from `FRONTEND_INTEGRATION_GUIDE.md`:

**Create `services/audioRecorderService.ts`**
- Handles recording start/stop
- Converts to base64

**Create `services/voiceTestService.ts`**
- Communicates with backend
- Handles evaluation requests

**Create `services/textToSpeechService.ts`**
- Reads questions aloud
- Controlled speech rate

**Create `services/logger.ts`** (simple version)
```typescript
export const logger = {
  info: (msg: string, data?: any) => console.log(`ℹ️ ${msg}`, data),
  error: (msg: string, err?: any) => console.error(`❌ ${msg}`, err),
  warn: (msg: string, data?: any) => console.warn(`⚠️ ${msg}`, data),
  debug: (msg: string, data?: any) => console.log(`🐛 ${msg}`, data)
};
```

### 3.3 Update Environment

Create `.env.local` in react_native_project:

```env
BACKEND_URL=http://192.168.1.100:5000/api
# Replace 192.168.1.100 with your machine IP from Phase 1.2
```

### 3.4 Create Voice Test Component

**Create `app/(app)/patient/voice-test-conductor.tsx`**

Use the code from `FRONTEND_INTEGRATION_GUIDE.md` - copy the complete component.

### 3.5 Update Permissions

Update `app.json`:

```json
{
  "plugins": [
    [
      "expo-av",
      {
        "microphonePermission": "Allow to record audio responses"
      }
    ]
  ]
}
```

### 3.6 Start Frontend

```bash
npm start

# Press 'i' for iOS simulator or 'a' for Android emulator
```

---

## Phase 4: End-to-End Testing (30 minutes)

### 4.1 Verify All Systems Running

Terminal 1 (Backend):
```bash
✅ PORT 5000 open
✅ Firebase connected
✅ Listening for requests
```

Terminal 2 (Frontend):
```bash
✅ Metro bundler running
✅ App loaded in simulator
✅ http://localhost:8081
```

### 4.2 Test Health Endpoints

```bash
# Terminal 3 - Test backend health
curl http://localhost:5000/api/health

# Expected: {"status":"OK",...}

# Test frontend can reach backend
# Open app and check logs in Xcode/Android Studio
```

### 4.3 Full Test Flow

1. **Open React Native App**
   - Should show Patient Dashboard
   - Looking for "Voice Assessment" button

2. **If no Voice Assessment button:**
   - Update `app/(app)/patient/dashboard.tsx`
   - Add voice test card from FRONTEND_INTEGRATION_GUIDE.md
   - Reload app (R in metro terminal)

3. **Tap Voice Assessment**
   - Navigate to Question 1/10
   - "Start Recording" button appears

4. **Record Response**
   - Tap "Start Recording"
   - Phone reads question aloud (expo-speech)
   - You speak your answer
   - Tap "Stop Recording"

5. **Evaluation**
   - Backend sends audio to Gemini API
   - Gemini transcribes + scores
   - Backend returns score (0-3)
   - Frontend shows result

6. **Next Question**
   - Automatically advances or tap Continue
   - Repeats 10 times (10 FAQ questions)

7. **Submit Assessment**
   - Calculates FAQTOTAL (sum of 10 scores)
   - Stores in Firebase
   - Shows final score and severity

---

## Troubleshooting During Testing

### Backend Won't Start

```bash
# Problem: Port 5000 in use
# Solution: Kill process or change PORT in .env

# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000 -ErrorAction Ignore).OwnerProcess -ErrorAction Ignore | Stop-Process -Force

# macOS/Linux
lsof -ti:5000 | xargs kill -9
```

### "Backend not reachable" Error in App

Check backend URL:
```
Open .env.local in React Native project
BACKEND_URL=http://YOUR_MACHINE_IP:5000/api
Replace YOUR_MACHINE_IP with output from: ipconfig
Example: http://192.168.1.100:5000/api
```

### "Firebase initialization failed"

```bash
# Problem: .env has incorrect format
# Check FIREBASE_PRIVATE_KEY:
# - Must start with "-----BEGIN PRIVATE KEY-----\n
# - Ends with \n-----END PRIVATE KEY-----\n"
# - Use \n for newlines (not actual line breaks)

# Fix: Copy carefully from JSON file
vim .env
# Paste entire FIREBASE_PRIVATE_KEY value in quotes
```

### Audio Not Recording

1. Grant microphone permission:
   - iOS: Settings > AlzTwin > Microphone
   - Android: Settings > Apps > AlzTwin > Permissions > Microphone

2. Test native voice memo first

3. Check app.json has expo-av plugin

### Gemini API Errors

```bash
# Problem: "Gemini evaluation failed"
# Check 1: Is API key correct?
echo $GEMINI_API_KEY

# Check 2: Is Generative Language API enabled?
# Go to: console.cloud.google.com > APIs > Generative Language API

# Check 3: Test directly
curl https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

---

## File Checklist

### Backend Files Required
- [x] server.js
- [x] package.json
- [x] .env
- [x] config/logger.js
- [x] config/firebaseAdmin.js
- [x] config/geminiClient.js
- [x] middleware/errorHandler.js
- [x] middleware/audioUpload.js
- [x] middleware/rateLimiter.js
- [x] services/audioProcessor.js
- [x] services/scoringEngine.js
- [x] services/geminiEvaluator.js
- [x] routes/health.js
- [x] routes/assessmentRoutes.js
- [x] controllers/assessmentController.js
- [x] logs/ (directory)

### Frontend Files Required
- [x] services/audioRecorderService.ts
- [x] services/voiceTestService.ts
- [x] services/textToSpeechService.ts
- [x] services/logger.ts
- [x] app/(app)/patient/voice-test-conductor.tsx
- [x] .env.local (with BACKEND_URL)
- [x] Updated app.json (expo-av plugin)
- [x] Updated app/(app)/patient/dashboard.tsx (voice button)

---

## Success Criteria

✅ **Phase 1 Complete:**
- Gemini API key obtained
- Firebase project created
- Firestore database enabled
- Service account credentials downloaded
- Machine IP address identified

✅ **Phase 2 Complete:**
- Backend starts without errors
- Firebase Admin initializes successfully
- Health endpoint returns 200 OK
- All services loaded and ready

✅ **Phase 3 Complete:**
- React Native app compiles
- .env.local configured with backend URL
- Voice test conductor component created
- Expo permissions set correctly

✅ **Phase 4 Complete:**
- App navigates to voice test
- Microphone permission granted
- Can record audio (5+ seconds)
- Question is read aloud (expo-speech)
- Recording stops and sends to backend
- Gemini API evaluates within 10 seconds
- Score displayed (0-3)
- Next question loads automatically
- All 10 FAQ questions complete
- Final score shown with severity level
- Data saved to Firebase Firestore

---

## Next Phases

### Phase 5: Additional Features (Coming)
- [x] Draw Copy Task (MMSE)
- [x] Caregiver Checkboxes (Mixed input)
- [x] MMSE Complete Test
- [x] ADAS-Cog 13 Complete Test
- [x] Batch Audio Processing

### Phase 6: Optimization
- [x] Error retry logic
- [x] Session persistence
- [x] Performance tuning
- [x] Offline capability

### Phase 7: Production
- [x] Security hardening
- [x] Production Firebase rules
- [x] HTTPS backend
- [x] Rate limiting
- [x] Monitoring & logging

---

## Support & Documentation

| Document | Purpose |
|----------|---------|
| BACKEND_SETUP_GUIDE.md | Backend architecture overview |
| BACKEND_IMPLEMENTATION.md | All backend code files |
| FRONTEND_INTEGRATION_GUIDE.md | Frontend services + components |
| API_CREDENTIALS_SETUP.md | API keys & Firebase setup |
| VOICE_ASSESSMENT_REQUIREMENTS.md | System specifications |

---

## Quick Commands Reference

```bash
# Backend
cd alztwin-backend
npm run dev              # Start development server
npm start                # Start production server
npm test                 # Run tests (configure if needed)

# Frontend
cd react_native_project
npm start                # Start metro bundler
npm run ios              # Start iOS simulator
npm run android          # Start Android emulator
npm run web              # Start web version

# Testing
curl http://localhost:5000/api/health
curl http://localhost:8081                # Frontend health

# Environment
ipconfig                                  # Get machine IP (Windows)
ifconfig                                  # Get machine IP (Mac/Linux)
```

---

## Estimated Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: API Setup | 30 min | ⏳ Today |
| Phase 2: Backend | 1 hour | ⏳ Today |
| Phase 3: Frontend | 1.5 hours | ⏳ Today |
| Phase 4: Testing | 30 min | ⏳ Today |
| **Total: First Voice Test** | **3.5 hours** | ⏳ Today |

Then proceed to Phase 5 (Additional Features) for MMSE, ADAS, drawing, etc.

---

## Questions & Issues

If you encounter issues:

1. Check troubleshooting section above
2. Review the detailed guide for your phase
3. Verify all environment variables match exactly
4. Check API key validity in cloud console
5. Test each component independently

---

Good luck! 🚀 You're about to add voice-based AI assessment to your healthcare app!
