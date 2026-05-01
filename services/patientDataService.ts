import { db } from '../firebaseConfig';
import {
  doc,
  getDoc,
  collection,
  query,
  getDocs,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';

// ─── Types ───
export interface SensorReading {
  timestamp: number;
  bpm: number;
  latitude: number;
  longitude: number;
  fall: boolean;
  outOfZone: boolean;
  outOfBound: number;
  sleeping: boolean;
  pitch: number;
  roll: number;
  dateKey: string;
}

export interface DayAggregation {
  dateKey: string;
  readings: SensorReading[];
  avgBpm: number;
  maxBpm: number;
  minBpm: number;
  fallCount: number;
  outOfZoneCount: number;
  sleepPercentage: number;
  sleepHours: number;
  sleepScore: number;
  readingCount: number;
}

export interface MRIScan {
  mriId: string;
  name: string;
  uploadedAt: any;
  uploadedBy: string;
  status: string;
  totalImages: number;
  totalBatches: number;
}

export interface AIAnalysis {
  analysisId: string;
  confidence: number;
  prediction: string;
  timestamp: any;
}

export interface PatientSummary {
  patientId: string;
  name: string;
  age: number;
  diagnosis: string;
  currentStage: string;
  aiConfidence: number;
  riskLevel: string;
  riskScore: number;
  latestWearableSyncAt: any;
  lastAnalysisAt: any;
}

// ─── Fetch patient document data ───
export async function fetchPatientData(patientId: string): Promise<PatientSummary | null> {
  try {
    const patientRef = doc(db, 'patients', patientId);
    const patientSnap = await getDoc(patientRef);

    if (!patientSnap.exists()) {
      console.warn(`Patient document not found: ${patientId}`);
      return null;
    }

    const data = patientSnap.data();
    return {
      patientId,
      name: data.name || 'Unknown',
      age: data.age || 0,
      diagnosis: data.diagnosis || 'N/A',
      currentStage: data.currentStage || 'Unknown',
      aiConfidence: data.aiConfidence || 0,
      riskLevel: data.riskLevel || 'Unknown',
      riskScore: data.riskScore || 0,
      latestWearableSyncAt: data.latestWearableSyncAt,
      lastAnalysisAt: data.lastAnalysisAt,
    };
  } catch (error) {
    console.error('Error fetching patient data:', error);
    return null;
  }
}

// ─── Extract sensor data from deviceData map ───
export async function extractDeviceDataReadings(
  patientId: string,
  days: number
): Promise<SensorReading[]> {
  try {
    const patientRef = doc(db, 'patients', patientId);
    const patientSnap = await getDoc(patientRef);

    if (!patientSnap.exists()) return [];

    const data = patientSnap.data();
    const deviceData = data.deviceData as Record<string, any>;

    if (!deviceData || typeof deviceData !== 'object') {
      return [];
    }

    const readings: SensorReading[] = [];
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    Object.entries(deviceData).forEach(([timestampStr, reading]) => {
      const timestamp = parseInt(timestampStr);
      if (timestamp < cutoffTime) return;

      readings.push({
        timestamp,
        bpm: reading.bpm || 0,
        latitude: reading.latitude || 0,
        longitude: reading.longitude || 0,
        fall: reading.fall === true,
        outOfZone: reading.outOfZone === true,
        outOfBound: reading.outOfBound || 0,
        sleeping: reading.sleeping === true,
        pitch: reading.pitch || 0,
        roll: reading.roll || 0,
        dateKey: reading.dateKey || getDateKeyFromTimestamp(timestamp),
      });
    });

    return readings.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error('Error extracting device data:', error);
    return [];
  }
}

// ─── Aggregate readings by date ───
export function aggregateByDate(readings: SensorReading[]): DayAggregation[] {
  const groupedByDate: Record<string, SensorReading[]> = {};

  readings.forEach((reading) => {
    const dateKey = reading.dateKey;
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = [];
    }
    groupedByDate[dateKey].push(reading);
  });

  return Object.entries(groupedByDate)
    .map(([dateKey, dayReadings]) => {
      // Sort readings by timestamp
      const sortedReadings = dayReadings.sort((a, b) => a.timestamp - b.timestamp);

      const bpms = sortedReadings.map((r) => r.bpm).filter((b) => b > 0);
      const fallCount = sortedReadings.filter((r) => r.fall).length;
      const outOfZoneCount = sortedReadings.filter((r) => r.outOfZone).length;
      const sleepCount = sortedReadings.filter((r) => r.sleeping).length;

      // Calculate sleep hours: for each sleeping reading, measure time to next reading (capped at 4 hours)
      let totalSleepMs = 0;
      const sleepReadings = sortedReadings.filter((r) => r.sleeping);

      for (let i = 0; i < sortedReadings.length; i++) {
        const reading = sortedReadings[i];
        if (reading.sleeping) {
          // Find the next reading on the same day
          let nextReadingTime: number;
          
          if (i < sortedReadings.length - 1) {
            // Next reading exists
            nextReadingTime = sortedReadings[i + 1].timestamp;
          } else {
            // No next reading: count until end of day
            // Parse dateKey (format: "YYYY-MM-DD")
            const nextDay = new Date(dateKey);
            nextDay.setDate(nextDay.getDate() + 1);
            nextReadingTime = nextDay.getTime();
          }

          let sleepDurationMs = nextReadingTime - reading.timestamp;
          
          // Cap at 4 hours (14400000 ms)
          const MAX_SLEEP_INTERVAL = 4 * 60 * 60 * 1000;
          sleepDurationMs = Math.min(sleepDurationMs, MAX_SLEEP_INTERVAL);

          totalSleepMs += sleepDurationMs;
        }
      }

      const sleepHours = Math.round((totalSleepMs / (1000 * 60 * 60)) * 10) / 10; // Round to 1 decimal

      // Calculate sleep score (ideal: 7.5 hours)
      let sleepScore = 100 - Math.abs(sleepHours - 7.5) * 18;
      sleepScore = Math.max(0, Math.min(100, sleepScore)); // Clamp 0-100

      return {
        dateKey,
        readings: dayReadings,
        avgBpm: bpms.length > 0 ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : 0,
        maxBpm: bpms.length > 0 ? Math.max(...bpms) : 0,
        minBpm: bpms.length > 0 ? Math.min(...bpms) : 0,
        fallCount,
        outOfZoneCount,
        sleepPercentage:
          sortedReadings.length > 0 ? Math.round((sleepCount / sortedReadings.length) * 100) : 0,
        sleepHours,
        sleepScore,
        readingCount: sortedReadings.length,
      };
    })
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

// ─── Fetch MRI scans ───
export async function fetchMRIScans(patientId: string): Promise<MRIScan[]> {
  try {
    const mriCollectionRef = collection(db, 'patients', patientId, 'mriScans');
    const q = query(mriCollectionRef, orderBy('uploadedAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        mriId: doc.id,
        name: data.name || 'MRI Scan',
        uploadedAt: data.uploadedAt,
        uploadedBy: data.uploadedBy || 'Unknown',
        status: data.status || 'pending',
        totalImages: data.totalImages || 0,
        totalBatches: data.totalBatches || 0,
      };
    });
  } catch (error) {
    console.error('Error fetching MRI scans:', error);
    return [];
  }
}

// ─── Fetch AI analyses ───
export async function fetchAIAnalyses(patientId: string): Promise<AIAnalysis[]> {
  try {
    const aiCollectionRef = collection(db, 'patients', patientId, 'aiAnalyses');
    const q = query(aiCollectionRef, orderBy('timestamp', 'desc'), limit(10));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        analysisId: doc.id,
        confidence: data.confidence || data.aiConfidence || 0,
        prediction: data.prediction || data.currentStage || 'N/A',
        timestamp: data.timestamp,
      };
    });
  } catch (error) {
    console.error('Error fetching AI analyses:', error);
    return [];
  }
}

// ─── Fetch assessment results ───
export async function fetchAssessmentResults(patientId: string) {
  try {
    const assessmentCollectionRef = collection(db, 'patients', patientId, 'assessmentResults');
    const q = query(assessmentCollectionRef, orderBy('createdAt', 'desc'), limit(5));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching assessments:', error);
    return [];
  }
}

// ─── Fetch RAG recommendations ───
export async function fetchRAGRecommendations(patientId: string) {
  try {
    const recCollectionRef = collection(db, 'patients', patientId, 'ragRecommendations');
    const snapshot = await getDocs(recCollectionRef);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
}

// ─── Helper: Generate dateKey from timestamp ───
export function getDateKeyFromTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
}

// ─── Helper: Format date key to short label ───
export function shortDateLabel(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Helper: Get past date keys ───
export function getPastDateKeys(days: number): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}
