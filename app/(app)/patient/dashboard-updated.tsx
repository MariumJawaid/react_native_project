import { Colors } from '@/constants/theme';
import { authService } from '@/services/authService';
import { logger } from '@/services/logger';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const ASSESSMENT_TYPES = [
  {
    id: 'FAQ',
    name: 'Functional Activities Questionnaire',
    description: 'FAQ - Assess daily living activities',
    icon: 'checkmark-circle',
    duration: '5-10 min',
    questions: 10
  },
  {
    id: 'MMSE',
    name: 'Mini-Mental State Exam',
    description: 'MMSE - Cognitive screening test',
    icon: 'brain',
    duration: '10-15 min',
    questions: '11 items'
  },
  {
    id: 'ADAS',
    name: 'Alzheimer\'s Disease Assessment Scale',
    description: 'ADAS-Cog 13 - Cognitive decline assessment',
    icon: 'medical',
    duration: '15-20 min',
    questions: 13
  }
];

export default function PatientDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState('Patient');
  const [isLoading, setIsLoading] = useState(true);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);

  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    try {
      const user = await authService.waitForAuth();
      if (user) {
        setUserName(user.email?.split('@')[0] || 'Patient');
      } else {
        router.push('/(auth)/SignInScreen');
      }
    } catch (error) {
      logger.error(`User initialization error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartAssessment = (testType: string) => {
    setShowAssessmentModal(false);
    
    Alert.alert(
      `Start ${testType} Assessment?`,
      'Make sure you have a quiet environment and a clear voice for best results.',
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

  const renderAssessmentItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.assessmentCard}
      onPress={() => handleStartAssessment(item.id)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={item.icon as any}
            size={28}
            color={Colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.assessmentName}>{item.name}</Text>
          <Text style={styles.assessmentDescription}>{item.description}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.infoItem}>
          <Ionicons name="time" size={14} color="#999" />
          <Text style={styles.infoText}>{item.duration}</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="list" size={14} color="#999" />
          <Text style={styles.infoText}>{item.questions} questions</Text>
        </View>
      </View>

      <View style={styles.cardAction}>
        <Ionicons name="play" size={16} color="white" />
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{userName}</Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => {
            Alert.alert(
              'Profile',
              'Profile features coming soon',
              [{ text: 'OK' }]
            );
          }}
        >
          <Ionicons name="person-circle" size={32} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Last Assessment</Text>
          <Text style={styles.statValue}>FAQ</Text>
          <Text style={styles.statDate}>Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Assessments</Text>
          <Text style={styles.statValue}>3</Text>
          <Text style={styles.statDate}>This month</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Status</Text>
          <Text style={styles.statValue}>✓</Text>
          <Text style={styles.statDate}>Healthy</Text>
        </View>
      </View>

      {/* Voice Assessment Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Ionicons name="mic" size={24} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Voice Assessments</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Conduct cognitive assessments using voice-based questions
        </Text>
      </View>

      {/* Assessment List */}
      <FlatList
        data={ASSESSMENT_TYPES}
        renderItem={renderAssessmentItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
      />

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {
              Alert.alert(
                'History',
                'Assessment history coming soon',
                [{ text: 'OK' }]
              );
            }}
          >
            <Ionicons name="time" size={24} color={Colors.primary} />
            <Text style={styles.quickActionLabel}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {
              Alert.alert(
                'Reports',
                'Assessment reports coming soon',
                [{ text: 'OK' }]
              );
            }}
          >
            <Ionicons name="document-text" size={24} color={Colors.primary} />
            <Text style={styles.quickActionLabel}>Reports</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {
              Alert.alert(
                'Settings',
                'Settings coming soon',
                [{ text: 'OK' }]
              );
            }}
          >
            <Ionicons name="settings" size={24} color={Colors.primary} />
            <Text style={styles.quickActionLabel}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {
              Alert.alert(
                'Help',
                'Help coming soon',
                [{ text: 'OK' }]
              );
            }}
          >
            <Ionicons name="help-circle" size={24} color={Colors.primary} />
            <Text style={styles.quickActionLabel}>Help</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color={Colors.primary} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.infoTitle}>Privacy & Security</Text>
          <Text style={styles.infoBoxText}>
            Your assessments are securely stored and encrypted. Only authorized caregivers and clinicians can view your results.
          </Text>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  greeting: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000'
  },
  profileButton: {
    padding: 8
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
    textAlign: 'center'
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4
  },
  statDate: {
    fontSize: 10,
    color: '#ccc'
  },
  sectionContainer: {
    marginBottom: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000'
  },
  sectionDescription: {
    fontSize: 13,
    color: '#666',
    marginLeft: 32
  },
  assessmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  assessmentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4
  },
  assessmentDescription: {
    fontSize: 12,
    color: '#666'
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  infoText: {
    fontSize: 11,
    color: '#999'
  },
  cardAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end'
  },
  quickActionsContainer: {
    marginVertical: 24
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  quickActionButton: {
    width: '23%',
    aspectRatio: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3
  },
  quickActionLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500'
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    marginBottom: 24
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4
  },
  infoBoxText: {
    fontSize: 12,
    color: '#1565c0',
    lineHeight: 18
  }
});
