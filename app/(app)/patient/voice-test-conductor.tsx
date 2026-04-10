import { Colors } from '@/constants/theme';
import { audioRecorder } from '@/services/audioRecorderService';
import { authService } from '@/services/authService';
import { logger } from '@/services/logger';
import { textToSpeechService } from '@/services/textToSpeechService';
import { voiceTestService } from '@/services/voiceTestService';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

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
  {
    id: 4,
    text: 'Can they play a game of skill, work on a hobby, or do a complex activity?',
    maxScore: 3
  },
  {
    id: 5,
    text: 'Are they able to heat water, make coffee, and safely turn off the stove?',
    maxScore: 3
  },
  {
    id: 6,
    text: 'Can they prepare a balanced meal on their own?',
    maxScore: 3
  },
  {
    id: 7,
    text: 'Are they able to keep track of current events or neighborhood happenings?',
    maxScore: 3
  },
  {
    id: 8,
    text: 'Can they pay attention to, understand, and discuss a TV show, book, or magazine?',
    maxScore: 3
  },
  {
    id: 9,
    text: 'Do they remember appointments, family occasions, holidays, and take medications regularly?',
    maxScore: 3
  },
  {
    id: 10,
    text: 'Can they travel out of neighborhood, drive, or arrange public transportation?',
    maxScore: 3
  }
];

const MMSE_QUESTIONS: Question[] = [
  { id: 1, text: 'What is the year?', maxScore: 1 },
  { id: 2, text: 'What is the season?', maxScore: 1 },
  { id: 3, text: 'What is the month?', maxScore: 1 },
  { id: 4, text: 'What is the date?', maxScore: 1 },
  { id: 5, text: 'What is the day of the week?', maxScore: 1 }
];

const ADAS_QUESTIONS: Question[] = [
  { id: 1, text: 'Word Recall: Do you remember the words from earlier?', maxScore: 10 },
  { id: 2, text: 'Comprehension: Do you understand what I am saying?', maxScore: 5 },
  { id: 3, text: 'Delayed Word Recall: Can you repeat the words from the beginning?', maxScore: 10 }
];

export default function VoiceTestConductor() {
  const router = useRouter();
  const { testType = 'FAQ' } = useLocalSearchParams() as { testType: string };

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [isInitializing, setIsInitializing] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeComponent();
  }, []);

  const initializeComponent = async () => {
    try {
      // Wait for authentication
      const user = await authService.waitForAuth();
      if (!user) {
        setError('User not authenticated');
        router.push('/(auth)/SignInScreen');
        return;
      }
      setPatientId(user.uid);
      setIsInitializing(false);
    } catch (err) {
      logger.error(`Initialization error: ${err}`);
      setError('Failed to initialize assessment');
      setIsInitializing(false);
    }
  };

  const getQuestions = (): Question[] => {
    switch (testType) {
      case 'MMSE':
        return MMSE_QUESTIONS;
      case 'ADAS':
        return ADAS_QUESTIONS;
      case 'FAQ':
      default:
        return FAQ_QUESTIONS;
    }
  };

  const questions = getQuestions();
  const currentQ = questions[currentQuestion];

  const handleStartRecording = async () => {
    if (!currentQ) return;

    try {
      setError(null);
      
      // Speak the question
      await textToSpeechService.speakQuestion(currentQ.text);
      
      // Wait 2 seconds before recording
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if still on same question
      if (currentQuestion >= questions.length) return;

      setIsRecording(true);
      await audioRecorder.startRecording();
      logger.info('Recording started');
    } catch (error) {
      logger.error(`Recording start error: ${error}`);
      setIsRecording(false);
      if (error instanceof Error && error.message.includes('Permission')) {
        Alert.alert('Permission Required', 'Please enable microphone access in settings');
      } else {
        Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
      }
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsRecording(false);
      setIsEvaluating(true);
      setError(null);

      const recording = await audioRecorder.stopRecording();

      if (!recording) {
        throw new Error('Recording failed');
      }

      if (recording.duration < 1000) {
        Alert.alert('Recording Too Short', 'Please record at least 1 second of audio.');
        setIsEvaluating(false);
        return;
      }

      // Determine evaluation method based on test type
      let result;
      const questionNumString = String(currentQuestion + 1);

      switch (testType) {
        case 'MMSE':
          result = await voiceTestService.evaluateMMSEQuestion(
            recording.uri,
            questionNumString
          );
          break;
        case 'ADAS':
          result = await voiceTestService.evaluateADASQuestion(
            recording.uri,
            questionNumString
          );
          break;
        case 'FAQ':
        default:
          result = await voiceTestService.evaluateFAQQuestion(
            recording.uri,
            currentQuestion + 1
          );
      }

      const qKey = `q${questionNumString}`;
      setResponses(prev => ({
        ...prev,
        [qKey]: result.score
      }));

      setTranscripts(prev => ({
        ...prev,
        [qKey]: result.transcript
      }));

      logger.info(`Question ${questionNumString} evaluated: score=${result.score}`);
      setIsEvaluating(false);

      if (currentQuestion < questions.length - 1) {
        // Move to next question
        setCurrentQuestion(prev => prev + 1);
      } else {
        // All questions completed
        handleSubmitAssessment();
      }
    } catch (error) {
      setIsRecording(false);
      setIsEvaluating(false);
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Evaluation error: ${errorMsg}`);

      if (errorMsg.includes('file too large')) {
        Alert.alert('File Too Large', 'Audio file exceeds 25MB limit');
      } else if (errorMsg.includes('MIME type')) {
        Alert.alert('Invalid Format', 'Please use supported audio format (MP3, WAV, OGG, M4A)');
      } else if (errorMsg.includes('Connection')) {
        Alert.alert('Connection Error', 'Cannot reach server. Please check your connection.');
      } else {
        Alert.alert('Evaluation Error', `Failed to evaluate response: ${errorMsg}`);
      }
    }
  };

  const handleSubmitAssessment = async () => {
    try {
      if (!patientId) {
        throw new Error('Patient ID not available');
      }

      // Map test type to backend format
      let backendTestType: 'FAQ' | 'MMSE' | 'ADAS-Cog 13' = 'FAQ';
      if (testType === 'MMSE') {
        backendTestType = 'MMSE';
      } else if (testType === 'ADAS') {
        backendTestType = 'ADAS-Cog 13';
      }

      const submission = {
        patientId,
        testType: backendTestType,
        responses,
        caregiverId: undefined
      };

      const result = await voiceTestService.submitAssessment(submission);

      logger.info(`Assessment submitted: ${result.sessionId}`);

      const scoreField = 
        testType === 'MMSE' ? 'MMSCORE' : 
        testType === 'ADAS' ? 'TOTAL13' : 
        'FAQTOTAL';
      const score = result[scoreField] || 0;

      Alert.alert(
        'Assessment Complete!',
        `Total Score: ${score}\n\nSeverity: ${result.severity}`,
        [
          {
            text: 'View Results',
            onPress: () => {
              router.push({
                pathname: '/(app)/patient/voice-session-summary' as any,
                params: { sessionId: result.sessionId }
              });
            }
          },
          {
            text: 'Back to Dashboard',
            onPress: () => {
              router.push('/(app)/patient/dashboard' as any);
            }
          }
        ]
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Submission error: ${errorMsg}`);
      Alert.alert('Submission Error', `Failed to submit assessment: ${errorMsg}`);
    }
  };

  if (isInitializing) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 16, color: '#666' }}>Initializing assessment...</Text>
      </View>
    );
  }

  if (error || !currentQ) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Ionicons name="alert-circle" size={48} color="#f44336" />
        <Text style={{ marginTop: 16, fontSize: 18, fontWeight: '600', color: '#000', textAlign: 'center' }}>
          {error || 'Error loading assessment'}
        </Text>
        <TouchableOpacity
          style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 8 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.testTitle}>{testType}</Text>
        <Text style={styles.progressText}>
          Question {currentQuestion + 1} of {questions.length}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { 
                width: `${progress}%`,
                backgroundColor: Colors.primary
              }
            ]}
          />
        </View>
      </View>

      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{currentQ.text}</Text>
      </View>

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

      {responses[`q${String(currentQuestion + 1)}`] !== undefined && (
        <View style={styles.responseContainer}>
          <Text style={styles.scoreLabel}>Score:</Text>
          <Text style={styles.scoreValue}>
            {responses[`q${String(currentQuestion + 1)}`]} / {currentQ.maxScore}
          </Text>
          {transcripts[`q${String(currentQuestion + 1)}`] && (
            <Text style={styles.transcriptText}>
              Transcript: {transcripts[`q${String(currentQuestion + 1)}`]}
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
    color: '#000',
    marginBottom: 8
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 4
  },
  questionContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5
  },
  questionText: {
    fontSize: 16,
    color: '#000',
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
    color: '#666'
  },
  controlsContainer: {
    alignItems: 'center',
    marginBottom: 30
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center'
  },
  recordingActive: {
    backgroundColor: '#ff6b6b'
  },
  recordButtonText: {
    color: 'white',
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center'
  },
  responseContainer: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666'
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4caf50',
    marginVertical: 8
  },
  transcriptText: {
    fontSize: 13,
    color: '#000',
    marginTop: 8,
    fontStyle: 'italic'
  }
});
