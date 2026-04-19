import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { rtdb, db, auth } from '../../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, off } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';
import { notificationService } from '../../../services/notificationService';

const { width } = Dimensions.get('window');

// ─── Alert banner component shown for fall/outOfZone events ───
function AlertBanner({
  visible,
  type,
  patientName,
  onDismiss,
}: {
  visible: boolean;
  type: 'fall' | 'zone' | null;
  patientName: string;
  onDismiss: () => void;
}) {
  if (!visible || !type) return null;
  const isFall = type === 'fall';
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onDismiss}>
      <View style={alertStyles.overlay}>
        <View style={[alertStyles.banner, isFall ? alertStyles.bannerFall : alertStyles.bannerZone]}>
          <View style={alertStyles.iconCircle}>
            <Ionicons name={isFall ? 'warning' : 'location'} size={36} color="#fff" />
          </View>
          <Text style={alertStyles.title}>
            {isFall ? '⚠️ Fall Detected' : '⚠️ Outside Safe Zone'}
          </Text>
          <Text style={alertStyles.message}>
            {isFall
              ? `${patientName || 'Patient'} has experienced a fall. Please check on them immediately.`
              : `${patientName || 'Patient'} has moved outside the safe geofence zone.`}
          </Text>
          <TouchableOpacity style={alertStyles.dismissBtn} onPress={onDismiss} activeOpacity={0.8}>
            <Text style={alertStyles.dismissText}>Acknowledge</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const alertStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  banner: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  bannerFall: { backgroundColor: '#dc2626' },
  bannerZone: { backgroundColor: '#d97706' },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 12, textAlign: 'center' },
  message: { fontSize: 15, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  dismissBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  dismissText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

export default function RealtimeMonitoring() {
  const router = useRouter();

  // Patient info from Firestore
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string>('Patient');

  // Real-time sensor data from Firebase Realtime DB
  const [vitals, setVitals] = useState({
    bpm: '0',
    fall: false,
    latitude: '0.000000',
    longitude: '0.000000',
    outOfZone: false,
    pitch: '0',
    roll: '0',
    sleeping: false,
  });

  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'fall' | 'zone' | null>(null);

  // Track previous states to detect transitions (false→true)
  const previousFallRef = useRef(false);
  const previousZoneRef = useRef(false);

  // ─── Step 1: Resolve patientId — wait for auth before touching Firestore ───
  useEffect(() => {
    // ✅ onAuthStateChanged guarantees auth is restored before any Firestore call
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const pid = userData.patientId;
          if (pid) {
            setPatientId(pid);
            const patientDoc = await getDoc(doc(db, 'patients', pid));
            if (patientDoc.exists()) {
              setPatientName(patientDoc.data().name || 'Patient');
            }
          }
        }
      } catch (err) {
        console.error('Error resolving patient:', err);
      }
    });
    return () => unsubAuth();
  }, []);

  // ─── Step 2: Subscribe to patients/{patientId}/current in Realtime DB ───
  useEffect(() => {
    if (!patientId) return;

    setLoading(true);
    // Path as specified: patients/{patientId}/current
    const currentRef = ref(rtdb, `patients/${patientId}/current`);
    console.log(`📡 Subscribing to: patients/${patientId}/current`);

    const unsubscribe = onValue(
      currentRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log('✅ Realtime data:', data);

          const processed = {
            bpm: data.bpm ? String(data.bpm).substring(0, 6) : '0',
            fall: Boolean(data.fall),
            latitude: data.latitude ? String(data.latitude) : '0.000000',
            longitude: data.longitude ? String(data.longitude) : '0.000000',
            outOfZone: Boolean(data.outOfZone),
            pitch: data.pitch ? String(data.pitch).substring(0, 6) : '0',
            roll: data.roll ? String(data.roll).substring(0, 6) : '0',
            sleeping: Boolean(data.sleeping),
          };

          setVitals(processed);
          setLastUpdate(new Date());
        } else {
          console.warn(`⚠️ No data at patients/${patientId}/current`);
        }
        setLoading(false);
      },
      (error: any) => {
        console.error('❌ Firebase RTDB error:', error.message);
        setLoading(false);
      }
    );

    return () => {
      off(currentRef, 'value', unsubscribe);
    };
  }, [patientId]);

  // ─── Step 3: Feature 6 – Detect fall and outOfZone transitions → alert + notification ───
  useEffect(() => {
    // FALL DETECTED: false → true transition
    if (vitals.fall && !previousFallRef.current) {
      console.log('🚨 FALL DETECTED');
      // In-app alert
      setAlertType('fall');
      setAlertVisible(true);
      // Persist notification (also shows Alert.alert for fall type in notificationService)
      notificationService.addNotification(
        'fall',
        `⚠️ Fall Detected for ${patientName}`,
        `A fall was detected at ${new Date().toLocaleTimeString()}. Location: ${vitals.latitude}, ${vitals.longitude}`
      );
      previousFallRef.current = true;
    } else if (!vitals.fall && previousFallRef.current) {
      previousFallRef.current = false;
    }
  }, [vitals.fall, patientName]);

  useEffect(() => {
    // OUT OF ZONE: false → true transition
    if (vitals.outOfZone && !previousZoneRef.current) {
      console.log('🚨 OUT OF ZONE DETECTED');
      setAlertType('zone');
      setAlertVisible(true);
      notificationService.addNotification(
        'zone',
        `⚠️ ${patientName} Outside Safe Zone`,
        `Patient has moved outside the geofence at ${new Date().toLocaleTimeString()}.`
      );
      previousZoneRef.current = true;
    } else if (!vitals.outOfZone && previousZoneRef.current) {
      previousZoneRef.current = false;
    }
  }, [vitals.outOfZone, patientName]);

  const getBpmStatus = (bpm: string) => {
    const value = parseFloat(bpm);
    if (value < 60) return { color: '#06b6d4', text: 'Low', icon: 'arrow-down' };
    if (value > 100) return { color: '#ef4444', text: 'High', icon: 'arrow-up' };
    return { color: '#10b981', text: 'Normal', icon: 'checkmark' };
  };

  const bpmStatus = getBpmStatus(vitals.bpm);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Fall / Zone Alert Modal */}
      <AlertBanner
        visible={alertVisible}
        type={alertType}
        patientName={patientName}
        onDismiss={() => setAlertVisible(false)}
      />

      {/* Header */}
      <LinearGradient colors={['#1e40af', '#1e3a8a']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Live Monitoring</Text>
            <View style={styles.liveIndicator}>
              <View style={[styles.liveDot, !loading && { backgroundColor: '#10b981' }]} />
              <Text style={styles.liveText}>{loading ? 'Connecting...' : 'Live'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.refreshBtn}>
            <Ionicons name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Patient name chip */}
        {patientName && (
          <View style={styles.patientChip}>
            <Ionicons name="person" size={14} color="#1e40af" />
            <Text style={styles.patientChipText}>{patientName}</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Last Update */}
        <Text style={styles.lastUpdate}>
          Last updated: {lastUpdate.toLocaleTimeString()} • patients/{patientId || '...'}/current
        </Text>

        {/* Heart Rate - Primary Card */}
        <LinearGradient
          colors={['#3b82f6', '#2563eb']}
          style={styles.primaryCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.primaryCardHeader}>
            <View style={styles.primaryIconContainer}>
              <Ionicons name="heart" size={32} color="#fff" />
            </View>
            <View style={styles.primaryCardTitleContainer}>
              <Text style={styles.primaryCardLabel}>Heart Rate</Text>
              <View style={styles.statusBadge}>
                <Ionicons name={bpmStatus.icon as any} size={14} color="#fff" />
                <Text style={styles.statusBadgeText}>{bpmStatus.text}</Text>
              </View>
            </View>
          </View>
          <View style={styles.primaryCardContent}>
            <Text style={styles.primaryCardValue}>{vitals.bpm}</Text>
            <Text style={styles.primaryCardUnit}>BPM</Text>
          </View>
          <View style={styles.heartRateBar}>
            <View
              style={[
                styles.heartRateProgress,
                { width: `${Math.min((parseFloat(vitals.bpm) / 120) * 100, 100)}%` },
              ]}
            />
          </View>
        </LinearGradient>

        {/* Safety Status Alert Cards */}
        <Text style={styles.sectionTitle}>Safety Status</Text>
        <View style={styles.alertGrid}>
          {/* Fall Detection */}
          <View style={[styles.alertCard, vitals.fall && styles.alertCardDanger]}>
            <View style={[styles.alertIconContainer, { backgroundColor: vitals.fall ? '#fee2e2' : '#dbeafe' }]}>
              <Ionicons name="warning" size={28} color={vitals.fall ? '#ef4444' : '#3b82f6'} />
            </View>
            <Text style={styles.alertLabel}>Fall Detection</Text>
            <Text style={[styles.alertValue, { color: vitals.fall ? '#ef4444' : '#10b981' }]}>
              {vitals.fall ? '🚨 ALERT' : '✅ Safe'}
            </Text>
          </View>

          {/* Sleep Status */}
          <View style={styles.alertCard}>
            <View style={[styles.alertIconContainer, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name={vitals.sleeping ? 'moon' : 'sunny'} size={28} color="#3b82f6" />
            </View>
            <Text style={styles.alertLabel}>Sleep Status</Text>
            <Text style={[styles.alertValue, { color: vitals.sleeping ? '#06b6d4' : '#0ea5e9' }]}>
              {vitals.sleeping ? 'Sleeping' : 'Awake'}
            </Text>
          </View>

          {/* Zone Status */}
          <View style={[styles.alertCard, vitals.outOfZone && styles.alertCardDanger]}>
            <View style={[styles.alertIconContainer, { backgroundColor: vitals.outOfZone ? '#fee2e2' : '#dbeafe' }]}>
              <Ionicons name="location" size={28} color={vitals.outOfZone ? '#ef4444' : '#3b82f6'} />
            </View>
            <Text style={styles.alertLabel}>Safe Zone</Text>
            <Text style={[styles.alertValue, { color: vitals.outOfZone ? '#ef4444' : '#10b981' }]}>
              {vitals.outOfZone ? '🚨 Outside' : '✅ Inside'}
            </Text>
          </View>
        </View>

        {/* Motion Sensors */}
        <Text style={styles.sectionTitle}>Motion Sensors</Text>
        <View style={styles.sensorCard}>
          <View style={styles.sensorRow}>
            <View style={styles.sensorLeft}>
              <View style={styles.sensorIconContainer}>
                <Ionicons name="git-compare" size={24} color="#3b82f6" />
              </View>
              <View>
                <Text style={styles.sensorLabel}>Pitch</Text>
                <Text style={styles.sensorDescription}>Forward/Backward tilt</Text>
              </View>
            </View>
            <Text style={styles.sensorValue}>{vitals.pitch}°</Text>
          </View>
          <View style={styles.sensorDivider} />
          <View style={styles.sensorRow}>
            <View style={styles.sensorLeft}>
              <View style={styles.sensorIconContainer}>
                <Ionicons name="swap-horizontal" size={24} color="#3b82f6" />
              </View>
              <View>
                <Text style={styles.sensorLabel}>Roll</Text>
                <Text style={styles.sensorDescription}>Side-to-side tilt</Text>
              </View>
            </View>
            <Text style={styles.sensorValue}>{vitals.roll}°</Text>
          </View>
        </View>

        {/* Location */}
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.locationCard}>
          <LinearGradient
            colors={['#0ea5e9', '#0284c7']}
            style={styles.locationGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="navigate" size={32} color="#fff" />
          </LinearGradient>
          <View style={styles.locationContent}>
            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>Latitude:</Text>
              <Text style={styles.locationValue}>{vitals.latitude}</Text>
            </View>
            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>Longitude:</Text>
              <Text style={styles.locationValue}>{vitals.longitude}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => {
              router.push({
                pathname: '/(app)/caregiver/location-map' as any,
                params: {
                  latitude: vitals.latitude,
                  longitude: vitals.longitude,
                  title: 'Patient Location',
                },
              });
            }}
          >
            <Ionicons name="map" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTextContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 6 },
  liveIndicator: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 12, gap: 6,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  liveText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  refreshBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  patientChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
    alignSelf: 'flex-start', gap: 6,
  },
  patientChipText: { fontSize: 13, fontWeight: '700', color: '#1e40af' },
  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  lastUpdate: {
    fontSize: 11, color: '#94a3b8',
    textAlign: 'center', marginBottom: 20, fontWeight: '500',
  },
  primaryCard: {
    borderRadius: 24, padding: 24, marginBottom: 24,
    shadowColor: '#1e40af', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  primaryCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  primaryIconContainer: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  primaryCardTitleContainer: { flex: 1 },
  primaryCardLabel: { fontSize: 16, color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginBottom: 6 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, gap: 4,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  primaryCardContent: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  primaryCardValue: { fontSize: 64, fontWeight: '700', color: '#fff' },
  primaryCardUnit: { fontSize: 24, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginLeft: 8 },
  heartRateBar: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3, overflow: 'hidden',
  },
  heartRateProgress: { height: '100%', backgroundColor: '#fff', borderRadius: 3 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  alertGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  alertCard: {
    flex: 1, minWidth: (width - 52) / 2,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    alignItems: 'center',
    shadowColor: '#1e40af', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  alertCardDanger: { borderWidth: 2, borderColor: '#fca5a5', backgroundColor: '#fff5f5' },
  alertIconContainer: {
    width: 56, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  alertLabel: { fontSize: 13, color: '#64748b', fontWeight: '500', marginBottom: 4 },
  alertValue: { fontSize: 14, fontWeight: '700' },
  sensorCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24,
    shadowColor: '#1e40af', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  sensorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sensorLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sensorIconContainer: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center',
  },
  sensorLabel: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  sensorDescription: { fontSize: 12, color: '#64748b' },
  sensorValue: { fontSize: 24, fontWeight: '700', color: '#3b82f6' },
  sensorDivider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 16 },
  locationCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#1e40af', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  locationGradient: {
    width: 64, height: 64, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  locationContent: { flex: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  locationLabel: { fontSize: 13, color: '#64748b', fontWeight: '500', marginRight: 8 },
  locationValue: { fontSize: 14, color: '#1e293b', fontWeight: '600' },
  mapButton: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#3b82f6',
    justifyContent: 'center', alignItems: 'center',
  },
});