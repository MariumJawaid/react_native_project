import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
  extractDeviceDataReadings,
  aggregateByDate,
  fetchPatientData,
  fetchMRIScans,
  fetchAIAnalyses,
  fetchAssessmentResults,
  fetchRAGRecommendations,
  shortDateLabel,
  getPastDateKeys,
  DayAggregation,
  PatientSummary,
  MRIScan,
  AIAnalysis,
} from '../../../services/patientDataService';


const { width } = Dimensions.get('window');
const chartWidth = width - 80;

// ─── Types ───
interface ChartPoint {
  x: number;
  y: number;
}

interface DayDataDisplay extends DayAggregation {
  day: string; // Short label e.g. "Apr 12"
}

export default function PatientGraphs() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 14>(7);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  
  // Core data
  const [chartData, setChartData] = useState<DayDataDisplay[]>([]);
  const [patientData, setPatientData] = useState<PatientSummary | null>(null);
  const [mriScans, setMriScans] = useState<MRIScan[]>([]);
  const [aiAnalyses, setAiAnalyses] = useState<AIAnalysis[]>([]);
  
  // Summary metrics
  const [summaryBpm, setSummaryBpm] = useState(0);
  const [totalFalls, setTotalFalls] = useState(0);
  const [totalZoneExits, setTotalZoneExits] = useState(0);
  const [avgSleepPercentage, setAvgSleepPercentage] = useState(0);
  const [avgSleepHours, setAvgSleepHours] = useState(0);
  const [avgSleepScore, setAvgSleepScore] = useState(0);
  const [maxBpm, setMaxBpm] = useState(0);
  const [minBpm, setMinBpm] = useState(0);

  const periods: { id: 7 | 14; label: string }[] = [
    { id: 7, label: '7 Days' },
    { id: 14, label: '14 Days' },
  ];

  // ─── Resolve patientId from current user ───
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const pid = userDoc.data().patientId;
          if (pid) setPatientId(pid);
        }
      } catch (e) {
        console.error('Error resolving patient:', e);
      }
    });
    return () => unsubAuth();
  }, []);

  // ─── Fetch all data ───
  useEffect(() => {
    if (!patientId) return;
    fetchAllData();
  }, [patientId, selectedPeriod]);

  const fetchAllData = async () => {
    if (!patientId) return;
    try {
      setLoading(true);

      // Fetch patient summary
      const patientSummary = await fetchPatientData(patientId);
      setPatientData(patientSummary);

      // Fetch sensor readings from deviceData
      const readings = await extractDeviceDataReadings(patientId, selectedPeriod);
      const aggregated = aggregateByDate(readings);

      // Add display labels
      const withLabels: DayDataDisplay[] = aggregated.map((day) => ({
        ...day,
        day: shortDateLabel(day.dateKey),
      }));

      setChartData(withLabels);

      // Compute summary statistics
      if (withLabels.length > 0) {
        const validBpms = withLabels
          .map((d) => d.avgBpm)
          .filter((b) => b > 0);
        const avgBpm = validBpms.length > 0 
          ? Math.round(validBpms.reduce((a, b) => a + b, 0) / validBpms.length)
          : 0;
        
        const allMaxBpms = withLabels
          .map((d) => d.maxBpm)
          .filter((b) => b > 0);
        const max = allMaxBpms.length > 0 ? Math.max(...allMaxBpms) : 0;
        
        const allMinBpms = withLabels
          .map((d) => d.minBpm)
          .filter((b) => b > 0);
        const min = allMinBpms.length > 0 ? Math.min(...allMinBpms) : 0;

        setSummaryBpm(avgBpm);
        setMaxBpm(max);
        setMinBpm(min);
        setTotalFalls(withLabels.reduce((s, d) => s + d.fallCount, 0));
        setTotalZoneExits(withLabels.reduce((s, d) => s + d.outOfZoneCount, 0));

        const avgSleep = withLabels.reduce((s, d) => s + d.sleepPercentage, 0) / withLabels.length;
        setAvgSleepPercentage(Math.round(avgSleep));

        const avgSleep_Hours = withLabels.reduce((s, d) => s + d.sleepHours, 0) / withLabels.length;
        setAvgSleepHours(Math.round(avgSleep_Hours * 10) / 10);

        const avgScore = withLabels.reduce((s, d) => s + d.sleepScore, 0) / withLabels.length;
        setAvgSleepScore(Math.round(avgScore));
      }

      // Fetch additional data
      const mris = await fetchMRIScans(patientId);
      setMriScans(mris);

      const aiAnas = await fetchAIAnalyses(patientId);
      setAiAnalyses(aiAnas);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Simple line chart ───
  const SimpleLineChart = ({
    chartData,
    dataKeyGetter,
    color,
    label,
    unit,
  }: {
    chartData: DayDataDisplay[];
    dataKeyGetter: (d: DayDataDisplay) => number;
    color: string;
    label: string;
    unit: string;
  }) => {
    const values = chartData.map(dataKeyGetter);
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;
    const chartHeight = 160;
    const padding = 20;
    const pointAreaWidth = chartWidth - 50;

    const points: ChartPoint[] = values.map((v, i) => ({
      x: chartData.length > 1 ? (i / (chartData.length - 1)) * pointAreaWidth : pointAreaWidth / 2,
      y: chartHeight - padding - ((v - minValue) / range) * (chartHeight - 2 * padding),
    }));

    return (
      <View style={styles.chartWrapper}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{label}</Text>
          <View style={styles.chartLegend}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{unit}</Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <View style={styles.yAxis}>
            <Text style={styles.axisLabel}>{Math.round(maxValue)}</Text>
            <Text style={styles.axisLabel}>{Math.round((maxValue + minValue) / 2)}</Text>
            <Text style={styles.axisLabel}>{Math.round(minValue)}</Text>
          </View>
          <View style={[styles.chartArea, { height: chartHeight }]}>
            {/* Grid lines */}
            <View style={styles.gridLines}>
              <View style={styles.gridLine} />
              <View style={styles.gridLine} />
              <View style={styles.gridLine} />
            </View>

            {/* Line segments + dots */}
            <View style={styles.linePath}>
              {points.map((point, index) => {
                if (index < points.length - 1) {
                  const next = points[index + 1];
                  const dx = next.x - point.x;
                  const dy = next.y - point.y;
                  const length = Math.sqrt(dx * dx + dy * dy);
                  const angle = Math.atan2(dy, dx);
                  return (
                    <View
                      key={`seg-${index}`}
                      style={[
                        styles.lineSegment,
                        {
                          left: point.x,
                          top: point.y,
                          width: length,
                          transform: [{ rotate: `${angle}rad` }],
                          backgroundColor: color,
                        },
                      ]}
                    />
                  );
                }
                return null;
              })}
              {points.map((point, index) => (
                <View
                  key={`pt-${index}`}
                  style={[
                    styles.dataPoint,
                    { left: point.x, top: point.y, backgroundColor: color, shadowColor: color },
                  ]}
                />
              ))}
            </View>

            {/* X-axis labels */}
            <View style={styles.xAxis}>
              {chartData.map((d, i) => {
                const showLabel =
                  chartData.length <= 7
                    ? true
                    : i === 0 || i === chartData.length - 1 || i % 3 === 0;
                return (
                  <Text key={i} style={[styles.xAxisLabel, !showLabel && { opacity: 0 }]}>
                    {d.day.split(' ')[1]}
                  </Text>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // ─── Bar chart ───
  const SimpleBarChart = ({
    chartData,
    dataKeyGetter,
    color,
    label,
  }: {
    chartData: DayDataDisplay[];
    dataKeyGetter: (d: DayDataDisplay) => number;
    color: string;
    label: string;
  }) => {
    const values = chartData.map(dataKeyGetter);
    const maxValue = Math.max(...values, 1);
    const chartHeight = 160;

    return (
      <View style={styles.chartWrapper}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{label}</Text>
          <View style={styles.chartLegend}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>Count</Text>
          </View>
        </View>
        <View style={styles.barChartContainer}>
          {chartData.map((point, index) => {
            const val = dataKeyGetter(point);
            const barHeight = (val / maxValue) * (chartHeight - 40);
            const showLabel =
              chartData.length <= 7 || index === 0 || index === chartData.length - 1 || index % 3 === 0;
            return (
              <View key={index} style={styles.barWrapper}>
                <View style={styles.barColumn}>
                  <View style={[styles.bar, { height: barHeight || 2, backgroundColor: color }]}>
                    {val > 0 && <Text style={styles.barValue}>{val}</Text>}
                  </View>
                </View>
                <Text style={[styles.barLabel, !showLabel && { opacity: 0 }]}>
                  {point.day.split(' ')[1]}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // ─── Risk indicator badge ───
  const RiskBadge = ({ level, score }: { level: string; score: number }) => {
    const getColor = () => {
      if (score >= 80) return '#ef4444';
      if (score >= 50) return '#f59e0b';
      return '#10b981';
    };
    
    const getLabel = () => {
      if (score >= 80) return 'High Risk';
      if (score >= 50) return 'Medium Risk';
      return 'Low Risk';
    };

    return (
      <LinearGradient
        colors={[getColor(), getColor() + '99']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.riskBadge}
      >
        <Ionicons name="alert-circle" size={18} color="#fff" />
        <Text style={styles.riskBadgeText}>{getLabel()}</Text>
        <Text style={styles.riskBadgeScore}>{score}</Text>
      </LinearGradient>
    );
  };

  // ─── Get sleep score label ───
  const getSleepScoreLabel = (score: number) => {
    if (score >= 85) return 'Good';
    if (score >= 65) return 'Fair';
    return 'Low';
  };

  const getSleepScoreColor = (score: number) => {
    if (score >= 85) return '#10b981';
    if (score >= 65) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#1e40af', '#1e3a8a']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Patient Analytics</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.id}
              style={[styles.periodButton, selectedPeriod === period.id && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod(period.id)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period.id && styles.periodButtonTextActive,
                ]}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>
              Loading patient data...{'\n'}
              <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                From Firestore collection
              </Text>
            </Text>
          </View>
        ) : (
          <>
            

            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.summaryGradient}>
                  <Ionicons name="heart" size={24} color="#fff" />
                  <Text style={styles.summaryValue}>{summaryBpm || '--'}</Text>
                  <Text style={styles.summaryLabel}>Avg BPM</Text>
                </LinearGradient>
              </View>
              <View style={styles.summaryCard}>
                <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.summaryGradient}>
                  <Ionicons name="warning" size={24} color="#fff" />
                  <Text style={styles.summaryValue}>{totalFalls}</Text>
                  <Text style={styles.summaryLabel}>Falls</Text>
                </LinearGradient>
              </View>
              <View style={styles.summaryCard}>
                <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.summaryGradient}>
                  <Ionicons name="location" size={24} color="#fff" />
                  <Text style={styles.summaryValue}>{totalZoneExits}</Text>
                  <Text style={styles.summaryLabel}>Zone Exits</Text>
                </LinearGradient>
              </View>
            </View>

            {/* HR stats row */}
            {chartData.length > 0 && (
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Max BPM</Text>
                  <Text style={styles.statValue}>{maxBpm}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Min BPM</Text>
                  <Text style={styles.statValue}>{minBpm}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Sleep Score</Text>
                  <Text style={[styles.statValue, { color: getSleepScoreColor(avgSleepScore) }]}>
                    {avgSleepScore} - {getSleepScoreLabel(avgSleepScore)}
                  </Text>
                </View>
              </View>
            )}

            {/* Heart Rate Chart */}
            {chartData.length > 0 && (
              <View style={styles.card}>
                <SimpleLineChart
                  chartData={chartData}
                  dataKeyGetter={(d) => d.avgBpm}
                  color="#3b82f6"
                  label="Heart Rate (BPM)"
                  unit="Avg BPM"
                />
              </View>
            )}

            {/* Fall Events Chart */}
            {chartData.length > 0 && (
              <View style={styles.card}>
                <SimpleBarChart
                  chartData={chartData}
                  dataKeyGetter={(d) => d.fallCount}
                  color="#ef4444"
                  label="Fall Events"
                />
              </View>
            )}

            {/* Out of Zone Chart */}
            {chartData.length > 0 && (
              <View style={styles.card}>
                <SimpleBarChart
                  chartData={chartData}
                  dataKeyGetter={(d) => d.outOfZoneCount}
                  color="#f59e0b"
                  label="Out of Zone Events"
                />
              </View>
            )}

            {/* Sleep Activity Chart */}
            {chartData.length > 0 && (
              <View style={styles.card}>
                <SimpleLineChart
                  chartData={chartData}
                  dataKeyGetter={(d) => d.sleepHours}
                  color="#7c3aed"
                  label="Sleep Duration"
                  unit="Hours"
                />
              </View>
            )}

            {/* AI Analysis Section */}
            {aiAnalyses.length > 0 && (
              <View style={styles.card}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>AI Analysis History</Text>
                  <View style={styles.chartLegend}>
                    <View style={[styles.legendDot, { backgroundColor: '#7c3aed' }]} />
                    <Text style={styles.legendText}>{aiAnalyses.length} analyses</Text>
                  </View>
                </View>
                {aiAnalyses.slice(0, 3).map((analysis, idx) => (
                  <View key={idx} style={styles.analysisItem}>
                    <View style={styles.analysisLeft}>
                      <Text style={styles.analysisPrediction}>{analysis.prediction}</Text>
                      <Text style={styles.analysisDate}>
                        {analysis.timestamp?.toDate?.().toLocaleDateString()}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.confidenceBadge,
                        { backgroundColor: analysis.confidence > 0.8 ? '#10b981' : '#f59e0b' },
                      ]}
                    >
                      <Text style={styles.confidenceText}>
                        {Math.round(analysis.confidence * 100)}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            
          

         
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: { backgroundColor: '#fff' },
  periodButtonText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  periodButtonTextActive: { color: '#1e40af' },
  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: { marginTop: 12, fontSize: 16, color: '#3b82f6', fontWeight: '500', textAlign: 'center' },
  
  // Patient header
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  patientName: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  patientSubtext: { fontSize: 13, color: '#64748b', marginTop: 4 },
  patientStage: { fontSize: 12, color: '#7c3aed', fontWeight: '600', marginTop: 4 },
  
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  riskBadgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  riskBadgeScore: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Summary stats
  summaryGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryGradient: { padding: 14, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 6 },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 3 },
  
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#1e40af', marginTop: 4 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  chartWrapper: { width: '100%' },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  chartLegend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  
  chartContainer: { flexDirection: 'row' },
  yAxis: { width: 36, justifyContent: 'space-between', paddingVertical: 10 },
  axisLabel: { fontSize: 10, color: '#64748b', fontWeight: '500' },
  chartArea: { flex: 1, position: 'relative' },
  gridLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 20,
    bottom: 40,
    justifyContent: 'space-between',
  },
  gridLine: { height: 1, backgroundColor: '#e2e8f0' },
  linePath: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 40 },
  dataPoint: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    marginLeft: -5,
    marginTop: -5,
  },
  lineSegment: {
    position: 'absolute',
    height: 2.5,
    transformOrigin: 'left center',
  },
  xAxis: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  xAxisLabel: { fontSize: 10, color: '#64748b', fontWeight: '500' },
  
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    paddingTop: 20,
  },
  barWrapper: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barColumn: { width: '100%', alignItems: 'center', justifyContent: 'flex-end', height: 140 },
  bar: {
    width: '65%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    justifyContent: 'flex-start',
    alignItems: 'center',
    minHeight: 2,
    paddingTop: 4,
  },
  barValue: { fontSize: 10, fontWeight: '700', color: '#fff' },
  barLabel: { fontSize: 10, color: '#64748b', fontWeight: '500', marginTop: 6 },
  
  // Analysis items
  analysisItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  analysisLeft: { flex: 1 },
  analysisPrediction: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  analysisDate: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confidenceText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  
  // MRI items
  mriItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  mriLeft: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center' },
  mriName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  mriStatus: { fontSize: 11, color: '#7c3aed', fontWeight: '500', marginTop: 2 },
  mriDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  mriStats: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#dbeafe', borderRadius: 6 },
  mriStatText: { fontSize: 11, fontWeight: '600', color: '#1e40af' },
  
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#dbeafe',
    padding: 14,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
  },
  infoText: { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 19 },
});