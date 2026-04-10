import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../../firebaseConfig';
import ClinicalScoringService from '../../../services/clinicalScoringService';
import PatientTestResultsService from '../../../services/patientTestResultsService';

interface Question {
  key: string;
  title: string;
  description: string;
  maxScore: number;
  instruction: string;
}

export default function ConductTest() {
  const router = useRouter();
  const { testType } = useLocalSearchParams() as { testType: string };
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});

  // Define questions for each test type
  const getTestQuestions = (): Question[] => {
    switch (testType) {
      case 'ADAS-Cog 13':
        return [
          {
            key: 'wordRecall',
            title: 'Word Recall',
            description: 'How many words did the patient forget across all three trials?',
            maxScore: 10,
            instruction: 'Score 0-10 based on number of words forgotten',
          },
          {
            key: 'commands',
            title: 'Commands',
            description: 'How many steps did the patient fail to follow?',
            maxScore: 5,
            instruction: '1 point for each step failed (out of 5)',
          },
          {
            key: 'constructionalPraxis',
            title: 'Constructional Praxis',
            description: 'Accuracy of copying geometric shapes?',
            maxScore: 5,
            instruction: 'Score based on accuracy of drawing',
          },
          {
            key: 'namingObjects',
            title: 'Naming Objects/Fingers',
            description: 'How many items did the patient fail to name?',
            maxScore: 5,
            instruction: 'Points for number of items failed',
          },
          {
            key: 'ideationalPraxis',
            title: 'Ideational Praxis',
            description: 'Missing steps in task (e.g., mailing a letter)?',
            maxScore: 5,
            instruction: 'Points for missing steps in multi-step task',
          },
          {
            key: 'orientation',
            title: 'Orientation',
            description: 'Person, Place, Time - incorrect answers?',
            maxScore: 8,
            instruction: '1 point for every incorrect answer',
          },
          {
            key: 'wordRecognition',
            title: 'Word Recognition',
            description: 'Average number of errors across trials?',
            maxScore: 12,
            instruction: 'Average errors in word recognition',
          },
          {
            key: 'language',
            title: 'Language',
            description: 'Quality of spoken language?',
            maxScore: 5,
            instruction: 'Clinical rating of speech ability (0-5)',
          },
          {
            key: 'comprehension',
            title: 'Comprehension',
            description: 'Ability to understand spoken language?',
            maxScore: 5,
            instruction: 'Clinical rating of comprehension (0-5)',
          },
          {
            key: 'wordFindingDifficulty',
            title: 'Word Finding Difficulty',
            description: 'Difficulty finding words in conversation?',
            maxScore: 5,
            instruction: 'Clinical rating of word-finding (0-5)',
          },
          {
            key: 'instructionRecall',
            title: 'Instruction Recall',
            description: 'How often does patient forget task rules?',
            maxScore: 5,
            instruction: 'Rating of forgetting rules (0-5)',
          },
          {
            key: 'concentration',
            title: 'Concentration/Distractibility',
            description: 'How easily is patient distracted?',
            maxScore: 5,
            instruction: 'Rating of distractibility (0-5)',
          },
          {
            key: 'delayedWordRecall',
            title: 'Delayed Word Recall',
            description: 'Number of words forgotten after delay?',
            maxScore: 10,
            instruction: 'Score 0-10 based on words forgotten after delay',
          },
        ];

      case 'FAQ':
        return [
          {
            key: 'writingChecks',
            title: 'Writing Checks',
            description: 'Ability to write checks, pay bills, or balance checkbook?',
            maxScore: 3,
            instruction: '0=Normal, 1=Difficulty, 2=Assistance needed, 3=Dependent',
          },
          {
            key: 'taxRecords',
            title: 'Tax Records',
            description: 'Ability to assemble tax records or business papers?',
            maxScore: 3,
            instruction: '0=Normal, 1=Difficulty, 2=Assistance needed, 3=Dependent',
          },
          {
            key: 'shoppingAlone',
            title: 'Shopping Alone',
            description: 'Can patient shop alone for clothes or groceries?',
            maxScore: 3,
            instruction: '0=Normal, 1=Difficulty, 2=Assistance needed, 3=Dependent',
          },
          {
            key: 'playingGames',
            title: 'Playing Games',
            description: 'Ability to play games or work on hobbies?',
            maxScore: 3,
            instruction: '0=Normal, 1=Difficulty, 2=Assistance needed, 3=Dependent',
          },
          {
            key: 'heatingWater',
            title: 'Heating Water',
            description: 'Can patient heat water, make coffee, turn off stove?',
            maxScore: 3,
            instruction: '0=Normal, 1=Difficulty, 2=Assistance needed, 3=Dependent',
          },
          {
            key: 'preparingMeal',
            title: 'Preparing Meal',
            description: 'Ability to prepare a balanced meal?',
            maxScore: 3,
            instruction: '0=Normal, 1=Difficulty, 2=Assistance needed, 3=Dependent',
          },
          {
            key: 'currentEvents',
            title: 'Current Events',
            description: 'Can patient keep track of current events?',
            maxScore: 3,
            instruction: '0=Normal, 1=Difficulty, 2=Assistance needed, 3=Dependent',
          },
          {
            key: 'bookOrTV',
            title: 'Book or TV',
            description: 'Ability to pay attention to and understand media?',
            maxScore: 3,
            instruction: '0=Normal, 1=Difficulty, 2=Assistance needed, 3=Dependent',
          },
          {
            key: 'rememberingAppointments',
            title: 'Remembering Appointments',
            description: 'Can patient remember appointments, occasions, medications?',
            maxScore: 3,
            instruction: '0=Normal, 1=Difficulty, 2=Assistance needed, 3=Dependent',
          },
          {
            key: 'travelingOutside',
            title: 'Traveling Out',
            description: 'Ability to travel out of neighborhood using transport?',
            maxScore: 3,
            instruction: '0=Normal, 1=Difficulty, 2=Assistance needed, 3=Dependent',
          },
        ];

      case 'MMSE':
        return [
          // Orientation (Time)
          {
            key: 'orientationYear',
            title: 'Year',
            description: 'Can patient state the correct year?',
            maxScore: 1,
            instruction: '1 point if correct, 0 if incorrect',
          },
          {
            key: 'orientationSeason',
            title: 'Season',
            description: 'Can patient state the correct season?',
            maxScore: 1,
            instruction: '1 point if correct, 0 if incorrect',
          },
          {
            key: 'orientationMonth',
            title: 'Month',
            description: 'Can patient state the correct month?',
            maxScore: 1,
            instruction: '1 point if correct, 0 if incorrect',
          },
          {
            key: 'orientationDate',
            title: 'Date',
            description: 'Can patient state the correct date?',
            maxScore: 1,
            instruction: '1 point if correct, 0 if incorrect',
          },
          {
            key: 'orientationDay',
            title: 'Day of Week',
            description: 'Can patient state the correct day of week?',
            maxScore: 1,
            instruction: '1 point if correct, 0 if incorrect',
          },
          // Orientation (Place)
          {
            key: 'orientationState',
            title: 'State',
            description: 'Can patient state the correct state?',
            maxScore: 1,
            instruction: '1 point if correct, 0 if incorrect',
          },
          {
            key: 'orientationCounty',
            title: 'County',
            description: 'Can patient state the correct county?',
            maxScore: 1,
            instruction: '1 point if correct, 0 if incorrect',
          },
          {
            key: 'orientationTown',
            title: 'Town',
            description: 'Can patient state the correct town/city?',
            maxScore: 1,
            instruction: '1 point if correct, 0 if incorrect',
          },
          {
            key: 'orientationHospital',
            title: 'Hospital/Building',
            description: 'Can patient name the hospital or building?',
            maxScore: 1,
            instruction: '1 point if correct, 0 if incorrect',
          },
          {
            key: 'orientationFloor',
            title: 'Floor',
            description: 'Can patient state the correct floor?',
            maxScore: 1,
            instruction: '1 point if correct, 0 if incorrect',
          },
          // Registration
          {
            key: 'registrationApple',
            title: 'Registration - Apple',
            description: 'Can patient repeat the word "Apple"?',
            maxScore: 1,
            instruction: '1 point if repeated correctly',
          },
          {
            key: 'registrationPenny',
            title: 'Registration - Penny',
            description: 'Can patient repeat the word "Penny"?',
            maxScore: 1,
            instruction: '1 point if repeated correctly',
          },
          {
            key: 'registrationTable',
            title: 'Registration - Table',
            description: 'Can patient repeat the word "Table"?',
            maxScore: 1,
            instruction: '1 point if repeated correctly',
          },
          // Attention & Calculation
          {
            key: 'attentionSerialSevens',
            title: 'Serial 7s',
            description: 'How many correct subtractions (100-7, subtract 7 repeatedly)?',
            maxScore: 5,
            instruction: '1 point for each correct subtraction (max 5)',
          },
          // Recall
          {
            key: 'recallApple',
            title: 'Recall - Apple',
            description: 'Can patient recall the word "Apple"?',
            maxScore: 1,
            instruction: '1 point if recalled correctly',
          },
          {
            key: 'recallPenny',
            title: 'Recall - Penny',
            description: 'Can patient recall the word "Penny"?',
            maxScore: 1,
            instruction: '1 point if recalled correctly',
          },
          {
            key: 'recallTable',
            title: 'Recall - Table',
            description: 'Can patient recall the word "Table"?',
            maxScore: 1,
            instruction: '1 point if recalled correctly',
          },
          // Language - Naming
          {
            key: 'namingPencil',
            title: 'Naming Pencil',
            description: 'Can patient name a pencil?',
            maxScore: 1,
            instruction: '1 point if named correctly',
          },
          {
            key: 'namingWatch',
            title: 'Naming Watch',
            description: 'Can patient name a watch?',
            maxScore: 1,
            instruction: '1 point if named correctly',
          },
          // Language - Repetition
          {
            key: 'repetition',
            title: 'Repetition',
            description: 'Can patient repeat "No ifs, ands, or buts"?',
            maxScore: 1,
            instruction: '1 point if repeated correctly',
          },
          // Language - 3-Step Command
          {
            key: 'threeStepCommand',
            title: '3-Step Command',
            description: 'How many steps of "Take paper in right hand, fold in half, put on floor" were followed?',
            maxScore: 3,
            instruction: '1 point for each step correctly followed',
          },
          // Language - Reading
          {
            key: 'reading',
            title: 'Reading',
            description: 'Can patient read and obey "CLOSE YOUR EYES"?',
            maxScore: 1,
            instruction: '1 point if read and obeyed correctly',
          },
          // Language - Writing
          {
            key: 'writing',
            title: 'Writing',
            description: 'Can patient write a complete, logical sentence?',
            maxScore: 1,
            instruction: '1 point if sentence is complete and logical',
          },
          // Language - Copying
          {
            key: 'copying',
            title: 'Copying',
            description: 'Can patient copy intersecting pentagons?',
            maxScore: 1,
            instruction: '1 point for correct copying',
          },
        ];

      default:
        return [];
    }
  };

  const questions = useMemo(() => getTestQuestions(), [testType]);
  const currentQuestion = questions[currentStep];

  const handleScore = (value: number) => {
    setResponses((prev) => ({
      ...prev,
      [currentQuestion.key]: Math.min(value, currentQuestion.maxScore),
    }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    try {
      setLoading(true);

      const patientId = auth.currentUser?.uid;
      if (!patientId) {
        Alert.alert('Error', 'Patient ID not found');
        return;
      }

      let score = 0;
      let maxScore = 0;
      let severity = '';

      if (testType === 'ADAS-Cog 13') {
        score = ClinicalScoringService.calculateADASCog13Score(
          responses as any
        );
        maxScore = 85;
        severity = ClinicalScoringService.getADASCog13Severity(score);
      } else if (testType === 'FAQ') {
        score = ClinicalScoringService.calculateFAQScore(responses as any);
        maxScore = 30;
        severity = ClinicalScoringService.getFAQSeverity(score);
      } else if (testType === 'MMSE') {
        score = ClinicalScoringService.calculateMMSEScore(responses as any);
        maxScore = 30;
        severity = ClinicalScoringService.getMMSESeverity(score);
      }

      // Store in Firebase
      await PatientTestResultsService.storeTestResult(
        patientId,
        testType as 'ADAS-Cog 13' | 'FAQ' | 'MMSE',
        score,
        maxScore,
        severity,
        responses
      );

      // Show results
      const summary = ClinicalScoringService.formatTestResultSummary(
        testType,
        score,
        maxScore
      );

      Alert.alert(
        'Test Completed',
        `Your ${testType} Score: ${score}/${maxScore}\n\nSeverity: ${severity}\n\n${summary.interpretation}`,
        [
          {
            text: 'View Results',
            onPress: () => {
              router.push({
                pathname: '/(app)/patient/test-results' as any,
                params: { testType },
              } as any);
            },
          },
          {
            text: 'Back to Dashboard',
            onPress: () => {
              router.push('/(app)/patient/dashboard' as any);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error finishing test:', error);
      Alert.alert('Error', 'Failed to save test results');
    } finally {
      setLoading(false);
    }
  };

  const currentScore = responses[currentQuestion.key] || 0;
  const progress = ((currentStep + 1) / questions.length) * 100;

  const headerColors =
    testType === 'ADAS-Cog 13'
      ? ['#6366f1', '#4f46e5']
      : testType === 'FAQ'
        ? ['#8b5cf6', '#7c3aed']
        : ['#ec4899', '#db2777'];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={headerColors as any} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{testType} Assessment</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${progress}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {currentStep + 1} of {questions.length}
          </Text>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.questionCard}>
          <Text style={styles.questionNumber}>Question {currentStep + 1}</Text>
          <Text style={styles.questionTitle}>{currentQuestion.title}</Text>
          <Text style={styles.questionDescription}>{currentQuestion.description}</Text>
          <Text style={styles.instruction}>{currentQuestion.instruction}</Text>

          {/* Score Input */}
          <View style={styles.scoreSection}>
            <Text style={styles.scoreLabel}>Score</Text>
            <View style={styles.scoreDisplay}>
              <Text style={styles.scoreValue}>{currentScore}</Text>
              <Text style={styles.scoreMax}>/ {currentQuestion.maxScore}</Text>
            </View>

            {/* Quick Score Buttons */}
            <View style={styles.scoreButtonsContainer}>
              {Array.from({ length: currentQuestion.maxScore + 1 }).map(
                (_, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.scoreButton,
                      currentScore === index && styles.scoreButtonActive,
                    ]}
                    onPress={() => handleScore(index)}
                  >
                    <Text
                      style={[
                        styles.scoreButtonText,
                        currentScore === index && styles.scoreButtonTextActive,
                      ]}
                    >
                      {index}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.navButton,
            currentStep === 0 && styles.navButtonDisabled,
          ]}
          onPress={handlePrevious}
          disabled={currentStep === 0}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={currentStep === 0 ? '#cbd5e1' : '#fff'}
          />
          <Text
            style={[
              styles.navButtonText,
              currentStep === 0 && styles.navButtonTextDisabled,
            ]}
          >
            Previous
          </Text>
        </TouchableOpacity>

        {currentStep === questions.length - 1 ? (
          <TouchableOpacity
            style={[styles.finishButton, loading && styles.buttonDisabled]}
            onPress={handleFinish}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.finishButtonText}>Complete Test</Text>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.navButton} onPress={handleNext}>
            <Text style={styles.navButtonText}>Next</Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  progressContainer: {
    gap: 8,
  },
  progressBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 24,
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  questionNumber: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 8,
  },
  questionDescription: {
    fontSize: 15,
    color: '#475569',
    marginTop: 12,
    lineHeight: 22,
  },
  instruction: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  scoreSection: {
    marginTop: 24,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
  },
  scoreValue: {
    fontSize: 42,
    fontWeight: '700',
    color: '#6366f1',
  },
  scoreMax: {
    fontSize: 20,
    fontWeight: '600',
    color: '#94a3b8',
    marginLeft: 4,
  },
  scoreButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  scoreButton: {
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: '18%',
  },
  scoreButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#4f46e5',
  },
  scoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  scoreButtonTextActive: {
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 24,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  navButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  navButtonTextDisabled: {
    color: '#cbd5e1',
  },
  finishButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  finishButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
