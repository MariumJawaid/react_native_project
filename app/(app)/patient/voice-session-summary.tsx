import { Colors } from '@/constants/theme';
import { db } from '@/firebaseConfig';
import { logger } from '@/services/logger';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface AssessmentResult {
  sessionId: string;
  testType: string;
  completedAt: any;
  FAQTOTAL?: number;
  TOTAL13?: number;
  MMSCORE?: number;
  severity: string;
  responses: Record<string, number>;
  metadata?: {
    completionRate?: number;
    duration?: number;
  };
}

export default function VoiceSessionSummary() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams() as { sessionId: string };
  
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setLoading(false);
      return;
    }
    loadAssessment();
  }, [sessionId]);

  const loadAssessment = async () => {
    try {
      setLoading(true);
      setError(null);

      const docRef = await getDocs(
        query(collection(db, 'voiceAssessmentResults'), where('sessionId', '==', sessionId))
      );
      
      if (!docRef.empty) {
        const data = docRef.docs[0].data() as AssessmentResult;
        setAssessment(data);
        logger.info(`Assessment loaded: ${sessionId}`);
      } else {
        setError('Assessment not found');
        logger.warn(`Assessment not found: ${sessionId}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to load assessment: ${errorMsg}`);
      setError(`Failed to load assessment: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 16, color: '#666' }}>Loading results...</Text>
      </View>
    );
  }

  if (error || !assessment) {
    return (
      <View style={[styles.container, styles.centered, { paddingHorizontal: 20 }]}>
        <Ionicons name="alert-circle" size={48} color="#f44336" />
        <Text style={[styles.errorText, { marginTop: 16 }]}>
          {error || 'Assessment not found'}
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

  // Determine which score to display
  let scoreValue = 0;
  let scoreLabel = 'Score';
  let maxScore = 30;

  if (assessment.FAQTOTAL !== undefined) {
    scoreValue = assessment.FAQTOTAL;
    scoreLabel = 'FAQ Total';
    maxScore = 30;
  } else if (assessment.MMSCORE !== undefined) {
    scoreValue = assessment.MMSCORE;
    scoreLabel = 'MMSE Score';
    maxScore = 30;
  } else if (assessment.TOTAL13 !== undefined) {
    scoreValue = assessment.TOTAL13;
    scoreLabel = 'ADAS Total';
    maxScore = 85;
  }

  // Format completion date
  let completionDate = 'Unknown date';
  try {
    if (assessment.completedAt) {
      const dateObj = assessment.completedAt.toDate?.() || new Date(assessment.completedAt);
      completionDate = dateObj.toLocaleString();
    }
  } catch (err) {
    logger.warn('Error formatting date');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assessment Results</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Test Type Card */}
      <View style={[styles.card, styles.testCard]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
          <Text style={[styles.cardLabel, { marginLeft: 8 }]}>{assessment.testType} Assessment</Text>
        </View>
        <Text style={styles.cardDate}>{completionDate}</Text>
      </View>

      {/* Score Card */}
      <View style={[styles.card, styles.scoreCard]}>
        <Text style={styles.scoreLabel}>{scoreLabel}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={styles.scoreValue}>{scoreValue}</Text>
          <Text style={styles.scoreMax}>/ {maxScore}</Text>
        </View>
        <View style={{ height: 1, backgroundColor: '#e0e0e0', marginVertical: 12 }} />
        <Text style={styles.severityText}>{assessment.severity}</Text>
      </View>

      {/* Completion Rate */}
      {assessment.metadata?.completionRate !== undefined && (
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.fieldLabel}>Completion Rate</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#4caf50' }}>
              {Math.round(assessment.metadata.completionRate * 100)}%
            </Text>
          </View>
        </View>
      )}

      {/* Detailed Responses */}
      <Text style={styles.sectionTitle}>Question Responses</Text>
      <View style={styles.card}>
        {Object.entries(assessment.responses).map(([key, value], index) => (
          <View key={key}>
            <View style={styles.responseItem}>
              <Text style={styles.responseLabel}>{key.toUpperCase()}</Text>
              <Text style={styles.responseScore}>{String(value)}</Text>
            </View>
            {index !== Object.keys(assessment.responses).length - 1 && (
              <View style={{ height: 1, backgroundColor: '#f0f0f0' }} />
            )}
          </View>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/(app)/patient/dashboard' as any)}
        >
          <Ionicons name="home" size={20} color="white" />
          <Text style={styles.buttonText}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.push({ pathname: '/(app)/patient/dashboard' as any, params: {} })}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
          <Text style={[styles.buttonText, { color: Colors.primary }]}>New Assessment</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  contentContainer: {
    padding: 16
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5
  },
  testCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#667eea'
  },
  cardLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  cardDate: {
    fontSize: 12,
    color: '#999'
  },
  scoreCard: {
    alignItems: 'center',
    paddingVertical: 24
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.primary || '#667eea',
    marginBottom: 0
  },
  scoreMax: {
    fontSize: 18,
    fontWeight: '500',
    color: '#999'
  },
  fieldLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  severityText: {
    fontSize: 16,
    color: '#4caf50',
    fontWeight: '500'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    marginTop: 8
  },
  responseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  responseLabel: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500'
  },
  responseScore: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: 'bold'
  },
  errorText: {
    fontSize: 16,
    color: '#f44336'
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#667eea'
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  }
});
