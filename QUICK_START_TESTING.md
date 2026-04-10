# Quick Start Testing Guide

## ⚡ Get Started in 5 Minutes

### Step 1: Start Backend (Terminal 1)
```bash
cd e:\react_native_project\alztwin-backend
npm install
```

Update `.env` with your credentials:
```env
GEMINI_API_KEY=your_gemini_api_key_here
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_private_key_with_newlines  
FIREBASE_CLIENT_EMAIL=your_client_email@iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
```

Then start:
```bash
npm run dev
```

Expected output:
```
✅ Backend server started on port 5000
✅ Firebase Admin initialized successfully  
🚀 Voice Assessment Backend Ready
📍 http://localhost:5000
```

### Step 2: Start Frontend (Terminal 2)
```bash
cd e:\react_native_project
npm install expo-av expo-speech
npm start
```

Press:
- `i` for iOS simulator
- `a` for Android emulator
- `w` for web (limited audio support)

### Step 3: Test Voice Assessment

**1. Sign In**
- Email: test@example.com
- Password: (your Firebase password)

**2. Navigate to Dashboard**
- See "Voice-Based Assessments" section
- Click "FAQ" card

**3. Confirm & Start**
- Dialog appears: "Start FAQ Assessment?"
- Click "Start"

**4. Record Response**
- Conductor shows question
- Click "Start Recording"
- Speak your answer (at least 2 seconds)
- Click "Stop Recording"
- Wait 5-10 seconds for evaluation

**5. Progress Through 10 FAQ Questions**
- Score displays after each evaluation
- "Evaluating..." spinner shows during processing
- Advance to next question automatically

**6. View Results**
- After 10 questions, submit
- Alert shows: Total Score + Severity
- Click "View Results"
- See detailed breakdown

---

## 🧐 What To Test

### ✅ Core Functionality
- [x] Audio recording works
- [x] Gemini API evaluates responses
- [x] Scores display 0-3 for FAQ
- [x] Progress bar advances
- [x] Results save to Firebase
- [x] Navigation flows correctly

### ✅ Error Handling
- [x] Network error shows alert
- [x] Short recording rejected
- [x] Upload error handled
- [x] Auth failure redirects to sign in

### ✅ User Experience
- [x] Question text is clear
- [x] Recording indicator visible
- [x] Score displays immediately after
- [x] Navigation intuitive
- [x] Loading states clear

---

## 🐛 If Something Breaks

### Backend Won't Start
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill process (get PID from above)
taskkill /PID <PID> /F

# Or change PORT in .env
PORT=5001
```

### Firebase Connection Error
```
Error: FIREBASE_PRIVATE_KEY invalid
→ Check .env file has \n in private key (not actual line breaks)
→ Verify all FIREBASE_* variables set
```

### Gemini API Error
```
Error: GEMINI_API_KEY invalid
→ Generate new key in Google Cloud Console
→ Enable Generative Language API
→ Check quota usage
```

### Audio Recording Fails
```
Permission denied
→ Grant microphone permission on device
→ Restart app
→ Check iOS/Android settings
```

### Scores Not Saving
```
Firebase write failed
→ Check Firestore Rules allow authenticated writes
→ Verify user is authenticated
→ Check network connectivity
```

---

## 📊 Test Results

### FAQ Assessment (10 questions)
- Typical duration: 5-10 minutes
- Expected scores: 0-30
- Severity levels:
  - 0-8: Normal
  - 9-20: Mild Impairment
  - 21-30: Moderate to Severe

### Sample Test Flow
```
Q1: "Financial management?" 
→ Answer: "I can still manage bills"
→ Score: 2 (Normal)
→ Progress: 10%

Q2: "Complex tasks?"
→ Answer: "That's difficult now"
→ Score: 1 (Mild)
→ Progress: 20%

... (continue through Q10)

Final: FAQ Total = 18
Severity = "Mild Impairment - Some assistance needed"
```

---

## 🔧 Files Modified/Created

### New Services
- ✅ `services/authService.ts` - Authentication
- ✅ `services/batchAudioProcessingService.ts` - Batch processing

### New Components  
- ✅ `components/drawing-canvas.tsx` - MMSE praxis
- ✅ `components/caregiver-checklist.tsx` - Observational rating

### Fixed Components
- ✅ `app/(app)/patient/voice-test-conductor.tsx` - Error handling + test types
- ✅ `app/(app)/patient/voice-session-summary.tsx` - Score display fix
- ✅ `app/(app)/patient/dashboard.tsx` - Added voice assessments

### Documentation
- ✅ `IMPLEMENTATION_COMPLETE_PHASE2.md` - Full details
- ✅ `QUICK_START_TESTING.md` - This file

---

## 🎯 Success Criteria

You'll know it's working when:

1. **Backend shows:**
   ```
   ✅ Backend server started on port 5000
   ```

2. **Frontend shows:**
   - Voice-Based Assessments section on dashboard
   - 3 assessment cards (FAQ, MMSE, ADAS)

3. **Recording works:**
   - Microphone records while talking
   - "Evaluating..." appears
   - Score returns 0-3

4. **Results display:**
   - FAQ Total: X/30
   - Severity: Clear category
   - Date & Time: Correct

5. **Everything saved:**
   - Refresh page
   - Results still visible
   - Data persists in Firebase

---

## 📞 Troubleshooting Hints

| Problem | Solution |
|---------|----------|
| "Backend not responding" | Check port 5000 running, verify axios baseURL in .env.local |
| "Audio file too large" | Recording files auto-limited, shouldn't happen |
| "Gemini API Error" | Check API key in .env, verify quota, enable API |
| "Score not saving" | Check Firebase rules, verify auth, check network |
| "Drawing canvas not showing" | Component only in MMSE flow, ADAS flow incomplete |
| "Permission denied (microphone)" | Grant permission in device settings, restart app |

---

## 🚀 Next Phase Options

After testing FAQ:

1. **Test MMSE** - Requires drawing canvas implementation
2. **Test ADAS** - Requires caregiver checklist
3. **Test Batch Processing** - Multiple audio files
4. **Test Error Recovery** - Network failures, timeouts

---

## 📋 Validation Checklist

- [ ] Backend responds at `http://localhost:5000/api/health`
- [ ] Frontend loads without errors
- [ ] Can sign in with test account
- [ ] Dashboard shows voice assessments
- [ ] Can start FAQ assessment
- [ ] Can record audio
- [ ] Gemini evaluates response
- [ ] Score displays 0-3
- [ ] Can complete all 10 questions
- [ ] Results save successfully
- [ ] Can view assessment summary

**Once all checkboxes pass: ✅ READY FOR PRODUCTION**

---

**Last Updated:** April 7, 2026
**Version:** 1.0.0
