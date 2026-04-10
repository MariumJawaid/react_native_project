# Voice-Based Clinical Assessment System - Requirements & Architecture

## Executive Summary

This document specifies the complete implementation of voice-based AI evaluation for clinical tests (ADAS-Cog 13, FAQ, MMSE) using:
- **Frontend:** React Native Expo with expo-av for audio recording
- **Backend:** Node.js/Express as secure bridge
- **AI:** Google Gemini API for unified transcription + scoring
- **Database:** Firebase Firestore (existing) for final aggregated scores

**Key Advantage:** Gemini processes audio directly → no separate STT service needed → one LLM call per question.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native App (Expo)                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Audio Recording (expo-av) + UI Components               │ │
│ │ - VoiceTestConductor (FAQ, MMSE, ADAS)                 │ │
│ │ - DrawingCanvas (Praxis, Copying)                       │ │
│ │ - CaregiverChecklistUI (Physical tasks)                 │ │
│ │ - BatchAudioCollector (ADAS observational)              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                          ↓ (FormData)                       │
│                   POST /api/evaluate-question               │
└─────────────────────────────────────────────────────────────┘
                           ↓↑
┌─────────────────────────────────────────────────────────────┐
│                  Node.js/Express Backend                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Audio Handler (multer middleware)                       │ │
│ │ Receives: Audio file + question metadata               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                          ↓                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Gemini API Integration Service                          │ │
│ │ - Sends: Audio + Prompt (rubric)                       │ │
│ │ - Returns: JSON {transcript, score}                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                          ↓                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Response Handler                                        │ │
│ │ - Parse JSON response                                   │
│ │ - Validate score is 0-MAX                              │ │
│ │ - Return to frontend                                    │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↓↑
┌─────────────────────────────────────────────────────────────┐
│                  Google Gemini API                          │
│ - Processes audio (native multimodal)                      │
│ - Runs rubric-based evaluation                             │
│ - Returns structured JSON                                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│           Firebase Firestore (Final Storage)                │
│ Collection: voiceAssessmentResults                          │
│ - patientId: string                                         │
│ - testType: "FAQ" | "MMSE" | "ADAS-Cog 13"               │
│ - sessionDate: timestamp                                    │
│ - responses: { [questionKey]: {audio, transcript, score} } │
│ - TOTAL13 / FAQTOTAL / MMSCORE: integer (aggregated)      │
│ - severity: string                                          │
│ - audioURLs: { [questionKey]: gsURL } (optional storage)   │
└─────────────────────────────────────────────────────────────┘
```

---

## Requirements Checklist

### Backend Requirements
- [ ] Node.js 18+ with Express.js framework
- [ ] Multer for audio file uploads
- [ ] Gemini API key (from Google Cloud Console)
- [ ] Environment variables: GEMINI_API_KEY, FIREBASE_CREDENTIALS
- [ ] Axios or Fetch API for Gemini calls
- [ ] Firebase Admin SDK for database writes
- [ ] Error handling and logging (Winston or Pino)
- [ ] Rate limiting to prevent abuse
- [ ] CORS configured for frontend domain

### Frontend (Expo) Requirements
- [ ] expo-av already available (Audio recording)
- [ ] expo-speech (Text-to-Speech for question delivery)
- [ ] react-native-gesture-handler (for drawing)
- [ ] react-native-signature-canvas (for drawing praxis tasks) - **NEW**
- [ ] axios or fetch for HTTP requests
- [ ] React Native camera for potential future image capture
- [ ] FormData support (native in React Native)
- [ ] Audio playback for question review

### Database (Firebase) Requirements
- [ ] New collection: voiceAssessmentResults
- [ ] Indexes on: patientId, testType, sessionDate
- [ ] Security rules for voice assessment reads/writes
- [ ] Storage bucket for voice audio files (optional)

### Third-Party Services
- [ ] **Google Gemini API** with audio processing enabled
  - Model: gemini-1.5-flash (audio + text support)
  - Billing enabled (free tier has generous limits)
- [ ] Firebase project already configured

### Patient Portal UI Requirements
**New Components:**
- VoiceTestConductor.tsx - Main voice test UI
- DrawingCanvas.tsx - For praxis/copying tasks
- CaregiverInputUI.tsx - For caregiver-only questions
- VoiceSessionSummary.tsx - Results display
- AudioRecorder.ts - Expo-av wrapper service
- GeminiEvaluator.ts - Backend integration service

---

## Test Structure & Flow

### FAQ Test Flow
```
1. INIT: Display patient info, caregiver role confirmation
   ├─ Question 1-10: Sequential voice questions
   │   ├─ App speaks question via Text-to-Speech
   │   ├─ Record caregiver voice response
   │   ├─ Send to backend: POST /api/evaluate-question
   │   ├─ Gemini returns: {transcript: "...", score: 0-3}
   │   ├─ Display: Transcript + Score in app
   │   └─ Aggregate: faqResponses[questionKey] = score
   ├─ FINAL: Sum all 10 scores = FAQTOTAL (0-30)
   └─ SAVE to Firebase: voiceAssessmentResults
      └─ Aggregate: FAQTOTAL = sum of all scores
```

### MMSE Test Flow
```
1-2. Orientation (10 points total):
   ├─ Q1 (5pts): Orientation to Time - voice
   ├─ Q2 (5pts): Orientation to Place - voice

3. Registration (3 points):
   ├─ Q3: App speaks 3 words, patient repeats via voice

4. Attention & Calculation (5 points):
   ├─ Q4: Serial 7s counting - voice

5. Recall (3 points):
   ├─ Q5: Recall 3 words from Q3 - voice

6. Naming (2 points):
   ├─ Q6a: Show image of pencil, patient speaks name
   ├─ Q6b: Show image of watch, patient speaks name

7. Repetition (1 point):
   ├─ Q7: Patient repeats phrase "No ifs, ands, or buts"

8. 3-Step Command (3 points): **CAREGIVER INPUT**
   ├─ App speaks to patient: "Take paper in right hand, fold it, put on floor"
   ├─ UI SWITCHES to Caregiver with checkboxes:
   │   ├─ [ ] Did they take it in right hand?
   │   ├─ [ ] Did they fold it?
   │   └─ [ ] Did they put it on floor?
   └─ Score: 1 point per checked box (0-3)

9. Reading (1 point):
   ├─ Display text: "CLOSE YOUR EYES"
   ├─ App speaks: "Do what it says"
   ├─ UI SWITCHES to Caregiver: Did they close eyes? Yes/No
   └─ Score: 1 if Yes, 0 if No

10. Writing (1 point):
    ├─ Display drawing canvas
    ├─ App speaks: "Write a complete sentence"
    ├─ Patient writes with finger
    ├─ Send image to Gemini
    ├─ Gemini evaluates: complete sentence = 1pt, else 0pt
    └─ Score: 1 or 0

11. Copying (1 point):
    ├─ Display reference image: Two intersecting pentagons
    ├─ Display blank canvas below
    ├─ App speaks: "Copy this drawing"
    ├─ Patient draws with finger
    ├─ Send image to Gemini
    ├─ Gemini evaluates: proper intersection = 1pt, else 0pt
    └─ Score: 1 or 0

FINAL: Sum ALL scores = MMSCORE (0-30, higher = better)
```

### ADAS-Cog 13 Test Flow
```
VOICE QUESTIONS (Direct scoring):
1. Q1 - Word Recall (Max 10): Patient speaks remembered words
2. Q2 - Commands (Max 5): **CAREGIVER CHECKLIST** - check completed steps
3. Q3 - Constructional Praxis (Max 5): **DRAWING CANVAS** - patient draws shapes
4. Q4 - Naming (Max 5): **CAREGIVER** rates if patient named objects/fingers
5. Q5 - Ideational Praxis (Max 5): **CAREGIVER CHECKLIST** - check mailing steps
6. Q6 - Orientation (Max 8): Patient speaks date/location/time
7. Q7 - Word Recognition (Max 12): Patient says Yes/No for each word
8. Q13 - Delayed Word Recall (Max 10): Patient recalls words from Q1 later

BATCH OBSERVATIONAL QUESTIONS (After all voice recorded):
9. Q8 - Spoken Language (Max 5): LLM analyzes ALL patient audio
10. Q9 - Comprehension (Max 5): LLM analyzes ALL patient audio
11. Q10 - Word Finding (Max 5): LLM analyzes ALL patient audio
12. Q11 - Instruction Recall (Max 5): LLM analyzes ALL patient audio
13. Q12 - Concentration (Max 5): LLM analyzes ALL patient audio

FINAL: Sum all = TOTAL13 (0-85, higher = worse impairment)
       Note: For ADAS, scores are ERRORS/DEFICITS (higher = worse)
```

---

## Gemini API Integration Details

### Prompt Template (FAQ Example)
```
System Role:
"You are a clinical assessment evaluator using the FAQ (Functional Activities Questionnaire) rubric.
Evaluate the caregiver's verbal response and assign a score based on the patient's functional capacity.
Return ONLY valid JSON. No additional text."

For Each Question:
{
  "model": "gemini-1.5-flash",
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "inline_data": {
            "mime_type": "audio/mpeg",  // or audio/wav, audio/ogg
            "data": "<base64_encoded_audio>"
          }
        },
        {
          "text": "Question: 'In the past 4 weeks, has the patient had difficulty writing checks, paying bills, or balancing a checkbook?'
          
Evaluate the caregiver's response and rate the patient's dependency:
- 0: Normal/Never had difficulty, could do if needed
- 1: Has difficulty but manages to do it anyway
- 2: Requires assistance
- 3: Dependent/Cannot do it at all

Return ONLY this JSON (no other text): {\"transcript\": \"what caregiver said\", \"score\": X}"
        }
      ]
    }
  ]
}
```

### Response Example
```json
{
  "transcript": "Oh, usually my mother handles the bills, I fill out the checks but she reviews them first",
  "score": 1
}
```

### Batch Audio Processing (ADAS Observational)
```
{
  "model": "gemini-1.5-flash",
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "inline_data": {
            "mime_type": "audio/mpeg",
            "data": "<base64_q1_audio>"
          }
        },
        {
          "inline_data": {
            "mime_type": "audio/mpeg",
            "data": "<base64_q4_audio>"
          }
        },
        {
          "inline_data": {
            "mime_type": "audio/mpeg",
            "data": "<base64_q6_audio>"
          }
        },
        {
          "text": "Analyze these three audio clips from a cognitive assessment.
          
Assessment context:
- Q1: Patient recalling word list
- Q4: Patient counting backward by 7s
- Q6: Patient answering orientation questions

Rate the patient's SPOKEN LANGUAGE QUALITY (0-5):
0 = Clear, articulate, no difficulty
1 = Occasional slight slurring/hesitation
2 = Noticeable slurring/long pauses but intelligible
3 = Significant slurring/frequent hesitations
4 = Mostly unintelligible
5 = No speech/cannot understand

Return ONLY: {\"score\": X}"
        }
      ]
    }
  ]
}
```

---

## Database Schema Updates

### New Collection: voiceAssessmentResults

```firestore
docs/
├── voiceAssessmentResults/
│   └── {sessionId}/
│       ├── patientId: string (user UID)
│       ├── testType: "FAQ" | "MMSE" | "ADAS-Cog 13"
│       ├── sessionDate: Firestore.Timestamp
│       ├── sessionStatus: "in-progress" | "completed" | "error"
│       ├── startedAt: Firestore.Timestamp
│       ├── completedAt: Firestore.Timestamp
│       │
│       ├── responses: {
│       │   "q1_managing_finances": {
│       │     "timestamp": Firestore.Timestamp,
│       │     "audioURI": "gs://bucket/audio_q1.m4a",  // optional
│       │     "transcript": "...",
│       │     "score": 0-3,
│       │     "prompt": "question text",
│       │     "evaluationModel": "gemini-1.5-flash",
│       │     "evaluatedAt": Firestore.Timestamp,
│       │     "evaluationConfidence": 0.95,
│       │   },
│       │   "q2_tax_records": { ... },
│       │   ... (all questions)
│       │ }
│       │
│       ├── FAQTOTAL: number (0-30, for FAQ only)
│       ├── MMSCORE: number (0-30, for MMSE only)
│       ├── TOTAL13: number (0-85, for ADAS-Cog 13 only)
│       ├── severity: string ("Normal", "Mild", "Moderate", "Severe")
│       │
│       └── metadata: {
│           "caregiverId": string,  // for FAQ and ADAS mixed questions
│           "locationGPS": { lat, lng },  // for MMSE orientation
│           "testIntentDate": Firestore.Timestamp,  // intended test date
│           "deviceInfo": { os, version },
│           "appVersion": "1.0.0",
│           "notes": "Any observer notes",
│           "completionRate": 0.95  // % of questions completed
│         }
```

### Related: Update patientTestResults Collection

**Keep existing for backward compatibility with manual button-based tests.**

Add field:
```
evaluationMethod: "manual" | "voice"  // distinguish test entry method
```

---

## Error Handling & Validation

### Audio Validation
```typescript
// Frontend must validate:
✓ Audio duration >= 2 seconds && <= 120 seconds
✓ Audio file size < 25MB (Gemini limit)
✓ Audio format supported (m4a, wav, mp3, ogg)
✓ Audio quality >= 8kHz sample rate

// Backend must validate:
✓ Audio mime type is audio/*
✓ Audio file exists in request
✓ Gemini response is valid JSON
✓ Score is integer 0 <= score <= maxScore
✓ Transcript is non-empty string (usually)
```

### Network Retry Logic
```
- Max 3 retries per question
- Exponential backoff: 1s, 2s, 4s
- If fail after 3 retries: save as "error" and skip (don't force restart)
- Allow user to review failed questions later
```

### User Experience (Error Cases)
```
Scenario 1: Network timeout on question evaluation
├─ Show: "Connection timeout. Retry? [Yes / Skip]"
├─ Yes → Retry (up to 3x)
└─ Skip → Mark as incomplete, move next

Scenario 2: Gemini returns invalid JSON
├─ Backend logs error with audio UUID
├─ Return to frontend: {error: "evaluation_failed", retry: true}
├─ Show: "Unable to evaluate. Retry? [Yes / Skip]"
└─ User choice

Scenario 3: User cancels mid-test
├─ Save progress locally
├─ Offer: "Resume test? [Yes / Start over]"
└─ If resume: Continue from last completed question

Scenario 4: Drawing/image analysis fails (drawing canvas)
├─ Allow user to re-draw (up to 3x)
├─ If fails 3x: Skip with note or use caregiver rating
```

---

## Testing & Validation Checklist

### Unit Tests
- [ ] Audio recording start/stop cycles
- [ ] Base64 encoding of audio files
- [ ] JSON parsing from Gemini responses
- [ ] Score aggregation calculations
- [ ] Timestamp handling across timezones
- [ ] Drawing image encoding to base64

### Integration Tests
- [ ] FAQ: All 10 questions score correctly (0-3 each)
- [ ] MMSE: All 11 questions score correctly (variable max)
- [ ] ADAS: All 13 questions score correctly (variable max)
- [ ] Caregiver checkboxes calculate correctly (0-3 for steps)
- [ ] Drawing praxis scores correctly (1 or 0)
- [ ] Batch observational scoring works
- [ ] Final aggregated scores match manual calculation
- [ ] Firebase saves with all fields populated
- [ ] Severity classifications are correct

### Performance Tests
- [ ] Question evaluation latency < 10 seconds
- [ ] Large audio files (> 20MB) handled gracefully
- [ ] Multiple questions in parallel (not overloading Gemini)
- [ ] UI remains responsive during Gemini calls
- [ ] Battery drain acceptable (<5% per full test)

### Security Tests
- [ ] Audio files not stored on device after completion
- [ ] Patient data not exposed in error messages
- [ ] Gemini API key not exposed in frontend
- [ ] CORS properly configured (no unauthorized origins)
- [ ] Firebase rules restrict access to own data only

---

## Implementation Priority

### Phase 1 (Week 1): Foundation
- [ ] Backend setup with Node.js/Express
- [ ] Gemini API integration service
- [ ] Audio recording service (Expo)
- [ ] Simple FAQ voice test (1-2 questions)
- [ ] Test Firebase storage

### Phase 2 (Week 2): Core Tests
- [ ] Complete FAQ (all 10 questions)
- [ ] MMSE voice questions (1-7)
- [ ] MMSE caregiver checkboxes
- [ ] Score aggregation
- [ ] Results display

### Phase 3 (Week 3): Advanced Features
- [ ] MMSE drawing (Writing, Copying)
- [ ] ADAS-Cog 13 (all 13 questions)
- [ ] Caregiver checklists (ADAS commands, praxis)
- [ ] Batch audio processing (observational)
- [ ] Batch image processing (drawing analysis)

### Phase 4 (Week 4): Polish
- [ ] Error handling and retry logic
- [ ] Session persistence (resume ability)
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] User documentation

---

## Cost Considerations

### Gemini API Pricing
- **Free tier:** 15 requests/minute (sufficient for individual patient tests)
- **Estimated cost:**
  - FAQ test: ~10 API calls
  - MMSE test: ~11 API calls
  - ADAS test: ~13 + batch calls (typically 5-6)
  - **Per test:** ~$0.001-0.003 (very cheap)

### Audio File Storage (Optional)
- If storing audio in Firebase Cloud Storage: ~$0.02 per GB/month
- FAQ: ~50 queries/minute if scaled nationally
- Full storage for 100 patients: < $1/month

---

## Success Criteria

✅ **Test is successful when:**
1. Patient/caregiver completes full assessment via voice
2. All responses transcribed correctly (>95% accuracy)
3. All scores calculated accurately (matches manual rubric)
4. Results saved to Firebase with all fields
5. Final aggregates (TOTAL13/FAQTOTAL/MMSCORE) correct
6. App handles network errors gracefully
7. Session can be resumed if interrupted
8. No audio stored locally after completion
9. Performance < 3ms UI render, < 10s evaluation per question
10. User completes test in < 30 minutes (FAQ < 10min, MMSE < 20min, ADAS < 30min)

---

## Security & Privacy

### Data at Rest
- Firebase encryption (default)
- Audio not retained after transcription (delete after Gemini processes)
- Optional: Purge transcript after score stored

### Data in Transit
- HTTPS only for all API calls
- TLS 1.2+ for Gemini API
- Firebase security rules enforce auth

### User Consent
- Require explicit consent before recording
- Show transcript to user before score finalized
- Allow correction if transcript is inaccurate

### Compliance
- HIPAA-ready (patient PHI handled securely)
- GDPR-ready (can purge patient data on request)
- Audit logging of all evaluations

---

## Next Steps

1. ✅ Read this requirements document
2. Create Node.js backend skeleton
3. Implement Gemini API integration
4. Build audio recording service
5. Create VoiceTestConductor component
6. Implement FAQ test flow
7. Test end-to-end with real audio
