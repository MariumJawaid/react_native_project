import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../../../firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

interface CognitiveScore {
  testType: string;
  latestScore: number;
  maxScore: number;
  scorePercent: number;
  pastScores: number[];
  recordsCount: number;
}

interface CaregiverReport {
  id: string;
  patientId: string;
  patient: {
    name: string;
    age: number;
    diagnosis: string;
    gender: string;
  };
  clinician: {
    name: string;
    email: string;
    id: string;
  };
  cognitiveScores: CognitiveScore[];
  currentStageResult: {
    stage: string;
    stageLevel: number;
    confidence: number;
  };
  trajectory: {
    predictedDecline: string;
    insight?: string;
    progression?: any[];
    trajectoryMonths?: string;
  };
  inferenceText: string;
  inferenceDetails?: {
    brainModel3d: string;
    currentStage: string;
    trajectory: string;
  };
  clinicianNotes: {
    clinicalNotes: string;
    recommendationPlan: string;
  };
  sentAt: any;
  createdAt: any;
}

export default function PatientReportsScreen() {
  const router = useRouter();
  const [report, setReport] = useState<CaregiverReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    fetchPatientReport();
  }, []);

  const fetchPatientReport = async () => {
    try {
      setLoading(true);
      const caregiverId = auth.currentUser?.uid;
      if (!caregiverId) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      // Get caregiver's patient ID
      const caregiverDoc = await getDoc(doc(db, 'users', caregiverId));
      if (!caregiverDoc.exists()) {
        Alert.alert('Error', 'Caregiver not found');
        return;
      }

      const patientId = caregiverDoc.data().patientId;
      if (!patientId) {
        Alert.alert('Info', 'No patient linked to this caregiver');
        return;
      }

      // Query caregiverReports collection
      const q = query(
        collection(db, 'caregiverReports'),
        where('caregiverIds', 'array-contains', caregiverId)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        Alert.alert('Info', 'No reports available yet');
        setReport(null);
        return;
      }

      // Get the most recent report
      const reportDoc = querySnapshot.docs[0];
      const reportData = reportDoc.data() as CaregiverReport;
      reportData.id = reportDoc.id;

      setReport(reportData);
    } catch (error: any) {
      console.error('[PatientReports] Error fetching report:', error);
      Alert.alert('Error', 'Failed to fetch patient report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getStageBadgeColor = (stage: string) => {
    switch (stage) {
      case 'Normal':
        return { bg: '#dcfce7', text: '#15803d' };
      case 'EMCI':
        return { bg: '#fef3c7', text: '#b45309' };
      case 'LMCI':
        return { bg: '#fed7aa', text: '#92400e' };
      case 'MildDemented':
        return { bg: '#fecaca', text: '#991b1b' };
      case 'ModerateDemented':
        return { bg: '#fca5a5', text: '#7c2d12' };
      default:
        return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#1e40af', '#1e3a8a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Patient Report</Text>
          <View style={{ width: 44 }} />
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <Ionicons name="document-outline" size={60} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Report Available</Text>
          <Text style={styles.emptySubtitle}>Patient reports will appear here once generated by clinician</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stageColors = getStageBadgeColor(report.currentStageResult.stage);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={['#1e40af', '#1e3a8a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Report</Text>
        <TouchableOpacity onPress={fetchPatientReport} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Patient Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.patientName}>{report.patient.name}</Text>
              <Text style={styles.patientAge}>{report.patient.age} years old </Text>
            </View>
            <View style={[styles.stageBadge, { backgroundColor: stageColors.bg }]}>
              <Text style={[styles.stageBadgeText, { color: stageColors.text }]}>{report.currentStageResult.stage}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Diagnosis</Text>
              <Text style={styles.infoValue}>{report.patient.diagnosis}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Confidence</Text>
              <Text style={styles.infoValue}>{(report.currentStageResult.confidence * 100).toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        {/* Cognitive Scores */}
        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => toggleSection('cognitive')}
            style={styles.sectionHeader}
          >
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="bar-chart" size={22} color="#2563eb" />
              <Text style={styles.sectionTitle}>Cognitive Scores</Text>
            </View>
            <Ionicons
              name={expandedSection === 'cognitive' ? 'chevron-up' : 'chevron-down'}
              size={24}
              color="#64748b"
            />
          </TouchableOpacity>

          {expandedSection === 'cognitive' && (
            <>
              <View style={styles.divider} />
              {report.cognitiveScores.map((score, idx) => (
                <View key={idx} style={styles.scoreContainer}>
                  <View style={styles.scoreHeader}>
                    <Text style={styles.scoreType}>{score.testType}</Text>
                    <Text style={styles.scorePercent}>{score.scorePercent}%</Text>
                  </View>
                  <View style={styles.scoreBar}>
                    <View
                      style={[
                        styles.scoreBarFill,
                        {
                          width: `${score.scorePercent}%`,
                          backgroundColor: score.scorePercent >= 70 ? '#10b981' : score.scorePercent >= 50 ? '#f59e0b' : '#ef4444',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.scoreDetails}>
                    Latest: {score.latestScore}/{score.maxScore} • {score.recordsCount} records
                  </Text>
                  {score.pastScores.length > 0 && (
                    <Text style={styles.pastScores}>
                      Previous: {score.pastScores.join(', ')}
                    </Text>
                  )}
                </View>
              ))}
            </>
          )}
        </View>

        {/* Brain Analysis */}
        {report.inferenceText && (
          <View style={styles.card}>
            <TouchableOpacity
              onPress={() => toggleSection('brain')}
              style={styles.sectionHeader}
            >
              <View style={styles.sectionTitleContainer}>
              <Ionicons name="flask" size={22} color="#2563eb" />
                <Text style={styles.sectionTitle}>Brain Analysis</Text>
              </View>
              <Ionicons
                name={expandedSection === 'brain' ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#64748b"
              />
            </TouchableOpacity>

            {expandedSection === 'brain' && (
              <>
                <View style={styles.divider} />
                <Text style={styles.analysisText}>{report.inferenceText}</Text>
              </>
            )}
          </View>
        )}

        {/* Current Stage */}
        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => toggleSection('stage')}
            style={styles.sectionHeader}
          >
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="pulse" size={22} color="#2563eb" />
              <Text style={styles.sectionTitle}>Current Stage</Text>
            </View>
            <Ionicons
              name={expandedSection === 'stage' ? 'chevron-up' : 'chevron-down'}
              size={24}
              color="#64748b"
            />
          </TouchableOpacity>

          {expandedSection === 'stage' && (
            <>
              <View style={styles.divider} />
              <View style={styles.stageGrid}>
                <View style={styles.stageItem}>
                  <Text style={styles.stageItemLabel}>Disease Stage</Text>
                  <View style={[styles.stagePill, { backgroundColor: getStageBadgeColor(report.currentStageResult.stage).bg }]}>
                    <Text style={[styles.stagePillText, { color: getStageBadgeColor(report.currentStageResult.stage).text }]}>
                      {report.currentStageResult.stage}
                    </Text>
                  </View>
                </View>
                <View style={styles.stageItem}>
                  <Text style={styles.stageItemLabel}>Stage Level</Text>
                  <Text style={styles.stageItemValue}>{report.currentStageResult.stageLevel}</Text>
                </View>
                <View style={styles.stageItem}>
                  <Text style={styles.stageItemLabel}>Confidence Score</Text>
                  <Text style={styles.stageItemValue}>{(report.currentStageResult.confidence * 100).toFixed(1)}%</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Trajectory */}
        {report.trajectory && (
          <View style={styles.card}>
            <TouchableOpacity
              onPress={() => toggleSection('trajectory')}
              style={styles.sectionHeader}
            >
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="trending-up" size={22} color="#2563eb" />
                <Text style={styles.sectionTitle}>Disease Progression</Text>
              </View>
              <Ionicons
                name={expandedSection === 'trajectory' ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#64748b"
              />
            </TouchableOpacity>

            {expandedSection === 'trajectory' && (
              <>
                <View style={styles.divider} />
                {report.trajectory.predictedDecline && (
                  <View style={styles.trajectoryItem}>
                    <Text style={styles.trajectoryLabel}>Predicted Decline</Text>
                    <Text style={styles.trajectoryValue}>{report.trajectory.predictedDecline}</Text>
                  </View>
                )}
                {report.trajectory.trajectoryMonths && (
                  <View style={styles.trajectoryItem}>
                    <Text style={styles.trajectoryLabel}>Estimated Timeline</Text>
                    <Text style={styles.trajectoryValue}>{report.trajectory.trajectoryMonths}</Text>
                  </View>
                )}
                {report.trajectory.insight && (
                  <View style={styles.trajectoryItem}>
                    <Text style={styles.trajectoryLabel}>Progression Insight</Text>
                    <Text style={styles.trajectoryText}>{report.trajectory.insight}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Inference Details */}
        {report.inferenceDetails && (
          <View style={styles.card}>
            <TouchableOpacity
              onPress={() => toggleSection('inference')}
              style={styles.sectionHeader}
            >
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="information-circle" size={22} color="#2563eb" />
                <Text style={styles.sectionTitle}>Inference Details</Text>
              </View>
              <Ionicons
                name={expandedSection === 'inference' ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#64748b"
              />
            </TouchableOpacity>

            {expandedSection === 'inference' && (
              <>
                <View style={styles.divider} />
                {report.inferenceDetails.brainModel3d && (
                  <View style={styles.inferenceItem}>
                    <Text style={styles.inferenceLabel}>Brain Volumetrics</Text>
                    <Text style={styles.inferenceText}>{report.inferenceDetails.brainModel3d}</Text>
                  </View>
                )}
                {report.inferenceDetails.currentStage && (
                  <View style={styles.inferenceItem}>
                    <Text style={styles.inferenceLabel}>Current Assessment</Text>
                    <Text style={styles.inferenceText}>{report.inferenceDetails.currentStage}</Text>
                  </View>
                )}
                {report.inferenceDetails.trajectory && (
                  <View style={styles.inferenceItem}>
                    <Text style={styles.inferenceLabel}>Trajectory Analysis</Text>
                    <Text style={styles.inferenceText}>{report.inferenceDetails.trajectory}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Clinician Info */}
        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => toggleSection('clinician')}
            style={styles.sectionHeader}
          >
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="person-circle" size={22} color="#2563eb" />
              <Text style={styles.sectionTitle}>Clinician Notes</Text>
            </View>
            <Ionicons
              name={expandedSection === 'clinician' ? 'chevron-up' : 'chevron-down'}
              size={24}
              color="#64748b"
            />
          </TouchableOpacity>

          {expandedSection === 'clinician' && (
            <>
              <View style={styles.divider} />
              <View style={styles.clinicianInfo}>
                <View style={styles.clinicianAvatar}>
                  <Ionicons name="person" size={32} color="#fff" />
                </View>
                <View style={styles.clinicianDetails}>
                  <Text style={styles.clinicianName}>{report.clinician.name}</Text>
                  <Text style={styles.clinicianEmail}>{report.clinician.email}</Text>
                </View>
              </View>

              {report.clinicianNotes.clinicalNotes && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesTitle}>Clinical Notes</Text>
                  <Text style={styles.notesText}>{report.clinicianNotes.clinicalNotes}</Text>
                </View>
              )}

              {report.clinicianNotes.recommendationPlan && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesTitle}>Recommendation Plan</Text>
                  <Text style={styles.notesText}>{report.clinicianNotes.recommendationPlan}</Text>
                </View>
              )}

              {!report.clinicianNotes.clinicalNotes && !report.clinicianNotes.recommendationPlan && (
                <Text style={styles.emptyNotesText}>No additional notes from clinician yet</Text>
              )}
            </>
          )}
        </View>

        {/* Report Metadata */}
        <View style={styles.card}>
          <Text style={styles.metadataTitle}>Report Information</Text>
          <View style={styles.metadataGrid}>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Generated</Text>
              <Text style={styles.metadataValue}>
                {report.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
              </Text>
            </View>
            
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  patientName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  patientAge: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  stageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stageBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  scoreContainer: {
    marginBottom: 16,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreType: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  scorePercent: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563eb',
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreDetails: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  pastScores: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  analysisText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  stageGrid: {
    gap: 12,
  },
  stageItem: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
  },
  stageItemLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  stagePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  stagePillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  stageItemValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563eb',
  },
  trajectoryItem: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  trajectoryLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  trajectoryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  trajectoryText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
  },
  inferenceItem: {
    marginBottom: 16,
  },
  inferenceLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inferenceText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  clinicianInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  clinicianAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clinicianDetails: {
    flex: 1,
  },
  clinicianName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  clinicianEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  notesSection: {
    marginTop: 12,
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
  },
  emptyNotesText: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  metadataTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  metadataGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  metadataItem: {
    flex: 1,
  },
  metadataLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 4,
  },
});
