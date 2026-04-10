# ML Model Integration Guide

## Overview
This document explains how the test results collected from the patient portal will be used to feed the ML models (XGBoost and LSTM) for predicting cognitive decline.

## Data Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ PATIENT PORTAL (This Implementation)                         │
│ - Collects: ADAS-Cog 13, FAQ, MMSE responses                │
│ - Stores in: Firebase patientTestResults collection          │
│ - Outputs: Total scores for each test                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
                    [DATA EXPORT]
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ ML MODEL BASELINE (Caregiver Website/Notebook)              │
│ - Input columns: TOTAL13, FAQTOTAL, MMSCORE                 │
│ - Models: XGBoost (tabular) + LSTM (time-series)            │
│ - Output: Predicted cognitive decline trajectory            │
└─────────────────────────────────────────────────────────────┘
                          ↓
                  [PREDICTIONS BACK]
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PATIENT PORTAL (Future Enhancement)                         │
│ - Display: Future predictions                               │
│ - Show: Trending vs baseline                                │
│ - Alert: Changes requiring intervention                     │
└─────────────────────────────────────────────────────────────┘
```

## Test Score Outputs

### What Gets Exported for ML Models

Each completed test generates these values:

#### 1. ADAS-Cog 13 → TOTAL13 Column
**Value Range:** 0-85
**Calculation:** Sum of 13 components (as implemented in clinicalScoringService.ts)

**Components of TOTAL13:**
```
TOTAL13 = Word_Recall (0-10)
        + Commands (0-5)
        + Constructional_Praxis (0-5)
        + Naming_Objects (0-5)
        + Ideational_Praxis (0-5)
        + Orientation (0-8)
        + Word_Recognition (0-12)
        + Language (0-5)
        + Comprehension (0-5)
        + Word_Finding_Difficulty (0-5)
        + Instruction_Recall (0-5)
        + Concentration (0-5)
        + Delayed_Word_Recall (0-10)
```

**Interpretation:** Higher TOTAL13 = More cognitive impairment

#### 2. FAQ → FAQTOTAL Column
**Value Range:** 0-30
**Calculation:** Sum of 10 daily living activities

**Components of FAQTOTAL:**
```
FAQTOTAL = Writing_Checks (0-3)
         + Tax_Records (0-3)
         + Shopping_Alone (0-3)
         + Playing_Games (0-3)
         + Heating_Water (0-3)
         + Preparing_Meal (0-3)
         + Current_Events (0-3)
         + Book_or_TV (0-3)
         + Remembering_Appointments (0-3)
         + Traveling_Outside (0-3)
```

**Interpretation:** Higher FAQTOTAL = More functional dependency

#### 3. MMSE → MMSCORE Column
**Value Range:** 0-30
**Calculation:** Sum of all correct responses

**Components of MMSCORE:**
```
MMSCORE = Orientation_Time (0-5)
        + Orientation_Place (0-5)
        + Registration (0-3)
        + Attention_Serial7s (0-5)
        + Recall (0-3)
        + Naming (0-2)
        + Repetition (0-1)
        + 3Step_Command (0-3)
        + Reading (0-1)
        + Writing (0-1)
        + Copying (0-1)
```

**Interpretation:** Lower MMSCORE = More cognitive impairment

## Data Export Format

### Export 1: Individual Patient Results
**Purpose:** Export for a single patient to get predictions
**Format:** JSON/CSV
**Frequency:** After each test completion

```json
{
  "patientId": "abc123xyz",
  "testDate": "2024-04-06",
  "TOTAL13": 28,
  "FAQTOTAL": 12,
  "MMSCORE": 26,
  "testDetails": {
    "adasResponses": {...},
    "faqResponses": {...},
    "mmseResponses": {...}
  }
}
```

### Export 2: Longitudinal Data
**Purpose:** Build training baseline and monitor trends
**Format:** CSV with time-series data
**Frequency:** Weekly/Monthly aggregate

```csv
patientId,testDate,TOTAL13,FAQTOTAL,MMSCORE,ageGroup,disease_stage
abc123,2024-01-15,32,14,24,65-70,early
abc123,2024-02-15,30,13,25,65-70,early
abc123,2024-03-15,28,12,26,65-70,early
abc123,2024-04-06,28,12,26,65-70,early
def456,2024-01-20,45,20,20,70-75,moderate
def456,2024-02-20,46,21,19,70-75,moderate
```

## Model Input Requirements

### XGBoost Model (Baseline + Cross-sectional Prediction)
**Input:** Single row with TOTAL13, FAQTOTAL, MMSCORE
**Output:** Binary classification or continuous decline rate

```python
# Example input to ML model endpoint
features = {
    "TOTAL13": 28,      # Current ADAS-Cog 13 score
    "FAQTOTAL": 12,     # Current FAQ score
    "MMSCORE": 26       # Current MMSE score
}

# Model predicts:
# - Risk category (low/moderate/high decline)
# - Estimated months to significant change
# - Recommended intervention level
```

### LSTM Model (Temporal Prediction)
**Input:** Sequential measurements over time
**Output:** Future score trajectories

```python
# Sequence of measurements (e.g., past 6 months)
time_series = [
    {"TOTAL13": 32, "FAQTOTAL": 14, "MMSCORE": 24},  # Month 1
    {"TOTAL13": 30, "FAQTOTAL": 13, "MMSCORE": 25},  # Month 2
    {"TOTAL13": 28, "FAQTOTAL": 12, "MMSCORE": 26}   # Month 3
]

# Model predicts next 3-6 months of scores
predictions = {
    "predicted_months": 3,
    "predicted_TOTAL13": [27, 25, 23],
    "predicted_FAQTOTAL": [11, 10, 9],
    "predicted_MMSCORE": [27, 28, 28],
    "confidence": 0.85
}
```

## Implementation Steps for ML Integration

### Step 1: Data Collection (CURRENT - In Patient Portal)
```
✅ Patient completes tests
✅ Scores calculated by clinicalScoringService
✅ Results stored in Firebase with all three scores
```

### Step 2: Data Export Service (TO IMPLEMENT)
Create a new service: `mlDataExportService.ts`

```typescript
export class MLDataExportService {
  // Export latest scores for a patient
  static async getLatestScoresForML(patientId: string) {
    // Query latest ADAS-Cog 13, FAQ, MMSE
    // Return: { TOTAL13, FAQTOTAL, MMSCORE, testDate }
  }

  // Export time-series for model training
  static async getPatientTimeSeriesForML(
    patientId: string,
    startDate: Date,
    endDate: Date
  ) {
    // Query all results in date range
    // Return array of { testDate, TOTAL13, FAQTOTAL, MMSCORE }
  }

  // Export all patients for baseline model
  static async getAllPatientsForTraining(disease_stage?: string) {
    // Query all patient results grouped by patient
    // Return CSV-ready array
  }
}
```

### Step 3: ML Model Endpoint (TO IMPLEMENT on Backend)
Create endpoint that receives scores and returns predictions

```
POST /api/ml/predict
Request: {
  "patientId": "abc123",
  "TOTAL13": 28,
  "FAQTOTAL": 12,
  "MMSCORE": 26,
  "modelType": "xgboost" // or "lstm"
}

Response: {
  "riskLevel": "moderate",
  "predictedChange3Mo": -2,  // Expected decline in TOTAL13
  "confidence": 0.82,
  "recommendation": "Monitor closely"
}
```

### Step 4: Results Display (TO IMPLEMENT)
Add prediction display to patient dashboard

```typescript
// New component: patient/cognitive-predictions.tsx
// Shows:
// - Risk level (low/moderate/high)
// - Trend chart
// - Recommendations
// - Comparison to baseline
```

## Data Quality Considerations

### Validation Before ML Processing
```typescript
function validateMLInput(scores) {
  // Check all scores are within valid range
  if (scores.TOTAL13 < 0 || scores.TOTAL13 > 85) return false;
  if (scores.FAQTOTAL < 0 || scores.FAQTOTAL > 30) return false;
  if (scores.MMSCORE < 0 || scores.MMSCORE > 30) return false;
  
  // Check timestamp is recent
  const daysSincTest = (Date.now() - scores.testDate) / (1000*60*60*24);
  if (daysSincTest > 90) return false;  // Test too old
  
  return true;
}
```

### Data Completeness
- Never send partial data (all three tests required for baseline)
- For LSTM: Require minimum 3 measurements (3 months)
- Filter out anomalies (>2 standard deviations)

## Notebook Integration (Existing ML Models)

Your existing XGBoost and LSTM models expect:
- **TOTAL13** column from ADAS-Cog 13
- **FAQTOTAL** column from FAQ
- **MMSCORE** column from MMSE

### Feeding New Patient Data to Notebook

```python
# In your notebook
import pandas as pd
from firebase_admin import db

# Option 1: Real-time via API
new_scores = requests.get("/api/patient/latest-scores", 
                         params={"patientId": patient_id})
TOTAL13 = new_scores['TOTAL13']
FAQTOTAL = new_scores['FAQTOTAL']
MMSCORE = new_scores['MMSCORE']

# Option 2: Batch export via Firebase
df = get_patient_test_history(patient_id)
# df contains: TOTAL13, FAQTOTAL, MMSCORE, testDate

# Feed to models
xgb_predictions = xgb_model.predict(df[['TOTAL13', 'FAQTOTAL', 'MMSCORE']])
lstm_predictions = lstm_model.predict(sequences)
```

## Timeline for Integration

### Week 1: Core Patient Portal (COMPLETED)
- ✅ Patient tests implemented
- ✅ Score calculation working
- ✅ Firebase storage enabled

### Week 2: Data Export & Testing
- [ ] Create MLDataExportService
- [ ] Export scripts for validation
- [ ] Manual testing with sample data
- [ ] Verify scores match expected ranges

### Week 3: Backend Integration
- [ ] Implement ML model endpoint
- [ ] Add prediction API
- [ ] Error handling and logging
- [ ] Rate limiting

### Week 4: Frontend Integration
- [ ] Display predictions in patient dashboard
- [ ] Show risk levels
- [ ] Trend visualization
- [ ] Caregiver notifications

## Security & Privacy

### Data Protection
- Only export to secure, encrypted endpoints
- Patient data anonymized for training
- Results encrypted at rest in Firebase
- Access logs for audit trail

### HIPAA Compliance
- Store test results with proper consent
- Provide data export capabilities
- Enable data deletion on request
- Maintain audit logs

## Monitoring & Validation

### Output Monitoring
```typescript
// Track ML model accuracy
- Compare predictions vs actual outcomes
- Monthly accuracy reports
- Identify model drift
- Retrain on new data quarterly
```

### Alert System
```typescript
// Notify caregivers of:
- Rapid cognitive decline (>10 point drop in 30 days)
- Unusual score patterns
- Missing routine tests
- Prediction warnings
```

## Example: Complete Flow

```
Day 1: Patient takes ADAS, FAQ, MMSE tests
  └─ Scores: TOTAL13=28, FAQTOTAL=12, MMSCORE=26
  └─ Stored in Firebase with timestamp

Day 2: Caregiver views patient results
  └─ Sees: "Mild Impairment" classification
  └─ System fetches ML predictions
  └─ Shows: "Low risk of decline in next 3 months"

Day 90: Patient takes tests again
  └─ Scores: TOTAL13=26, FAQTOTAL=11, MMSCORE=27
  └─ System detects improvement
  └─ Updates predictions
  └─ Alerts caregiver: "Positive cognitive trend"

Day 180: Caregiver requests historical export
  └─ CSV with 6 months of test history
  └─ Can import into notebook for analysis
  └─ Use for long-term trend analysis
```

## Future Enhancements

1. **Automated Test Scheduling** - Remind patients to test monthly
2. **Wearable Integration** - Correlate tests with activity data
3. **Medication Tracking** - Link tests to medication changes
4. **Caregiver Alerts** - Automatic notifications of concerning trends
5. **Multi-Center Analysis** - Aggregate anonymized data
6. **Mobile Predictions** - On-device predictions without network
7. **Personalized Baselines** - Compare to similar patients
