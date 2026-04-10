# React Native Frontend Integration - Voice Assessment

## Overview

This guide explains how to connect the existing React Native patient portal to the Node.js backend for voice-based cognitive assessment.

---

## Part 1: Frontend Services

### Step 1: Create Audio Recording Service

**File: `services/audioRecorderService.ts`**

```typescript
import * as Audio from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { logger } from './logger';

interface RecordingResult {
  uri: string;
  duration: number;
  mimeType: string;
  size: number;
}

class AudioRecorderService {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;

  async startRecording(): Promise<void> {
    try {
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Audio recording permission denied');
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpiece: false
      });

      // Create recording
      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await this.recording.startAsync();

      logger.info('Audio recording started');
    } catch (error) {
      logger.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<RecordingResult> {
    try {
      if (!this.recording) {
        throw new Error('No active recording');
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();

      if (!uri) {
        throw new Error('No recording URI obtained');
      }

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const size = fileInfo.size || 0;

      // Get duration
      const status = await this.recording.getStatusAsync();
      const duration = status.durationMillis || 0;

      const result: RecordingResult = {
        uri,
        duration,
        mimeType: 'audio/mpeg',
        size
      };

      logger.info(`Recording stopped: ${duration}ms, ${size} bytes`);

      this.recording = null;
      return result;
    } catch (error) {
      logger.error('Failed to stop recording:', error);
      throw error;
    }
  }

  async cancelRecording(): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
        logger.info('Recording cancelled');
      }
    } catch (error) {
      logger.error('Failed to cancel recording:', error);
      throw error;
    }
  }

  async convertToBase64(uri: string): Promise<string> {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      });
      return base64;
    } catch (error) {
      logger.error('Failed to convert recording to base64:', error);
      throw error;
    }
  }

  async playRecording(uri: string): Promise<void> {
    try {
      this.sound = new Audio.Sound();
      await this.sound.loadAsync({ uri });
      await this.sound.playAsync();
    } catch (error) {
      logger.error('Failed to play recording:', error);
      throw error;
    }
  }

  async stopPlayback(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
    } catch (error) {
      logger.error('Failed to stop playback:', error);
    }
  }
}

export const audioRecorder = new AudioRecorderService();
```

---

### Step 2: Create Voice Test Service

**File: `services/voiceTestService.ts`**

```typescript
import axios, { AxiosError } from 'axios';
import * as FileSystem from 'expo-file-system';
import { audioRecorder } from './audioRecorderService';
import { logger } from './logger';

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
  FAQTOTAL?: number;
  TOTAL13?: number;
  severity: string;
}

class VoiceTestService {
  private axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 120000  // 2 minutes for audio processing
  });

  async evaluateFAQQuestion(
    audioUri: string,
    questionNumber: number
  ): Promise<EvaluationResponse> {
    try {
      logger.info(`Evaluating FAQ Q${questionNumber}`);

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
      logger.error(`FAQ Q${questionNumber} evaluation failed:`, error);
      this.handleError(error);
      throw error;
    }
  }

  async evaluateMMSEQuestion(
    audioUri: string,
    questionType: string
  ): Promise<EvaluationResponse> {
    try {
      logger.info(`Evaluating MMSE: ${questionType}`);

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
      logger.error(`MMSE ${questionType} evaluation failed:`, error);
      this.handleError(error);
      throw error;
    }
  }

  async evaluateADASQuestion(
    audioUri: string,
    questionType: string
  ): Promise<EvaluationResponse> {
    try {
      logger.info(`Evaluating ADAS: ${questionType}`);

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
      logger.error(`ADAS ${questionType} evaluation failed:`, error);
      this.handleError(error);
      throw error;
    }
  }

  async submitAssessment(
    submission: AssessmentSubmission
  ): Promise<AssessmentResult> {
    try {
      logger.info(`Submitting ${submission.testType} assessment`);

      const response = await this.axiosInstance.post(
        '/assessment/complete',
        submission
      );

      return response.data;
    } catch (error) {
      logger.error('Assessment submission failed:', error);
      this.handleError(error);
      throw error;
    }
  }

  async recordAndEvaluate(
    testType: 'FAQ' | 'MMSE' | 'ADAS',
    questionNumber: number | string
  ): Promise<EvaluationResponse> {
    try {
      // Start recording
      await audioRecorder.startRecording();

      // Return Promise that waits for user action
      return new Promise((resolve, reject) => {
        // User will call stopAndEvaluate when done
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

      // Validate recording duration (minimum 1 second)
      if (recording.duration < 1000) {
        throw new Error('Recording too short. Please record again.');
      }

      // Evaluate based on test type
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

      logger.info(`Question evaluated with score: ${result.score}`);
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
        logger.error('Audio file too large (max 25MB)');
      } else if (axiosError.response?.status === 400) {
        const data = axiosError.response.data as any;
        logger.error('Validation error:', data.error || data.errors);
      } else if (axiosError.code === 'ECONNREFUSED') {
        logger.error('Backend server not reachable');
      } else if (axiosError.code === 'ENOTFOUND') {
        logger.error('Backend URL not found');
      }
    }
  }

  setBackendURL(url: string): void {
    this.axiosInstance.defaults.baseURL = url;
    logger.info(`Backend URL updated: ${url}`);
  }
}

export const voiceTestService = new VoiceTestService();
```

---

### Step 3: Create Text-to-Speech Service

**File: `services/textToSpeechService.ts`**

```typescript
import * as Speech from 'expo-speech';
import { logger } from './logger';

class TextToSpeechService {
  private isSpeaking = false;

  async speakQuestion(questionText: string, rate = 0.9): Promise<void> {
    try {
      if (this.isSpeaking) {
        logger.warn('Speech already in progress');
        return;
      }

      this.isSpeaking = true;

      await Speech.speak(questionText, {
        rate,
        pitch: 1.0,
        language: 'en'
      });

      logger.info('Speech completed');
    } catch (error) {
      logger.error('Text-to-speech failed:', error);
      throw error;
    } finally {
      this.isSpeaking = false;
    }
  }

  async stopSpeaking(): Promise<void> {
    try {
      await Speech.stop();
      this.isSpeaking = false;
      logger.info('Speech stopped');
    } catch (error) {
      logger.error('Failed to stop speech:', error);
    }
  }

  isSpeakingNow(): boolean {
    return this.isSpeaking;
  }
}

export const textToSpeechService = new TextToSpeechService();
```

---

## Part 2: Frontend Components

### Step 4: Create Voice Test Conductor Component

**File: `app/(app)/patient/voice-test-conductor.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { audioRecorder } from '@/services/audioRecorderService';
import { voiceTestService } from '@/services/voiceTestService';
import { textToSpeechService } from '@/services/textToSpeechService';
import { logger } from '@/services/logger';
import { Ionicons } from '@expo/vector-icons';

interface Question {
  id: number;
  text: string;
  maxScore: number;
}

const FAQ_QUESTIONS: Question[] = [
  {
    id: 1,
    text: 'In the past 4 weeks, has the patient had difficulty writing checks, paying bills, or balancing a checkbook?',
    maxScore: 3
  },
  {
    id: 2,
    text: 'Have they had difficulty assembling tax records, business affairs, or handling papers?',
    maxScore: 3
  },
  {
    id: 3,
    text: 'Can they shop alone for clothes, household necessities, or groceries?',
    maxScore: 3
  },
  // ... add remaining questions
];

export default function VoiceTestConductor() {
  const router = useRouter();
  const { testType } = useLocalSearchParams() as { testType: string };

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});

  const questions = testType === 'FAQ' ? FAQ_QUESTIONS : [];
  const currentQ = questions[currentQuestion];

  const handleStartRecording = async () => {
    try {
      // Speak the question
      await textToSpeechService.speakQuestion(currentQ.text);

      // Wait a moment for speech to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Start recording
      setIsRecording(true);
      await audioRecorder.startRecording();
    } catch (error) {
      Alert.alert('Error', 'Failed to start recording');
      logger.error('Recording error:', error);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsRecording(false);
      setIsEvaluating(true);

      const recording = await audioRecorder.stopRecording();

      // Send to backend for evaluation
      const result = await voiceTestService.evaluateFAQQuestion(
        recording.uri,
        currentQuestion + 1
      );

      // Store response
      const qKey = `q${currentQuestion + 1}`;
      setResponses(prev => ({
        ...prev,
        [qKey]: result.score
      }));

      setTranscripts(prev => ({
        ...prev,
        [qKey]: result.transcript
      }));

      setIsEvaluating(false);

      // Move to next question or submit
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
      } else {
        handleSubmitAssessment();
      }
    } catch (error) {
      setIsRecording(false);
      setIsEvaluating(false);
      Alert.alert('Error', 'Failed to evaluate response');
      logger.error('Evaluation error:', error);
    }
  };

  const handleSubmitAssessment = async () => {
    try {
      const userId = 'patient_id'; // Get from auth context

      const submission = {
        patientId: userId,
        testType: testType as 'FAQ' | 'MMSE' | 'ADAS-Cog 13',
        responses,
        caregiverId: undefined
      };

      const result = await voiceTestService.submitAssessment(submission);

      Alert.alert(
        'Assessment Complete',
        `Total Score: ${result.FAQTOTAL || result.MMSCORE || result.TOTAL13}\nSeverity: ${result.severity}`,
        [
          {
            text: 'View Results',
            onPress: () => {
              router.push({
                pathname: '/patient/voice-session-summary',
                params: { sessionId: result.sessionId }
              });
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit assessment');
      logger.error('Submission error:', error);
    }
  };

  if (!currentQ) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.testTitle}>{testType}</Text>
        <Text style={styles.progressText}>
          Question {currentQuestion + 1} of {questions.length}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%`, backgroundColor: Colors.primary }
            ]}
          />
        </View>
      </View>

      {/* Question */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{currentQ.text}</Text>
      </View>

      {/* Recording Status */}
      {isEvaluating ? (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.statusText}>Evaluating response...</Text>
        </View>
      ) : (
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording && styles.recordingActive
            ]}
            onPress={isRecording ? handleStopRecording : handleStartRecording}
            disabled={isEvaluating}
          >
            <Ionicons
              name={isRecording ? 'stop-circle' : 'mic'}
              size={40}
              color="white"
            />
            <Text style={styles.recordButtonText}>
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Response Display */}
      {responses[`q${currentQuestion + 1}`] !== undefined && (
        <View style={styles.responseContainer}>
          <Text style={styles.scoreLabel}>Score:</Text>
          <Text style={styles.scoreValue}>
            {responses[`q${currentQuestion + 1}`]} / {currentQ.maxScore}
          </Text>
          {transcripts[`q${currentQuestion + 1}`] && (
            <Text style={styles.transcriptText}>
              Transcript: {transcripts[`q${currentQuestion + 1}`]}
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  contentContainer: {
    padding: 20
  },
  header: {
    marginBottom: 30
  },
  testTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8
  },
  progressText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.lightGray,
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 4
  },
  questionContainer: {
    backgroundColor: Colors.cardBackground,
    padding: 20,
    borderRadius: 12,
    marginBottom: 30
  },
  questionText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24
  },
  statusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  statusText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary
  },
  controlsContainer: {
    alignItems: 'center',
    marginBottom: 30
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  recordingActive: {
    backgroundColor: Colors.danger
  },
  recordButtonText: {
    color: 'white',
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center'
  },
  responseContainer: {
    backgroundColor: Colors.successLight,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20
  },
  scoreLabel: {
    fontSize: 12,
    color: Colors.textSecondary
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.success,
    marginVertical: 8
  },
  transcriptText: {
    fontSize: 13,
    color: Colors.text,
    marginTop: 8,
    fontStyle: 'italic'
  }
});
```

---

### Step 5: Update Patient Dashboard

**File: `app/(app)/patient/dashboard.tsx` (updated)**

Add voice test option:

```typescript
// After existing button imports, add:

<TouchableOpacity
  style={[styles.testCard, styles.voiceTestCard]}
  onPress={() =>
    router.push({
      pathname: '/patient/voice-test-conductor',
      params: { testType: 'FAQ' }
    })
  }
>
  <LinearGradient
    colors={['#667eea', '#764ba2']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.gradient}
  >
    <Ionicons name="mic" size={32} color="white" />
    <Text style={styles.testCardTitle}>Voice Assessment</Text>
    <Text style={styles.testCardSubtitle}>NEW - Speak your responses</Text>
  </LinearGradient>
</TouchableOpacity>
```

---

## Part 3: Configuration

### Step 6: Environment Setup

**File: `.env.local`**

```env
BACKEND_URL=http://192.168.1.100:5000/api
# For iOS simulator:
# BACKEND_URL=http://localhost:5000/api

# For Android emulator:
# BACKEND_URL=http://10.0.2.2:5000/api
```

---

### Step 7: Configure Axios Instance

**File: `services/apiClient.ts`**

```typescript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { logger } from './logger';

const apiClient = axios.create({
  baseURL: process.env.BACKEND_URL || 'http://localhost:5000/api',
  timeout: 120000
});

// Add auth token if available
apiClient.interceptors.request.use(async config => {
  try {
    const token = await SecureStore.getItemAsync('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    logger.error('Failed to add auth token:', error);
  }
  return config;
});

// Log responses
apiClient.interceptors.response.use(
  response => {
    logger.info(`API ${response.config.method?.toUpperCase()} ${response.status}`);
    return response;
  },
  error => {
    logger.error('API Error:', error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## Part 4: Installation

### Install Required Packages

```bash
cd /path/to/react_native_project

# Audio & Speech
npx expo install expo-av expo-speech

# For drawing canvas (next phase)
npm install react-native-signature-canvas

# Ensure axios is installed
npm install axios
```

### Update `app.json`

```json
{
  "plugins": [
    [
      "expo-av",
      {
        "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone to record audio responses."
      }
    ],
    [
      "expo-speech",
      {
        "speechRecognition": "Allow $(PRODUCT_NAME) to use speech recognition."
      }
    ]
  ]
}
```

---

## Part 5: Running End-to-End

### Backend

```bash
cd alztwin-backend
npm run dev

# Expected: Server running on port 5000
```

### Frontend

```bash
cd react_native_project

# Update .env.local with your backend URL (get IP from backend logs)
# Example: http://192.168.1.100:5000/api

npm start
# Press 'i' for iOS or 'a' for Android
```

---

## Part 6: Testing

### Test FAQ Question Flow

1. Backend running: ✅ http://localhost:5000/api
2. Frontend running: ✅ http://localhost:8081
3. Navigate to Patient Dashboard
4. Tap "Voice Assessment"
5. Tap "Start Recording"
6. Speak response to FAQ question
7. Tap "Stop Recording"
8. Wait for Gemini evaluation
9. See score and transcript
10. Move to next question
11. Submit after all questions

### Curl Test (Backend Only)

```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Test FAQ evaluation
curl -X POST http://localhost:5000/api/assessment/faq/question \
  -F "audio=@/path/to/test-audio.wav" \
  -F "questionNumber=1"
```

---

## Troubleshooting

### Backend Issues

| Issue | Solution |
|-------|----------|
| "Firebase initialization failed" | Check .env - ensure FIREBASE_PRIVATE_KEY has correct format |
| "Gemini API error" | Verify GEMINI_API_KEY is valid in .env |
| "Port 5000 already in use" | Change PORT in .env or kill process |

### Frontend Issues

| Issue | Solution |
|-------|----------|
| "Backend not reachable" | Verify backend IP in .env (use `ipconfig` on Windows) |
| "Audio permission denied" | Grant microphone permission in app settings |
| "Recording too short" | Speak louder/longer (minimum 1 second) |
| "Invalid JSON response" | Check Gemini API quota/rate limits |

---

## Next Steps

1. ✅ Backend setup complete
2. ✅ Frontend services implemented
3. ✅ Voice test conductor component
4. ⏳ Drawing canvas for MMSE writing/ADAS praxis
5. ⏳ Caregiver checkboxes for mixed input questions
6. ⏳ Complete MMSE & ADAS implementations
7. ⏳ Batch audio processing for observational scoring
8. ⏳ E2E testing and performance optimization
