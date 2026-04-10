import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../../firebaseConfig';
import PatientTestResultsService from '../../../services/patientTestResultsService';

const { width } = Dimensions.get('window');

const ASSESSMENT_TYPES = [
  {
    id: 'FAQ',
    name: 'Functional Activities Questionnaire',
    description: 'FAQ - Assess daily living activities (10 questions)',
    icon: 'checkmark-circle',
    duration: '5-10 min'
  },
  {
    id: 'MMSE',
    name: 'Mini-Mental State Exam',
    description: 'MMSE - Cognitive screening (11 items)',
    icon: 'brain',
    duration: '10-15 min'
  },
  {
    id: 'ADAS',
    name: 'Alzheimer\'s Disease Assessment Scale',
    description: 'ADAS-Cog 13 - Cognitive decline (13 questions)',
    icon: 'medical',
    duration: '15-20 min'
  }
];

export default function PatientDashboard() {
  const router = useRouter();
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [latestResults, setLatestResults] = useState<any>({
    adasCog13: null,
    faq: null,
    mmse: null,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadLatestResults();
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      const patientUID = auth.currentUser?.uid;
      if (!patientUID) return;

      // Get patient info from users collection
      const userDoc = await getDoc(doc(db, 'users', patientUID));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setPatientName(userData.email?.split('@')[0] || 'Patient');

        // Load latest test results
        await loadLatestResults(patientUID);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLatestResults = async (patientUID?: string) => {
    try {
      const uid = patientUID || auth.currentUser?.uid;
      if (!uid) return;

      const results = await PatientTestResultsService.getLatestTestResults(uid);
      setLatestResults(results);
    } catch (error) {
      console.error('Error loading test results:', error);
    }
  };

  const handleSignOut = async () => {
    await auth.signOut();
    router.replace('/(auth)/SignInScreen');
  };

  const handleStartTest = (testType: 'ADAS-Cog 13' | 'FAQ' | 'MMSE') => {
    router.push({
      pathname: '/(app)/patient/conduct-test' as any,
      params: { testType },
    });
  };

  /**
   * Start voice-based assessment
   */
  const handleStartVoiceAssessment = (testType: string) => {
    Alert.alert(
      `Start ${testType} Assessment?`,
      'You will answer questions using your voice. Make sure you have a quiet environment.',
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel'
        },
        {
          text: 'Start',
          onPress: () => {
            router.push({
              pathname: '/(app)/patient/voice-test-conductor' as any,
              params: { testType }
            });
          }
        }
      ]
    );
  };

  const testCards = [
    {
      id: 'adas-cog-13',
      title: 'ADAS-Cog 13',
      subtitle: 'Cognitive Assessment',
      description: '13-item cognitive scale',
      icon: 'brain',
      colors: ['#6366f1', '#4f46e5'],
      testType: 'ADAS-Cog 13' as const,
      lastResult: latestResults.adasCog13,
      maxScore: 85,
    },
    {
      id: 'faq',
      title: 'FAQ',
      subtitle: 'Functional Assessment',
      description: 'Daily activity evaluation',
      icon: 'checkmark-circle',
      colors: ['#8b5cf6', '#7c3aed'],
      testType: 'FAQ' as const,
      lastResult: latestResults.faq,
      maxScore: 30,
    },
    {
      id: 'mmse',
      title: 'MMSE',
      subtitle: 'Mental State Exam',
      description: 'Quick cognitive screening',
      icon: 'list',
      colors: ['#ec4899', '#db2777'],
      testType: 'MMSE' as const,
      lastResult: latestResults.mmse,
      maxScore: 30,
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header with Gradient */}
      <LinearGradient colors={['#1e40af', '#1e3a8a']} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{patientName}</Text>
          </View>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#1e40af" />
          <Text style={styles.infoText}>
            Complete these cognitive assessments to track your health
          </Text>
        </View>
      </LinearGradient>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionTitle}>Voice-Based Assessments</Text>
        <Text style={styles.sectionSubtitle}>Answer questions using your voice</Text>

        {/* Voice Assessment Cards */}
        {ASSESSMENT_TYPES.map((assessment) => (
          <TouchableOpacity
            key={assessment.id}
            style={styles.voiceAssessmentCard}
            onPress={() => handleStartVoiceAssessment(assessment.id)}
          >
            <View style={styles.voiceCardHeader}>
              <View style={styles.voiceCardIcon}>
                <Ionicons
                  name={assessment.icon as any}
                  size={24}
                  color={Colors.primary || '#667eea'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.voiceCardTitle}>{assessment.name}</Text>
                <Text style={styles.voiceCardDescription}>{assessment.description}</Text>
              </View>
              <Ionicons name="play-circle" size={28} color={Colors.primary || '#667eea'} />
            </View>
            <View style={styles.voiceCardFooter}>
              <View style={styles.durationBadge}>
                <Ionicons name="time" size={12} color="#666" />
                <Text style={styles.durationText}>{assessment.duration}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Clinical Assessments</Text>

        {testCards.map((test) => (
          <TouchableOpacity
            key={test.id}
            activeOpacity={0.9}
            onPress={() => handleStartTest(test.testType)}
            style={styles.testCardWrapper}
          >
            <LinearGradient
              colors={test.colors as any}
              style={styles.testCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.testCardHeader}>
                <View style={styles.testIconContainer}>
                  <Ionicons name={test.icon as any} size={28} color="#fff" />
                </View>
                <View style={styles.testCardInfo}>
                  <Text style={styles.testCardTitle}>{test.title}</Text>
                  <Text style={styles.testCardSubtitle}>{test.subtitle}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color="rgba(255,255,255,0.9)"
                />
              </View>

              <Text style={styles.testCardDescription}>{test.description}</Text>

              {test.lastResult && (
                <View style={styles.lastResultContainer}>
                  <Text style={styles.lastResultLabel}>Last Result</Text>
                  <Text style={styles.lastResultScore}>
                    {test.lastResult.score}/{test.maxScore}
                  </Text>
                  <Text style={styles.lastResultSeverity}>
                    {test.lastResult.severity}
                  </Text>
                  <Text style={styles.lastResultDate}>
                    {new Date(test.lastResult.timestamp.toDate()).toLocaleDateString()}
                  </Text>
                </View>
              )}

              {!test.lastResult && (
                <View style={styles.noResultContainer}>
                  <Text style={styles.noResultText}>No completed assessments yet</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ))}

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark" size={24} color="#059669" />
          <View style={styles.infoBoxContent}>
            <Text style={styles.infoBoxTitle}>Your Data is Secure</Text>
            <Text style={styles.infoBoxText}>
              All assessments are encrypted and securely stored for your healthcare provider.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 15,
    color: '#dbeafe',
    fontWeight: '500',
  },
  name: {
    fontSize: 26,
    color: '#fff',
    fontWeight: '700',
    marginTop: 4,
  },
  signOutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  testCardWrapper: {
    marginBottom: 16,
  },
  testCard: {
    borderRadius: 20,
    padding: 18,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  testCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  testIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  testCardInfo: {
    flex: 1,
  },
  testCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  testCardSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  testCardDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  lastResultContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  lastResultLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lastResultScore: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  lastResultSeverity: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  lastResultDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  noResultContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  noResultText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#d1fae5',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoBoxContent: {
    flex: 1,
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  infoBoxText: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 18,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    marginTop: -8
  },
  voiceAssessmentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary || '#667eea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3
  },
  voiceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  voiceCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  voiceCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2
  },
  voiceCardDescription: {
    fontSize: 12,
    color: '#666'
  },
  voiceCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4
  },
  durationText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500'
  }
});