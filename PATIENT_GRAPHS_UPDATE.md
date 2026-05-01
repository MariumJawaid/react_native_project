# Patient Graphs Page - Update Documentation

## Overview
Updated the patient graph page to extract comprehensive data from your Firestore structure, including sensor data, MRI scans, and AI analyses.

## Changes Made

### 1. New Service: `patientDataService.ts`
Located at: `services/patientDataService.ts`

**Key Functions:**

- **`extractDeviceDataReadings(patientId, days)`** - Extracts sensor readings from the `deviceData` map in patient document
  - Filters readings within the specified days
  - Returns array of `SensorReading` objects
  - Source: `/patients/{patientId}.deviceData`

- **`aggregateByDate(readings)`** - Groups readings by date and computes statistics
  - Average, max, min BPM for each day
  - Fall count, zone exit count per day
  - Sleep percentage per day
  - Returns array of `DayAggregation` objects

- **`fetchPatientData(patientId)`** - Gets main patient document
  - Returns patient summary with diagnosis, stage, risk score, AI confidence
  - Source: `/patients/{patientId}`

- **`fetchMRIScans(patientId)`** - Fetches all MRI scan records
  - Source: `/patients/{patientId}/mriScans/{docId}`
  - Ordered by upload date (most recent first)

- **`fetchAIAnalyses(patientId)`** - Fetches AI analysis history
  - Source: `/patients/{patientId}/aiAnalyses/{docId}`
  - Latest 10 analyses with confidence scores
  - Returns: prediction, confidence, timestamp

- **`fetchAssessmentResults(patientId)`** - Fetches assessment data
  - Source: `/patients/{patientId}/assessmentResults/{docId}`

- **`fetchRAGRecommendations(patientId)`** - Fetches AI recommendations
  - Source: `/patients/{patientId}/ragRecommendations/{docId}`

### 2. Updated Component: `patient-graphs.tsx`

**Data Extraction Changes:**
- Changed from Realtime Database to **Firestore** 
- Now extracts data from `deviceData` map in patient document (timestamp-keyed)
- Aggregates raw sensor readings into daily statistics

**New Features:**

#### A. Patient Info Header
- Shows patient name, age, diagnosis
- Displays current dementia stage
- Shows risk level badge with color coding (High/Medium/Low)

#### B. Enhanced Summary Cards
- Average BPM
- Total fall events
- Total zone exit events

#### C. Statistics Row
- Max BPM (highest reading in period)
- Min BPM (lowest reading in period)  
- Average sleep percentage

#### D. Comprehensive Charts
1. **Heart Rate (BPM)** - Line chart showing daily average BPM
2. **Fall Events** - Bar chart counting falls per day
3. **Out of Zone Events** - Bar chart showing zone violations
4. **Sleep Activity** - Line chart showing sleep percentage per day

#### E. AI Analysis Section
- Displays up to 3 most recent AI analyses
- Shows prediction/stage classification
- Includes confidence score with color coding
- Ordered by date (most recent first)

#### F. MRI Scans Section
- Lists up to 3 most recent MRI scans
- Shows upload date, status, and image count
- Quick scan overview

#### G. Data Source Information
- Shows the Firestore path data is extracted from
- Displays selected time period

## Data Flow

```
Firestore Structure:
├── patients/{patientId}
│   ├── deviceData: {timestampMs: {bpm, fall, outOfZone, sleeping, ...}}
│   ├── mriScans/{docId}
│   ├── aiAnalyses/{docId}
│   ├── assessmentResults/{docId}
│   ├── ragRecommendations/{docId}
│   └── (other fields: name, age, diagnosis, etc.)

Data Processing:
1. Extract deviceData map
2. Parse individual readings
3. Group by dateKey (YYYY-MM-DD)
4. Compute daily aggregations
5. Fetch supplementary data (MRI, AI analyses)
6. Render visualizations
```

## Time Period Filters
- **7 Days** - Shows last 7 days of data
- **14 Days** - Shows last 14 days of data
- Default: 7 days

## Type Definitions

### SensorReading
```typescript
{
  timestamp: number;        // Milliseconds
  bpm: number;
  latitude: number;
  longitude: number;
  fall: boolean;
  outOfZone: boolean;
  outOfBound: number;
  sleeping: boolean;
  pitch: number;
  roll: number;
  dateKey: string;          // "YYYY-MM-DD"
}
```

### DayAggregation
```typescript
{
  dateKey: string;
  readings: SensorReading[];
  avgBpm: number;
  maxBpm: number;
  minBpm: number;
  fallCount: number;
  outOfZoneCount: number;
  sleepPercentage: number;
  readingCount: number;
}
```

### PatientSummary
```typescript
{
  patientId: string;
  name: string;
  age: number;
  diagnosis: string;
  currentStage: string;
  aiConfidence: number;
  riskLevel: string;
  riskScore: number;
  latestWearableSyncAt: Timestamp;
  lastAnalysisAt: Timestamp;
}
```

## Usage

The page automatically:
1. Resolves the current user's patient ID from the `users/{uid}` document
2. Fetches patient data and sensor readings
3. Aggregates data by date
4. Fetches MRI scans and AI analyses
5. Renders comprehensive analytics dashboard

## Error Handling

- Gracefully handles missing subcollections
- Returns empty arrays if data doesn't exist
- Displays loading state during data fetch
- Safe handling of missing fields in documents

## Performance Notes

- Uses indexed queries for MRI and AI analyses (ordered by date)
- Limits AI analyses to 10 most recent
- Limits MRI display to 3 most recent
- Efficiently aggregates device data in memory
- Single fetch per data type to minimize Firestore reads

## Visual Hierarchy

1. **Header** - Navigation and period selector
2. **Patient Info** - Name, age, stage, risk level
3. **Summary Cards** - Key metrics (BPM, Falls, Zone Exits)
4. **Statistics** - Max/Min BPM, Sleep average
5. **Charts** - Visual representations (HR, Falls, Sleep)
6. **AI Analysis** - Latest classifications with confidence
7. **MRI Scans** - Recent scan uploads
8. **Data Source** - Information footer

## Color Scheme

- **Blue (#3b82f6)** - Heart rate, info
- **Red (#ef4444)** - Falls/warnings
- **Amber (#f59e0b)** - Zone events
- **Purple (#7c3aed)** - Sleep, AI
- **Cyan (#06b6d4)** - MRI scans
- **Green (#10b981)** - Low risk
- **Gradient backgrounds** - Visual appeal

## Next Steps (Optional)

Consider adding:
- Export data to CSV/PDF
- Trend analysis (improving/declining)
- Predictive alerts
- Detailed day view
- Location history visualization
- Medication compliance tracking
