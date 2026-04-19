import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { auth, db } from '../../../firebaseConfig';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '../../../services/notificationService';

const { width } = Dimensions.get('window');

export default function CaregiverDashboard() {
  const router = useRouter();
  const [caregiverName, setCaregiverName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // ─── Reload unread count when screen focused ───
  useFocusEffect(
    React.useCallback(() => {
      loadUnreadCount();
    }, [])
  );

  // ─── Listen for accepted consult requests in real-time (Feature 2) ───
  useEffect(() => {
    const caregiverId = auth.currentUser?.uid;
    if (!caregiverId) return;

    // Listen to consult_requests where caregiverId matches and status just became 'accepted' (or 'accepted ' with a space)
    const q = query(
      collection(db, 'consult_requests'),
      where('caregiverId', '==', caregiverId),
      where('status', 'in', ['accepted', 'accepted '])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'modified' || change.type === 'added') {
          const data = change.doc.data();
          
          let clinicianName = 'Clinician';
          try {
            const clinicianUserDoc = await getDoc(doc(db, 'users', data.clinicianId));
            if (clinicianUserDoc.exists()) {
              const clinicianData = clinicianUserDoc.data();
              clinicianName = clinicianData.displayName || clinicianData.email?.split('@')[0] || 'Clinician';
            }
          } catch (e) {
            console.error('Error fetching clinician name:', e);
          }

          // Persist the notification for consultation accepted
          notificationService.addNotification(
            'consult_accepted',
            'Consultation Accepted',
            `Your consultation request has been accepted by Dr. ${clinicianName}. Tap to prepare a video session.`,
            {
              clinicianId: data.clinicianId,
              clinicianName,
              patientId: data.patientId,
            }
          );
        }
      });
    });

    return () => unsubscribe();
  }, [auth.currentUser?.uid]);

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      const caregiverUID = auth.currentUser?.uid;
      if (!caregiverUID) return;

      // Get caregiver info
      const userDoc = await getDoc(doc(db, 'users', caregiverUID));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setCaregiverName(userData.email?.split('@')[0] || 'Caregiver');

        // Get patient info if linked
        if (userData.patientId) {
          setPatientId(userData.patientId);
          const patientDoc = await getDoc(doc(db, 'patients', userData.patientId));
          if (patientDoc.exists()) {
            setPatientName(patientDoc.data().name || 'Patient');
          }
        }
      }

      await loadUnreadCount();
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await auth.signOut();
    router.replace('/(auth)/SignInScreen');
  };

  // ─── Primary quick-action cards ───
  const primaryActions = [
    {
      id: 1,
      title: 'Add Patient',
      subtitle: 'Register new patient',
      icon: 'person-add',
      colors: ['#3b82f6', '#2563eb'],
      onPress: () => router.push('/(app)/caregiver/add-patient' as any),
    },
    {
      id: 2,
      title: 'Upload MRI',
      subtitle: 'Brain scan images',
      icon: 'cloud-upload',
      colors: ['#60a5fa', '#3b82f6'],
      onPress: () => router.push('/(app)/caregiver/upload-mri' as any),
    },
  ];

  // ─── Secondary action cards ───
  const secondaryActions = [
    {
      id: 3,
      title: 'Browse Doctors',
      subtitle: 'Find & consult specialists',
      icon: 'medical',
      colors: ['#0ea5e9', '#0284c7'],
      onPress: () => router.push('/(app)/caregiver/browse-doctors' as any),
    },
    {
      id: 4,
      title: 'Patient Analytics',
      subtitle: '7 & 14 day trends',
      icon: 'bar-chart',
      colors: ['#06b6d4', '#0891b2'],
      onPress: () => router.push('/(app)/caregiver/patient-graphs' as any),
    },
    {
      id: 5,
      title: 'Live Monitoring',
      subtitle: 'Real-time vitals & alerts',
      icon: 'pulse',
      colors: ['#38bdf8', '#0ea5e9'],
      onPress: () => router.push('/(app)/caregiver/realtime-monitoring' as any),
    },
    {
      id: 6,
      title: 'Lifestyle Tips',
      subtitle: 'Alzheimer\'s care guide',
      icon: 'heart',
      colors: ['#7c3aed', '#6d28d9'],
      onPress: () => router.push('/(app)/caregiver/lifestyle-recommendations' as any),
    },
    {
      id: 7,
      title: 'Contact Clinician',
      subtitle: 'Reach out to clinician',
      icon: 'chatbubbles',
      colors: ['#059669', '#047857'],
      onPress: () => router.push('/(app)/caregiver/contact-clinician' as any),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header with Gradient */}
      <LinearGradient colors={['#1e40af', '#1e3a8a']} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{caregiverName}</Text>
          </View>
          <View style={styles.headerActionsContainer}>
            {/* Notifications */}
            <TouchableOpacity
              onPress={() => router.push('/(app)/caregiver/notifications' as any)}
              style={styles.headerBtn}
            >
              <Ionicons name="notifications" size={24} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            {/* Sign out */}
            <TouchableOpacity onPress={handleSignOut} style={styles.headerBtn}>
              <Ionicons name="log-out-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Current patient chip */}
        {patientName ? (
          <View style={styles.patientCard}>
            <View style={styles.patientIconCircle}>
              <Ionicons name="person" size={16} color="#1e40af" />
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientLabel}>Current Patient</Text>
              <Text style={styles.patientName}>{patientName}</Text>
            </View>
          </View>
        ) : null}
      </LinearGradient>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Primary Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.primaryGrid}>
          {primaryActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              activeOpacity={0.9}
              onPress={action.onPress}
              style={styles.primaryCardWrapper}
            >
              <LinearGradient
                colors={action.colors as any}
                style={styles.primaryCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.primaryIconContainer}>
                  <Ionicons name={action.icon as any} size={32} color="#fff" />
                </View>
                <Text style={styles.primaryCardTitle}>{action.title}</Text>
                <Text style={styles.primaryCardSubtitle}>{action.subtitle}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Secondary Actions */}
        <Text style={styles.sectionTitle}>Patient Care</Text>
        {secondaryActions.map((action) => (
          <TouchableOpacity key={action.id} activeOpacity={0.9} onPress={action.onPress}>
            <LinearGradient
              colors={action.colors as any}
              style={styles.secondaryCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.secondaryIconContainer}>
                <Ionicons name={action.icon as any} size={28} color="#fff" />
              </View>
              <View style={styles.secondaryCardText}>
                <Text style={styles.secondaryCardTitle}>{action.title}</Text>
                <Text style={styles.secondaryCardSubtitle}>{action.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingTop: 20, paddingBottom: 30, paddingHorizontal: 20,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  greeting: { fontSize: 15, color: '#dbeafe', fontWeight: '500' },
  name: { fontSize: 26, color: '#fff', fontWeight: '700', marginTop: 4 },
  headerActionsContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  unreadBadge: {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#e74c3c',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  unreadBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  patientCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  patientIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center',
  },
  patientInfo: { flex: 1 },
  patientLabel: {
    fontSize: 11, color: '#64748b', fontWeight: '500',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  patientName: { fontSize: 16, color: '#1e293b', fontWeight: '700', marginTop: 2 },
  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 20, fontWeight: '700', color: '#1e293b',
    marginBottom: 16, marginTop: 8,
  },
  primaryGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  primaryCardWrapper: { flex: 1 },
  primaryCard: {
    borderRadius: 20, padding: 20, aspectRatio: 1,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#1e40af', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
  },
  primaryIconContainer: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  primaryCardTitle: {
    fontSize: 16, fontWeight: '700', color: '#fff',
    textAlign: 'center', marginTop: 8,
  },
  primaryCardSubtitle: {
    fontSize: 12, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', marginTop: 4,
  },
  secondaryCard: {
    borderRadius: 16, marginBottom: 12,
    shadowColor: '#1e40af', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
    flexDirection: 'row', alignItems: 'center', padding: 16,
  },
  secondaryIconContainer: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  secondaryCardText: { flex: 1 },
  secondaryCardTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 3 },
  secondaryCardSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
});