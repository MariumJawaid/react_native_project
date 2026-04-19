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
import { rtdb, db, auth } from '../../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const chartWidth = width - 80;

// ─── Date utility helpers ───
function getDateKey(date: Date): string {
  // Returns "YYYY-MM-DD"
  return date.toISOString().split('T')[0];
}

function getPastDates(days: number): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(getDateKey(d));
  }
  return dates;
}

function shortDateLabel(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Types ───
interface DayData {
  day: string;        // Short label e.g. "Apr 12"
  dateKey: string;    // "YYYY-MM-DD"
  bpm: number;
  falls: number;
  outOfZone: number;
  sleeping: number;   // percentage of readings where sleeping=true
  readingCount: number;
}

export default function PatientGraphs() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 14>(7);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [data, setData] = useState<DayData[]>([]);
  const [summaryBpm, setSummaryBpm] = useState(0);
  const [totalFalls, setTotalFalls] = useState(0);
  const [totalZone, setTotalZone] = useState(0);

  const periods: { id: 7 | 14; label: string }[] = [
    { id: 7, label: '7 Days' },
    { id: 14, label: '14 Days' },
  ];

  // ─── Resolve patientId — wait for auth before touching Firestore ───
  useEffect(() => {
    // ✅ onAuthStateChanged guarantees auth is restored before any Firestore call
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

  // ─── Fetch sensorData from patients/{patientId}/sensorData/{date}/{timestamp} ───
  useEffect(() => {
    if (!patientId) return;
    fetchGraphData();
  }, [patientId, selectedPeriod]);

  const fetchGraphData = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const dates = getPastDates(selectedPeriod);
      const dayDataArray: DayData[] = [];

      for (const dateKey of dates) {
        // Path: patients/{patientId}/sensorData/{date}
        const dayRef = ref(rtdb, `patients/${patientId}/sensorData/${dateKey}`);
        const snapshot = await get(dayRef);

        let bpmSum = 0;
        let bpmCount = 0;
        let fallCount = 0;
        let zoneCount = 0;
        let sleepCount = 0;
        let readingCount = 0;

        if (snapshot.exists()) {
          const readings = snapshot.val();
          // Each child is a timestamp key: patients/{patientId}/sensorData/{date}/{timestamp}
          Object.values(readings).forEach((reading: any) => {
            readingCount++;
            if (typeof reading.bpm === 'number' || typeof reading.bpm === 'string') {
              const bpmVal = parseFloat(String(reading.bpm));
              if (!isNaN(bpmVal) && bpmVal > 0) {
                bpmSum += bpmVal;
                bpmCount++;
              }
            }
            if (reading.fall === true) fallCount++;
            if (reading.outOfZone === true) zoneCount++;
            if (reading.sleeping === true) sleepCount++;
          });
        }

        dayDataArray.push({
          day: shortDateLabel(dateKey),
          dateKey,
          bpm: bpmCount > 0 ? Math.round(bpmSum / bpmCount) : 0,
          falls: fallCount,
          outOfZone: zoneCount,
          sleeping: readingCount > 0 ? Math.round((sleepCount / readingCount) * 100) : 0,
          readingCount,
        });
      }

      setData(dayDataArray);

      // Compute summaries
      const validBpm = dayDataArray.filter((d) => d.bpm > 0);
      const avgBpm =
        validBpm.length > 0
          ? validBpm.reduce((s, d) => s + d.bpm, 0) / validBpm.length
          : 0;
      setSummaryBpm(Math.round(avgBpm));
      setTotalFalls(dayDataArray.reduce((s, d) => s + d.falls, 0));
      setTotalZone(dayDataArray.reduce((s, d) => s + d.outOfZone, 0));
    } catch (error) {
      console.error('Error fetching sensorData:', error);
      // On error, use flat placeholder data so charts render
      const placeholder = getPastDates(selectedPeriod).map((dateKey) => ({
        day: shortDateLabel(dateKey),
        dateKey,
        bpm: 0,
        falls: 0,
        outOfZone: 0,
        sleeping: 0,
        readingCount: 0,
      }));
      setData(placeholder);
    } finally {
      setLoading(false);
    }
  };

  // ─── Simple line chart (pure RN View-based) ───
  const SimpleLineChart = ({
    chartData,
    dataKey,
    color,
    label,
    unit,
  }: {
    chartData: DayData[];
    dataKey: keyof DayData;
    color: string;
    label: string;
    unit: string;
  }) => {
    const values = chartData.map((d) => Number(d[dataKey]) || 0);
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;
    const chartHeight = 160;
    const padding = 20;
    const pointAreaWidth = chartWidth - 50;

    const points = values.map((v, i) => ({
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
            <Text style={styles.axisLabel}>{maxValue}</Text>
            <Text style={styles.axisLabel}>{Math.round((maxValue + minValue) / 2)}</Text>
            <Text style={styles.axisLabel}>{minValue}</Text>
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

            {/* X-axis labels – show every N-th label to avoid crowding */}
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

  // ─── Bar chart (falls / zone events) ───
  const SimpleBarChart = ({
    chartData,
    dataKey,
    color,
    label,
  }: {
    chartData: DayData[];
    dataKey: keyof DayData;
    color: string;
    label: string;
  }) => {
    const maxValue = Math.max(...chartData.map((d) => Number(d[dataKey]) || 0), 1);
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
            const val = Number(point[dataKey]) || 0;
            const barHeight = (val / maxValue) * (chartHeight - 40);
            const showLabel = chartData.length <= 7 || index === 0 || index === chartData.length - 1 || index % 3 === 0;
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

        {/* Period Selector — only 7d / 14d as specified */}
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
              Loading {selectedPeriod}-day data...{'\n'}
              <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                patients/{patientId || '...'}/sensorData
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
                  <Text style={styles.summaryLabel}>Fall Events</Text>
                </LinearGradient>
              </View>
              <View style={styles.summaryCard}>
                <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.summaryGradient}>
                  <Ionicons name="location" size={24} color="#fff" />
                  <Text style={styles.summaryValue}>{totalZone}</Text>
                  <Text style={styles.summaryLabel}>Zone Exits</Text>
                </LinearGradient>
              </View>
            </View>

            {/* Heart Rate Chart */}
            <View style={styles.card}>
              <SimpleLineChart
                chartData={data}
                dataKey="bpm"
                color="#3b82f6"
                label="Heart Rate (BPM)"
                unit="BPM"
              />
            </View>

            {/* Fall Events Chart */}
            <View style={styles.card}>
              <SimpleBarChart
                chartData={data}
                dataKey="falls"
                color="#ef4444"
                label="Fall Events"
              />
            </View>

            {/* Out of Zone Chart */}
            <View style={styles.card}>
              <SimpleBarChart
                chartData={data}
                dataKey="outOfZone"
                color="#f59e0b"
                label="Out of Zone Events"
              />
            </View>

            {/* Sleep Status Chart */}
            <View style={styles.card}>
              <SimpleLineChart
                chartData={data}
                dataKey="sleeping"
                color="#7c3aed"
                label="Sleep Activity (% readings)"
                unit="%"
              />
            </View>

            {/* Data source note */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color="#3b82f6" />
              <Text style={styles.infoText}>
                Data grouped by date from{' '}
                <Text style={{ fontWeight: '700' }}>
                  patients/{patientId}/sensorData/{'{date}'}/{'{timestamp}'}
                </Text>{' '}
                — showing last {selectedPeriod} days.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingTop: 20, paddingBottom: 24, paddingHorizontal: 20,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, padding: 4, gap: 4,
  },
  periodButton: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 8, alignItems: 'center',
  },
  periodButtonActive: { backgroundColor: '#fff' },
  periodButtonText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  periodButtonTextActive: { color: '#1e40af' },
  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100,
  },
  loadingText: { marginTop: 12, fontSize: 16, color: '#3b82f6', fontWeight: '500', textAlign: 'center' },
  summaryGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#1e40af', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  summaryGradient: { padding: 14, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 6 },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 3 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#1e40af', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  chartWrapper: { width: '100%' },
  chartHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
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
    position: 'absolute', left: 0, right: 0, top: 20, bottom: 40,
    justifyContent: 'space-between',
  },
  gridLine: { height: 1, backgroundColor: '#e2e8f0' },
  linePath: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 40 },
  dataPoint: {
    position: 'absolute', width: 10, height: 10, borderRadius: 5,
    borderWidth: 2, borderColor: '#fff',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
    marginLeft: -5, marginTop: -5,
  },
  lineSegment: {
    position: 'absolute', height: 2.5,
    transformOrigin: 'left center',
  },
  xAxis: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8,
  },
  xAxisLabel: { fontSize: 10, color: '#64748b', fontWeight: '500' },
  barChartContainer: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', height: 180, paddingTop: 20,
  },
  barWrapper: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barColumn: { width: '100%', alignItems: 'center', justifyContent: 'flex-end', height: 140 },
  bar: {
    width: '65%', borderTopLeftRadius: 6, borderTopRightRadius: 6,
    justifyContent: 'flex-start', alignItems: 'center', minHeight: 2, paddingTop: 4,
  },
  barValue: { fontSize: 10, fontWeight: '700', color: '#fff' },
  barLabel: { fontSize: 10, color: '#64748b', fontWeight: '500', marginTop: 6 },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#dbeafe', padding: 14,
    borderRadius: 12, gap: 12, marginTop: 8,
  },
  infoText: { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 19 },
});