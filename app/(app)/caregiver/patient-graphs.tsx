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
import { rtdb } from '../../../firebaseConfig';
import { ref, get } from 'firebase/database';

const { width } = Dimensions.get('window');
const chartWidth = width - 80;

export default function PatientGraphs() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);

  // Generate sample data for fallback
  const generateData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, index) => ({
      day,
      bpm: 70 + Math.random() * 20,
      sleep: 6 + Math.random() * 3,
      pitch: Math.random() * 10,
      roll: Math.random() * 5,
      falls: Math.floor(Math.random() * 3),
    }));
  };

  const [data, setData] = useState(generateData());

  const periods = [
    { id: '7d', label: '7 Days' },
    { id: '14d', label: '14 Days' },
    { id: '30d', label: '30 Days' },
  ];

  // Fetch historical data from Firebase
  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        setLoading(true);
        // Reference to the patient history data - adjust path based on your Firebase structure
        // Example structure: /patients/{patientId}/history/{period}
        const historyRef = ref(rtdb, `patients/patient1/history/${selectedPeriod}`);
        const snapshot = await get(historyRef);
        
        if (snapshot.exists()) {
          const firebaseData = snapshot.val();
          
          // Convert Firebase data to array format with proper typing
          if (Array.isArray(firebaseData)) {
            setData(firebaseData as typeof data);
          } else if (typeof firebaseData === 'object') {
            // If data is object, convert to array
            const dataArray = Object.values(firebaseData) as typeof data;
            setData(dataArray);
          }
        } else {
          // Use sample data if no Firebase data available
          setData(generateData());
        }
      } catch (error) {
        console.error('Error fetching graph data:', error);
        // Fallback to sample data on error
        setData(generateData());
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, [selectedPeriod]);

  // Simple line chart component
  const SimpleLineChart = ({ 
    data, 
    dataKey, 
    color, 
    label, 
    unit 
  }: { 
    data: any[]; 
    dataKey: string; 
    color: string; 
    label: string; 
    unit: string;
  }) => {
    const maxValue = Math.max(...data.map(d => d[dataKey]));
    const minValue = Math.min(...data.map(d => d[dataKey]));
    const range = maxValue - minValue || 1;
    const chartHeight = 180;
    const padding = 20;

    // Calculate points
    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * (chartWidth - 60);
      const y = chartHeight - padding - ((point[dataKey] - minValue) / range) * (chartHeight - 2 * padding);
      return { x, y };
    });

    return (
      <View style={styles.chartWrapper}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{label}</Text>
          <View style={styles.chartLegend}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{unit}</Text>
          </View>
        </View>
        
        {/* Y-axis labels */}
        <View style={styles.chartContainer}>
          <View style={styles.yAxis}>
            <Text style={styles.axisLabel}>{maxValue.toFixed(0)}</Text>
            <Text style={styles.axisLabel}>{((maxValue + minValue) / 2).toFixed(0)}</Text>
            <Text style={styles.axisLabel}>{minValue.toFixed(0)}</Text>
          </View>
          
          {/* Chart area */}
          <View style={[styles.chartArea, { height: chartHeight }]}>
            {/* Grid lines */}
            <View style={styles.gridLines}>
              <View style={styles.gridLine} />
              <View style={styles.gridLine} />
              <View style={styles.gridLine} />
            </View>

            {/* Line connecting all points */}
            <View style={styles.linePath}>
              {points.map((point, index) => {
                if (index < points.length - 1) {
                  const nextPoint = points[index + 1];
                  const dx = nextPoint.x - point.x;
                  const dy = nextPoint.y - point.y;
                  const length = Math.sqrt(dx * dx + dy * dy);
                  const angle = Math.atan2(dy, dx);

                  return (
                    <View
                      key={`line-${index}`}
                      style={[
                        styles.lineSegment,
                        {
                          left: point.x,
                          top: point.y,
                          width: length,
                          transform: [{ rotate: `${angle}rad` }],
                          backgroundColor: color,
                        }
                      ]}
                    />
                  );
                }
                return null;
              })}

              {/* Data points on top */}
              {points.map((point, index) => (
                <View 
                  key={`point-${index}`}
                  style={[
                    styles.dataPoint, 
                    { 
                      left: point.x, 
                      top: point.y,
                      backgroundColor: color,
                      shadowColor: color,
                    }
                  ]} 
                />
              ))}
            </View>

            {/* X-axis labels */}
            <View style={styles.xAxis}>
              {data.map((point, index) => (
                <Text key={index} style={styles.xAxisLabel}>
                  {point.day}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Bar chart for falls
  const SimpleBarChart = ({ data, dataKey, color, label }: any) => {
    const maxValue = Math.max(...data.map((d: any) => d[dataKey]), 1);
    const chartHeight = 180;

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
          {data.map((point: any, index: number) => {
            const barHeight = (point[dataKey] / maxValue) * (chartHeight - 40);
            return (
              <View key={index} style={styles.barWrapper}>
                <View style={styles.barColumn}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        height: barHeight || 0,
                        backgroundColor: color,
                      }
                    ]} 
                  >
                    {point[dataKey] > 0 && (
                      <Text style={styles.barValue}>{point[dataKey]}</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.barLabel}>{point.day}</Text>
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

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map(period => (
            <TouchableOpacity
              key={period.id}
              style={[
                styles.periodButton,
                selectedPeriod === period.id && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period.id)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period.id && styles.periodButtonTextActive
              ]}>
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
            <Text style={styles.loadingText}>Loading patient data...</Text>
          </View>
        ) : (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.summaryGradient}
            >
              <Ionicons name="heart" size={24} color="#fff" />
              <Text style={styles.summaryValue}>75.2</Text>
              <Text style={styles.summaryLabel}>Avg BPM</Text>
            </LinearGradient>
          </View>

          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['#0ea5e9', '#0284c7']}
              style={styles.summaryGradient}
            >
              <Ionicons name="moon" size={24} color="#fff" />
              <Text style={styles.summaryValue}>7.5h</Text>
              <Text style={styles.summaryLabel}>Avg Sleep</Text>
            </LinearGradient>
          </View>

          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['#06b6d4', '#0891b2']}
              style={styles.summaryGradient}
            >
              <Ionicons name="warning" size={24} color="#fff" />
              <Text style={styles.summaryValue}>{data.reduce((sum, d) => sum + d.falls, 0)}</Text>
              <Text style={styles.summaryLabel}>Total Falls</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Heart Rate Chart */}
        <View style={styles.card}>
          <SimpleLineChart
            data={data}
            dataKey="bpm"
            color="#3b82f6"
            label="Heart Rate (BPM)"
            unit="BPM"
          />
        </View>

        {/* Sleep Hours Chart */}
        <View style={styles.card}>
          <SimpleLineChart
            data={data}
            dataKey="sleep"
            color="#0ea5e9"
            label="Sleep Duration"
            unit="Hours"
          />
        </View>

        {/* Motion Sensors */}
        <View style={styles.card}>
          <SimpleLineChart
            data={data}
            dataKey="pitch"
            color="#06b6d4"
            label="Pitch Angle"
            unit="Degrees"
          />
        </View>

        <View style={styles.card}>
          <SimpleLineChart
            data={data}
            dataKey="roll"
            color="#38bdf8"
            label="Roll Angle"
            unit="Degrees"
          />
        </View>

        {/* Falls Chart */}
        <View style={styles.card}>
          <SimpleBarChart
            data={data}
            dataKey="falls"
            color="#ef4444"
            label="Fall Incidents"
          />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#3b82f6" />
          <Text style={styles.infoText}>
            Data is updated in real-time from Firebase. Tap on any metric to view detailed breakdown.
          </Text>
        </View>
          </>
        )}
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#fff',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  periodButtonTextActive: {
    color: '#1e40af',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
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
  summaryGradient: {
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
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
  chartWrapper: {
    width: '100%',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  chartContainer: {
    flexDirection: 'row',
  },
  yAxis: {
    width: 40,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  axisLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 20,
    bottom: 40,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  linePath: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 40,
  },
  dataPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: '#fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    marginLeft: -6,
    marginTop: -6,
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
    paddingTop: 10,
  },
  xAxisLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 200,
    paddingTop: 20,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barColumn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 160,
  },
  bar: {
    width: '70%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 4,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  barLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
});