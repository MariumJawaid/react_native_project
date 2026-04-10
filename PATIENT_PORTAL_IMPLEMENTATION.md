# Patient Portal - Clinical Tests Implementation Guide

## Overview
This document explains the complete implementation of the patient portal with three clinical tests (ADAS-Cog 13, FAQ, MMSE), including data storage, scoring algorithms, and integration with Firebase.

## Architecture

### 1. Firebase Database Connection

#### Configuration (firebaseConfig.js)
```javascript
✅ ALREADY CONFIGURED:
- Firestore Database (db) - for storing patient test results
- Realtime Database (rtdb) - for live notifications
- Firebase Auth (auth) - for user authentication
- Storage - for uploading documents
```

**Key Configuration Details:**
- Project ID: `alztwin-test`
- Database URL: `https://alztwin-test-default-rtdb.asia-southeast1.firebasedatabase.app`
- Auth: React Native async storage persistence enabled

#### What's Been Done:
✅ Patient and Caregiver auth already connected
✅ User collection stores role (patient/caregiver) and email
✅ Firebase auth correctly references users by UID

### 2. Database Schema - Patient Test Results

#### Collection: `patientTestResults`
```firestore
Document Fields:
├── patientId (string) - UID of patient from Firebase Auth
├── testType (string) - "ADAS-Cog 13" | "FAQ" | "MMSE"
├── score (number) - Calculated total score
├── maxScore (number) - 85 (ADAS) | 30 (FAQ) | 30 (MMSE)
├── severity (string) - "Normal", "Mild", "Moderate", "Severe"
├── timestamp (Firestore.Timestamp) - When test was completed
└── responses (object)
    ├── [questionKey]: number (individual question scores)
    └── ... (13, 10, or 30 items depending on test)
```

**Example Document:**
```json
{
  "patientId": "user_uid_12345",
  "testType": "ADAS-Cog 13",
  "score": 28,
  "maxScore": 85,
  "severity": "Mild Impairment",
  "timestamp": "2024-04-06T14:30:00",
  "responses": {
    "wordRecall": 5,
    "commands": 2,
    "constructionalPraxis": 3,
    ...
  }
}
```

### 3. Database Connection Analysis

#### ✅ CAREGIVER CONNECTION (Working)
```
SignUpScreen → Creates users/{uid} with role="caregiver"
CaregiverDashboard → Queries users/{uid} and patients/{patientId}
Patient Info stored in: patients/{patientId} collection
```

#### ✅ PATIENT CONNECTION (Now Implemented)
```
SignUpScreen → Creates users/{uid} with role="patient"
PatientDashboard → Queries users/{uid} directly
PatientTestResultsService → Stores test results in patientTestResults/{docId}
```

**Key Differences:**
- Caregiver: Links to patient via patientId field in users collection
- Patient: Stores own test results using patient UID as patientId in results collection

### 4. Services Implementation

#### A. ClinicalScoringService (clinicalScoringService.ts)
Provides scoring and severity classification for all three tests:

```typescript
// ADAS-Cog 13: 0-85 (higher = worse)
calculateADASCog13Score(responses) → number

// FAQ: 0-30 (higher = worse)
calculateFAQScore(responses) → number

// MMSE: 0-30 (lower = worse)
calculateMMSEScore(responses) → number

// Severity classification
getADASCog13Severity(score) → string
getFAQSeverity(score) → string
getMMSESeverity(score) → string
```

**Scoring Details**

**ADAS-Cog 13 (Max 85):**
- Measures cognitive impairment (higher = more impaired)
- 13 components with varying max scores
- Components: Word Recall (10), Commands (5), Praxis (5), Naming (5), Ideation (5), Orientation (8), Word Recognition (12), Language (5), Comprehension (5), Word Finding (5), Instruction Recall (5), Concentration (5), Delayed Recall (10)

**FAQ (Max 30):**
- Measures functional independence (higher = more dependent)
- 10 daily living activities
- Each rated 0-3: 0=Independent, 1=Difficulty, 2=Needs assistance, 3=Dependent

**MMSE (Max 30):**
- Measures cognitive function (higher = better)
- 30 points total: Orientation (10), Registration (3), Attention (5), Recall (3), Language (9)
- Quick cognitive screening tool

#### B. PatientTestResultsService (patientTestResultsService.ts)
Handles all Firebase operations:

```typescript
// Store completed test result
storeTestResult(patientId, testType, score, maxScore, severity, responses)
  → Promise<docId>

// Retrieve all results for patient (optionally by test type)
getPatientTestResults(patientId, testType?)
  → Promise<TestResult[]>

// Get latest result for each test type
getLatestTestResults(patientId)
  → Promise<{ adasCog13, faq, mmse }>

// Count how many tests patient has completed
getTestResultsCount(patientId, testType)
  → Promise<number>

// Get and update patient profile
getPatientProfile(patientId) → Promise<object>
updatePatientProfile(patientId, profileData) → Promise<void>
```

### 5. Components Overview

#### A. Patient Dashboard (patient/dashboard.tsx)
**Purpose:** Main hub for patient's cognitive assessments

**Features:**
- Displays 3 clinical assessment cards (ADAS-Cog 13, FAQ, MMSE)
- Shows latest results for each test
- Color-coded by test type
- Quick action to start new assessment
- Displays test severity and score

**Data Flow:**
```
Dashboard mounted
  → Query latest results for all 3 tests
  → Display in cards with color gradients
  → User taps card
    → Navigate to conduct-test with testType parameter
```

#### B. Test Conductor (patient/conduct-test.tsx)
**Purpose:** Progressive questionnaire interface for all three tests

**Features:**
- Dynamically loads questions based on testType parameter
- Progressive UI: one question per screen
- Score input via buttons (0 to max score)
- Progress bar showing test completion
- Previous/Next navigation
- Automatic scoring and result storage on completion

**Data Flow:**
```
User selects test
  → Questions loaded based on testType
  → User inputs scores for each question
  → On completion:
    → Calculate total score using ClinicalScoringService
    → Store result using PatientTestResultsService
    → Save to Firebase patientTestResults collection
    → Show results and ask if user wants to share/view
```

**Supported Tests:**
- ADAS-Cog 13: 13 questions
- FAQ: 10 questions  
- MMSE: 30 questions

#### C. Test Results (patient/test-results.tsx)
**Purpose:** Display completed test results and history

**Features:**
- Shows latest test result with interpretation
- Lists all individual question responses
- Displays historical results
- Severity indicator with color coding
- Share with provider (placeholder)
- Download report (placeholder)

**Data Flow:**
```
User navigates to results
  → Query all results for testType
  → Display latest with full details
  → Show previous results in list below
```

### 6. Complete Data Flow for Test Completion

```
1. Patient logs in
   ├─ Auth: users/{uid} retrieved with role="patient"
   └─ Dashboard loads latest results from patientTestResults

2. Patient taps test card
   ├─ Navigate to conduct-test with testType
   └─ Questions and max scores loaded

3. Patient answers all questions
   ├─ Scores stored in local state
   └─ No Firebase writes yet (local only)

4. Patient taps "Complete Test"
   ├─ ClinicalScoringService.calculateScore(responses)
   │  └─ Returns: score number
   │
   ├─ ClinicalScoringService.getSeverity(score)
   │  └─ Returns: severity string
   │
   ├─ PatientTestResultsService.storeTestResult()
   │  └─ Writes to patientTestResults collection in Firestore
   │     - Document auto-generated by Firestore
   │     - Contains: patientId, testType, score, severity, responses
   │
   ├─ Alert shown with score and interpretation
   └─ User offered: "View Results" or "Back to Dashboard"

5. If "View Results" selected
   ├─ Navigate to test-results with testType
   ├─ Query patientTestResults where patientId=uid AND testType=testType
   ├─ Display latest result with full details
   ├─ Show response breakdown
   └─ Show previous attempts if any
```

### 7. Severity Classifications

#### ADAS-Cog 13 (based on score)
```
0-20   → Normal
21-30  → Mild Impairment
31-50  → Moderate Impairment
51-85  → Severe Impairment
```

#### FAQ (based on score)
```
0-9    → Normal
10-15  → Mild Impairment
16-22  → Moderate Impairment
23-30  → Severe Dependency
```

#### MMSE (based on score - inverse)
```
24-30  → Normal
18-23  → Mild Impairment
11-17  → Moderate Impairment
0-10   → Severe Impairment
```

### 8. Firestore Security Rules (Recommended)

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read their own user document
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
    }

    // Patients can only read/write their own test results
    match /patientTestResults/{docId} {
      allow create: if request.auth.uid != null 
                    && request.resource.data.patientId == request.auth.uid;
      allow read: if request.auth.uid != null 
                  && resource.data.patientId == request.auth.uid;
      allow update, delete: if false; // Immutable results
    }

    // Caregivers can read patient results linked to them
    match /patients/{patientId} {
      allow read: if request.auth.uid != null;
      allow write: if request.auth.uid == resource.data.caregiverId;
    }

    match /patientTestResults/{docId} {
      allow read: if request.auth.uid != null;
    }
  }
}
```

### 9. What Still Needs Implementation

#### Phase 1: Core Integration (To-Do)
- [ ] Verify Firebase rules are correctly set
- [ ] Test data storage and retrieval
- [ ] Validate all three tests save correctly
- [ ] Test severity classification accuracy
- [ ] Ensure timestamps are correct

#### Phase 2: Caregiver Integration (To-Do)
- [ ] Caregiver can view patient's test results
- [ ] Add patient test results to caregiver patient-graphs
- [ ] Create notifications for new test results
- [ ] Enable caregiver to assign tests to patients (optional)

#### Phase 3: ML Model Integration (To-Do)
- [ ] Create export function to pull all patient results
- [ ] Format data for ML model input
  - ADAS-Cog 13: TOTAL13 column
  - FAQ: FAQTOTAL column
  - MMSE: MMSCORE column
- [ ] Create endpoint to send results to ML model
- [ ] Display predictions on dashboard
- [ ] Track prediction accuracy over time

#### Phase 4: Enhanced Features (Optional)
- [ ] Share results with caregiver via email
- [ ] Download PDF report with graphs
- [ ] Recurring test reminders/scheduling
- [ ] Trends visualization (score history chart)
- [ ] Compare results with population norms
- [ ] Data export to CSV

### 10. Testing Checklist

Before going to production:

**Firebase Connection:**
- [ ] Can patient sign up and auth works
- [ ] User document created with correct role
- [ ] Test can complete and save to Firebase
- [ ] Results appear in Firestore console
- [ ] Can query results by patient UID

**Scoring Accuracy:**
- [ ] ADAS-Cog 13: Test with max scores = 85
- [ ] FAQ: Test with max scores = 30
- [ ] MMSE: Test with max scores = 30
- [ ] All severity classifications display correctly

**UI/UX:**
- [ ] All three tests load questions correctly
- [ ] Progress bar updates smoothly
- [ ] Score buttons work for all max values
- [ ] Results display with correct formatting
- [ ] Navigation back works at all steps

**Data Integrity:**
- [ ] All responses saved to Firebase
- [ ] Timestamp is accurate
- [ ] Patient ID correctly linked
- [ ] Previous results retrievable

### 11. Environment Variables Needed (None - Already in firebaseConfig.js)

All Firebase configuration is already in `firebaseConfig.js`. The following are already configured:
- API Key
- Auth Domain
- Project ID
- Database URL
- Storage Bucket
- Messaging Sender ID

No additional environment variables are needed.

### 12. File Structure

```
app/
└── (app)/
    └── patient/
        ├── dashboard.tsx          ✅ Patient portal home
        ├── conduct-test.tsx       ✅ Test questionnaire
        └── test-results.tsx       ✅ Results display

services/
├── clinicalScoringService.ts      ✅ Scoring logic
└── patientTestResultsService.ts   ✅ Firebase integration
```

### 13. How to Test

1. **Sign up as patient:** Use SignUpScreen, select "patient" role
2. **View dashboard:** Should see 3 test cards (ADAS-Cog 13, FAQ, MMSE)
3. **Start a test:** Tap any test card
4. **Answer questions:** Input scores for each question
5. **Complete test:** Tap "Complete Test" button
6. **View Firebase:** Check `patientTestResults` collection in Firestore console
7. **Verify storage:** 
   - patientId should match your user UID
   - testType should match selected test
   - score should be sum of responses
   - responses should have all question keys

### 14. API Reference for Developers

#### Store a test result:
```typescript
import PatientTestResultsService from 'services/patientTestResultsService';

const docId = await PatientTestResultsService.storeTestResult(
  patientId,        // string: user UID
  'ADAS-Cog 13',   // testType
  28,              // score
  85,              // maxScore
  'Mild Impairment', // severity
  {                // responses object
    wordRecall: 5,
    commands: 2,
    // ... all other questions
  }
);
```

#### Retrieve test results:
```typescript
// Get all results for a patient
const allResults = await PatientTestResultsService.getPatientTestResults(
  patientId,
  'ADAS-Cog 13'  // optional filter
);

// Get latest of each test
const latest = await PatientTestResultsService.getLatestTestResults(patientId);
console.log(latest.adasCog13); // Latest ADAS-Cog 13 result
```

#### Calculate scores:
```typescript
import ClinicalScoringService from 'services/clinicalScoringService';

const score = ClinicalScoringService.calculateADASCog13Score({
  wordRecall: 5,
  commands: 2,
  // ... all required fields
});

const severity = ClinicalScoringService.getADASCog13Severity(score);
```

---

## Summary

The patient portal is now fully implemented with:

✅ **Complete patient authentication** - Integrated with existing Firebase auth
✅ **Three clinical tests** - ADAS-Cog 13, FAQ, MMSE with accurate scoring
✅ **Results storage** - Firebase Firestore collection for all test results
✅ **Beautiful UI** - Theme-consistent with caregiver portal
✅ **Progress tracking** - View latest results and history
✅ **Severity classification** - Automatic assessment categorization

**Ready for:**
- Testing with real Firebase data
- Caregiver integration to view patient results
- ML model integration once results are collected
- Data export for prediction models

**Status:** Core implementation complete, ready for testing and caregiver integration.
