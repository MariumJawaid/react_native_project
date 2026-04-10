import axios, { AxiosError } from 'axios';
import { audioRecorder } from './audioRecorderService';

const API_BASE_URL = process.env.BACKEND_URL || 'http://192.168.1.100:5000/api';

interface EvaluationResponse {
  success: boolean;
  test: string;
  questionNumber?: number;
  questionType?: string;
  score: number;
  transcript: string;
  maxScore: number;
  timestamp: string;
}

interface AssessmentSubmission {
  patientId: string;
  testType: 'FAQ' | 'MMSE' | 'ADAS-Cog 13';
  responses: Record<string, number>;
  caregiverId?: string;
}

interface AssessmentResult {
  success: boolean;
  sessionId: string;
  FAQTOTAL?: number;
  MMSCORE?: number;
  TOTAL13?: number;
  severity: string;
}

class VoiceTestService {
  private axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 120000
  });

  async evaluateFAQQuestion(
    audioUri: string,
    questionNumber: number
  ): Promise<EvaluationResponse> {
    try {
      console.log(`📍 Evaluating FAQ Q${questionNumber}`);

      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        name: `faq-q${questionNumber}.wav`,
        type: 'audio/wav'
      } as any);
      formData.append('questionNumber', questionNumber.toString());

      const response = await this.axiosInstance.post(
        '/assessment/faq/question',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error(`❌ FAQ Q${questionNumber} evaluation failed:`, error);
      this.handleError(error);
      throw error;
    }
  }

  async evaluateMMSEQuestion(
    audioUri: string,
    questionType: string
  ): Promise<EvaluationResponse> {
    try {
      console.log(`📍 Evaluating MMSE: ${questionType}`);

      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        name: `mmse-${questionType}.wav`,
        type: 'audio/wav'
      } as any);
      formData.append('questionType', questionType);

      const response = await this.axiosInstance.post(
        '/assessment/mmse/question',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error(`❌ MMSE ${questionType} evaluation failed:`, error);
      this.handleError(error);
      throw error;
    }
  }

  async evaluateADASQuestion(
    audioUri: string,
    questionType: string
  ): Promise<EvaluationResponse> {
    try {
      console.log(`📍 Evaluating ADAS: ${questionType}`);

      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        name: `adas-${questionType}.wav`,
        type: 'audio/wav'
      } as any);
      formData.append('questionType', questionType);

      const response = await this.axiosInstance.post(
        '/assessment/adas/question',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error(`❌ ADAS ${questionType} evaluation failed:`, error);
      this.handleError(error);
      throw error;
    }
  }

  async submitAssessment(
    submission: AssessmentSubmission
  ): Promise<AssessmentResult> {
    try {
      console.log(`📍 Submitting ${submission.testType} assessment`);

      const response = await this.axiosInstance.post(
        '/assessment/complete',
        submission
      );

      return response.data;
    } catch (error) {
      console.error('❌ Assessment submission failed:', error);
      this.handleError(error);
      throw error;
    }
  }

  async recordAndEvaluate(
    testType: 'FAQ' | 'MMSE' | 'ADAS',
    questionNumber: number | string
  ): Promise<EvaluationResponse> {
    try {
      await audioRecorder.startRecording();

      return new Promise((resolve, reject) => {
        (window as any).voiceTestResolve = resolve;
        (window as any).voiceTestReject = reject;
      });
    } catch (error) {
      await audioRecorder.cancelRecording();
      throw error;
    }
  }

  async stopAndEvaluate(
    testType: 'FAQ' | 'MMSE' | 'ADAS',
    questionRef: any
  ): Promise<EvaluationResponse> {
    try {
      const recording = await audioRecorder.stopRecording();

      if (recording.duration < 1000) {
        throw new Error('Recording too short. Please record again.');
      }

      let result: EvaluationResponse;

      switch (testType) {
        case 'FAQ':
          result = await this.evaluateFAQQuestion(
            recording.uri,
            questionRef.questionNumber
          );
          break;

        case 'MMSE':
          result = await this.evaluateMMSEQuestion(
            recording.uri,
            questionRef.questionType
          );
          break;

        case 'ADAS':
          result = await this.evaluateADASQuestion(
            recording.uri,
            questionRef.questionType
          );
          break;

        default:
          throw new Error(`Unknown test type: ${testType}`);
      }

      console.log(`✅ Question evaluated with score: ${result.score}`);
      return result;
    } catch (error) {
      await audioRecorder.cancelRecording();
      throw error;
    }
  }

  private handleError(error: any): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response?.status === 413) {
        console.error('⚠️ Audio file too large (max 25MB)');
      } else if (axiosError.response?.status === 400) {
        const data = axiosError.response.data as any;
        console.error('⚠️ Validation error:', data.error || data.errors);
      } else if (axiosError.code === 'ECONNREFUSED') {
        console.error('⚠️ Backend server not reachable');
      } else if (axiosError.code === 'ENOTFOUND') {
        console.error('⚠️ Backend URL not found');
      }
    }
  }

  setBackendURL(url: string): void {
    this.axiosInstance.defaults.baseURL = url;
    console.log(`✅ Backend URL updated: ${url}`);
  }
}

export const voiceTestService = new VoiceTestService();
