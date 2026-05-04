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
  Timestamp,
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

// ─── Fetch sensor readings from patient_logs collection (primary source) ───
// Schema per document:
//   bpm: number, fall: boolean, outOfZone: boolean, outOfBound: number,
//   sleeping: boolean, latitude: number, longitude: number, pitch: number,
//   roll: number, patientId: string, timestamp: string ("YYYY-MM-DD HH:MM:SS"),
//   timestampMs: number (epoch ms)
export async function extractDeviceDataReadings(
  patientId: string,
  days: number
): Promise<SensorReading[]> {
  const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

  // ── Primary: patient_logs collection ──
  // Single where() on timestampMs alone = uses Firestore's auto-created
  // single-field index. No composite index needed. Filters server-side
  // so only the N days of docs are downloaded (not all 2790+).
  try {
    const logsRef = collection(db, 'patient_logs');
    const q = query(
      logsRef,
      where('timestampMs', '>=', cutoffTime),
      orderBy('timestampMs', 'asc')
    );
    const snapshot = await getDocs(q);

    console.log('[patientDataService] patient_logs docs in window:', snapshot.size);

    if (!snapshot.empty) {
      const readings: SensorReading[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const tsMs: number = d.timestampMs ?? 0;

        // Extract dateKey from timestamp string "YYYY-MM-DD HH:MM:SS"
        const dateKey: string =
          typeof d.timestamp === 'string' && d.timestamp.length >= 10
            ? d.timestamp.substring(0, 10)
            : getDateKeyFromTimestamp(tsMs);

        return {
          timestamp: tsMs,
          bpm: d.bpm ?? 0,
          latitude: d.latitude ?? 0,
          longitude: d.longitude ?? 0,
          fall: d.fall === true,
          outOfZone: d.outOfZone === true,
          outOfBound: d.outOfBound ?? 0,
          sleeping: d.sleeping === true,
          pitch: d.pitch ?? 0,
          roll: d.roll ?? 0,
          dateKey,
        };
      });

      console.log('[patientDataService] readings mapped:', readings.length);
      return readings;
    }
  } catch (logsErr) {
    console.warn('[patientDataService] patient_logs query failed, falling back to deviceData:', logsErr);
  }

  // ── Fallback: legacy deviceData map on patient document ──
  console.warn('[patientDataService] patient_logs empty — falling back to deviceData map');
  try {
    const patientRef = doc(db, 'patients', patientId);
    const patientSnap = await getDoc(patientRef);
    if (!patientSnap.exists()) return [];

    const data = patientSnap.data();
    const deviceData = data.deviceData as Record<string, any>;
    if (!deviceData || typeof deviceData !== 'object') return [];

    const readings: SensorReading[] = [];
    Object.entries(deviceData).forEach(([timestampStr, reading]) => {
      const rawTs = parseInt(timestampStr);
      const tsMs = rawTs < 1e12 ? rawTs * 1000 : rawTs; // normalize s → ms
      if (tsMs < cutoffTime) return;
      readings.push({
        timestamp: tsMs,
        bpm: reading.bpm ?? 0,
        latitude: reading.latitude ?? 0,
        longitude: reading.longitude ?? 0,
        fall: reading.fall === true,
        outOfZone: reading.outOfZone === true,
        outOfBound: reading.outOfBound ?? 0,
        sleeping: reading.sleeping === true,
        pitch: reading.pitch ?? 0,
        roll: reading.roll ?? 0,
        dateKey: reading.dateKey || getDateKeyFromTimestamp(tsMs),
      });
    });
    console.log('[patientDataService] readings from deviceData fallback:', readings.length);
    return readings.sort((a, b) => a.timestamp - b.timestamp);
  } catch (fallbackErr) {
    console.error('[patientDataService] deviceData fallback also failed:', fallbackErr);
    return [];
  }
}

// ─── Aggregate readings by date ───
// `days` is required so we always scaffold the full date window (including empty days)
export function aggregateByDate(readings: SensorReading[], days: number = 7): DayAggregation[] {
  // Build a map of all days in the window, seeded with empty data
  const allDateKeys = getPastDateKeys(days);
  const groupedByDate: Record<string, SensorReading[]> = {};
  allDateKeys.forEach((dk) => { groupedByDate[dk] = []; });

  // Bucket each reading into its day
  readings.forEach((reading) => {
    const dateKey = reading.dateKey;
    if (groupedByDate[dateKey] !== undefined) {
      groupedByDate[dateKey].push(reading);
    } else {
      // Reading exists but is outside the window scaffold — include it anyway
      groupedByDate[dateKey] = [reading];
    }
  });

  return Object.entries(groupedByDate)
    .map(([dateKey, dayReadings]) => {
      if (dayReadings.length === 0) {
        // Empty day — return zeroed aggregation
        return {
          dateKey,
          readings: [],
          avgBpm: 0,
          maxBpm: 0,
          minBpm: 0,
          fallCount: 0,
          outOfZoneCount: 0,
          sleepPercentage: 0,
          sleepHours: 0,
          sleepScore: 0,
          readingCount: 0,
        };
      }

      // Sort readings by timestamp
      const sortedReadings = dayReadings.sort((a, b) => a.timestamp - b.timestamp);

      const bpms = sortedReadings.map((r) => r.bpm).filter((b) => b > 0);
      const fallCount = sortedReadings.filter((r) => r.fall).length;
      const outOfZoneCount = sortedReadings.filter((r) => r.outOfZone).length;
      const sleepCount = sortedReadings.filter((r) => r.sleeping).length;

      // Calculate sleep hours: for each sleeping reading, measure time to next reading (capped at 4 hours)
      let totalSleepMs = 0;

      for (let i = 0; i < sortedReadings.length; i++) {
        const reading = sortedReadings[i];
        if (reading.sleeping) {
          let nextReadingTime: number;

          if (i < sortedReadings.length - 1) {
            nextReadingTime = sortedReadings[i + 1].timestamp;
          } else {
            const nextDay = new Date(dateKey);
            nextDay.setDate(nextDay.getDate() + 1);
            nextReadingTime = nextDay.getTime();
          }

          let sleepDurationMs = nextReadingTime - reading.timestamp;
          const MAX_SLEEP_INTERVAL = 4 * 60 * 60 * 1000;
          sleepDurationMs = Math.min(sleepDurationMs, MAX_SLEEP_INTERVAL);
          totalSleepMs += sleepDurationMs;
        }
      }

      const sleepHours = Math.round((totalSleepMs / (1000 * 60 * 60)) * 10) / 10;

      let sleepScore = 100 - Math.abs(sleepHours - 7.5) * 18;
      sleepScore = Math.max(0, Math.min(100, sleepScore));

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
