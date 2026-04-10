/**
 * Patient Test Results Service
 * Handles Firebase storage and retrieval of clinical test results
 */

import { db } from '../firebaseConfig';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  doc,
  getDoc,
} from 'firebase/firestore';

interface StoredTestResult {
  patientId: string;
  testType: 'ADAS-Cog 13' | 'FAQ' | 'MMSE';
  score: number;
  maxScore: number;
  severity: string;
  timestamp: Timestamp;
  responses: Record<string, number>;
}

interface TestResultWithId extends StoredTestResult {
  id: string;
}

export class PatientTestResultsService {
  private static readonly RESULTS_COLLECTION = 'patientTestResults';

  /**
   * Store test result in Firebase
   */
  static async storeTestResult(
    patientId: string,
    testType: 'ADAS-Cog 13' | 'FAQ' | 'MMSE',
    score: number,
    maxScore: number,
    severity: string,
    responses: Record<string, number>
  ): Promise<string> {
    try {
      const testResult: Omit<StoredTestResult, 'id'> = {
        patientId,
        testType,
        score,
        maxScore,
        severity,
        timestamp: Timestamp.now(),
        responses,
      };

      const docRef = await addDoc(
        collection(db, this.RESULTS_COLLECTION),
        testResult
      );

      console.log(`Test result stored with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error('Error storing test result:', error);
      throw error;
    }
  }

  /**
   * Get all test results for a patient
   */
  static async getPatientTestResults(
    patientId: string,
    testType?: 'ADAS-Cog 13' | 'FAQ' | 'MMSE'
  ): Promise<TestResultWithId[]> {
    try {
      let q: any;

      if (testType) {
        q = query(
          collection(db, this.RESULTS_COLLECTION),
          where('patientId', '==', patientId),
          where('testType', '==', testType),
          orderBy('timestamp', 'desc')
        );
      } else {
        q = query(
          collection(db, this.RESULTS_COLLECTION),
          where('patientId', '==', patientId),
          orderBy('timestamp', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      const results: TestResultWithId[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as StoredTestResult;
        results.push({
          ...data,
          id: doc.id,
        });
      });

      return results;
    } catch (error) {
      console.error('Error retrieving test results:', error);
      throw error;
    }
  }

  /**
   * Get latest test result for each test type
   */
  static async getLatestTestResults(
    patientId: string
  ): Promise<{
    adasCog13: TestResultWithId | null;
    faq: TestResultWithId | null;
    mmse: TestResultWithId | null;
  }> {
    try {
      const adasResults = await this.getPatientTestResults(
        patientId,
        'ADAS-Cog 13'
      );
      const faqResults = await this.getPatientTestResults(patientId, 'FAQ');
      const mmseResults = await this.getPatientTestResults(patientId, 'MMSE');

      return {
        adasCog13: adasResults.length > 0 ? adasResults[0] : null,
        faq: faqResults.length > 0 ? faqResults[0] : null,
        mmse: mmseResults.length > 0 ? mmseResults[0] : null,
      };
    } catch (error) {
      console.error('Error retrieving latest test results:', error);
      throw error;
    }
  }

  /**
   * Get test results count for a patient
   */
  static async getTestResultsCount(
    patientId: string,
    testType: 'ADAS-Cog 13' | 'FAQ' | 'MMSE'
  ): Promise<number> {
    try {
      const q = query(
        collection(db, this.RESULTS_COLLECTION),
        where('patientId', '==', patientId),
        where('testType', '==', testType)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting test results count:', error);
      throw error;
    }
  }

  /**
   * Get patient profile with basic info
   */
  static async getPatientProfile(patientId: string): Promise<any> {
    try {
      const patientDoc = await getDoc(doc(db, 'patients', patientId));

      if (patientDoc.exists()) {
        return {
          id: patientDoc.id,
          ...patientDoc.data(),
        };
      }

      return null;
    } catch (error) {
      console.error('Error retrieving patient profile:', error);
      throw error;
    }
  }

  /**
   * Create or update patient profile
   */
  static async updatePatientProfile(
    patientId: string,
    profileData: Record<string, any>
  ): Promise<void> {
    try {
      const patientRef = doc(db, 'patients', patientId);
      const patientDoc = await getDoc(patientRef);

      if (patientDoc.exists()) {
        // Update existing profile
        const updateData = {
          ...profileData,
          updatedAt: Timestamp.now(),
        };
        // Since we don't have updateDoc imported, we'll use setDoc with merge
        const { setDoc } = await import('firebase/firestore');
        await setDoc(patientRef, updateData, { merge: true });
      }
    } catch (error) {
      console.error('Error updating patient profile:', error);
      throw error;
    }
  }
}

export default PatientTestResultsService;
