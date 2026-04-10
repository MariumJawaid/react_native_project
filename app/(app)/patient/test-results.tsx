import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../../firebaseConfig';
import PatientTestResultsService from '../../../services/patientTestResultsService';
import ClinicalScoringService from '../../../services/clinicalScoringService';

const { width } = Dimensions.get('window');

export default function TestResults() {
  const router = useRouter();
  const { testType } = useLocalSearchParams() as { testType: string };
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [latestResult, setLatestResult] = useState<any>(null);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      const patientId = auth.currentUser?.uid;
      if (!patientId) return;

      const results = await PatientTestResultsService.getPatientTestResults(
        patientId,
        testType as 'ADAS-Cog 13' | 'FAQ' | 'MMSE'
      );

      setTestResults(results);
      if (results.length > 0) {
        setLatestResult(results[0]);
      }
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHeaderColors = () => {
    switch (testType) {
      case 'ADAS-Cog 13':
        return ['#6366f1', '#4f46e5'];
      case 'FAQ':
        return ['#8b5cf6', '#7c3aed'];
      case 'MMSE':
        return ['#ec4899', '#db2777'];
      default:
        return ['#3b82f6', '#2563eb'];
    }
  };

  const getSeverityColor = (severity: string) => {
    if (
      severity.includes('Normal') ||
      severity.includes('Independent')
    ) {
      return '#10b981';
    }
    if (
      severity.includes('Mild')
    ) {
      return '#f59e0b';
    }
    if (
      severity.includes('Moderate')
    ) {
      return '#ef4444';
    }
    return '#7f1d1d';
  };

  const formatDate = (timestamp: any) => {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimeDifference = (timestamp: any) => {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={getHeaderColors()[0]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={getHeaderColors() as any}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{testType} Results</Text>
          <View style={{ width: 28 }} />
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        {latestResult && (
          <>
            {/* Latest Result Card */}
            <View style={styles.latestResultCard}>
              <View style={styles.latestResultHeader}>
                <Text style={styles.latestResultTitle}>Latest Result</Text>
                <Text style={styles.resultDate}>
                  {formatDate(latestResult.timestamp)}
                </Text>
              </View>

              <View style={styles.scoreContainer}>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreLabel}>Score</Text>
                  <View style={styles.scoreValueContainer}>
                    <Text style={styles.scoreValue}>{latestResult.score}</Text>
                    <Text style={styles.scoreMax}>/{latestResult.maxScore}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.severityBox}>
                  <Text style={styles.severityLabel}>Assessment</Text>
                  <Text
                    style={[
                      styles.severityValue,
                      {
                        color: getSeverityColor(latestResult.severity),
                      },
                    ]}
                  >
                    {latestResult.severity}
                  </Text>
                </View>
              </View>

              {/* Interpretation */}
              <View style={styles.interpretationBox}>
                <Ionicons
                  name="information-circle"
                  size={20}
                  color="#0284c7"
                />
                <Text style={styles.interpretationText}>
                  {ClinicalScoringService.formatTestResultSummary(
                    testType,
                    latestResult.score,
                    latestResult.maxScore
                  ).interpretation}
                </Text>
              </View>
            </View>

            {/* Detailed Responses */}
            <View style={styles.detailedSection}>
              <Text style={styles.sectionTitle}>Response Details</Text>

              <View style={styles.responsesList}>
                {Object.entries(latestResult.responses).map(
                  ([key, value]: [string, any]) => (
                    <View key={key} style={styles.responseItem}>
                      <Text style={styles.responseKey}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Text>
                      <View style={styles.responseValue}>
                        <Text style={styles.responseScor}>{value}</Text>
                      </View>
                    </View>
                  )
                )}
              </View>
            </View>

            {/* Historical Results */}
            {testResults.length > 1 && (
              <View style={styles.historicalSection}>
                <Text style={styles.sectionTitle}>Test History</Text>

                <View style={styles.historyList}>
                  {testResults.slice(1).map((result, index) => (
                    <View key={index} style={styles.historyItem}>
                      <View style={styles.historyDate}>
                        <Text style={styles.historyDateText}>
                          {formatDate(result.timestamp)}
                        </Text>
                        <Text style={styles.historyTimeDiff}>
                          {formatTimeDifference(result.timestamp)}
                        </Text>
                      </View>

                      <View style={styles.historyScore}>
                        <Text style={styles.historyScoreValue}>
                          {result.score}/{result.maxScore}
                        </Text>
                        <Text style={styles.historySeverity}>
                          {result.severity}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {!latestResult && (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyStateTitle}>No Results Yet</Text>
            <Text style={styles.emptyStateText}>
              Complete a {testType} assessment to view your results here.
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => {
              // TODO: Implement share functionality
            }}
          >
            <Ionicons name="share-social" size={20} color="#0284c7" />
            <Text style={styles.shareButtonText}>Share with Provider</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.downloadButton}
            onPress={() => {
              // TODO: Implement download functionality
            }}
          >
            <Ionicons name="download" size={20} color="#10b981" />
            <Text style={styles.downloadButtonText}>Download Report</Text>
          </TouchableOpacity>
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
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  latestResultCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  latestResultHeader: {
    marginBottom: 20,
  },
  latestResultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  resultDate: {
    fontSize: 13,
    color: '#64748b',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  scoreBox: {
    flex: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  scoreValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6366f1',
  },
  scoreMax: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
    marginLeft: 4,
  },
  divider: {
    width: 1,
    height: 50,
    backgroundColor: '#e2e8f0',
  },
  severityBox: {
    flex: 1,
    alignItems: 'center',
  },
  severityLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  severityValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  interpretationBox: {
    flexDirection: 'row',
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    alignItems: 'flex-start',
  },
  interpretationText: {
    flex: 1,
    fontSize: 13,
    color: '#0c4a6e',
    lineHeight: 19,
  },
  detailedSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  responsesList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  responseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  responseKey: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  responseValue: {
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  responseScor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366f1',
  },
  historicalSection: {
    marginBottom: 24,
  },
  historyList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  historyDate: {
    flex: 1,
  },
  historyDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  historyTimeDiff: {
    fontSize: 12,
    color: '#94a3b8',
  },
  historyScore: {
    alignItems: 'flex-end',
  },
  historyScoreValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 2,
  },
  historySeverity: {
    fontSize: 11,
    color: '#94a3b8',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0284c7',
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
