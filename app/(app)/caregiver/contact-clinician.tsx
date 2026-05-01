import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export default function ContactClinicianScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const patientId = params.patientId as string | undefined;
  
  const [clinicianId, setClinicianId] = useState<string | undefined>(undefined);
  const [clinicianName, setClinicianName] = useState<string | undefined>(undefined);
  const [clinicianEmail, setClinicianEmail] = useState<string | undefined>(undefined);
  const [clinicianPhone, setClinicianPhone] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Fetch clinician info from caregiver collection
  useEffect(() => {
    const fetchCaregiverClinicianInfo = async () => {
      try {
        const caregiverId = auth.currentUser?.uid;
        if (!caregiverId) {
          setLoading(false);
          return;
        }

        const caregiverDoc = await getDoc(doc(db, 'users', caregiverId));
        if (caregiverDoc.exists()) {
          const data = caregiverDoc.data();
          setClinicianId(data.linkedClinicianId);
          setClinicianName(data.linkedClinicianName);
          setClinicianEmail(data.linkedClinicianEmail);
          setClinicianPhone(data.linkedClinicianPhone);
        }
      } catch (error) {
        console.error('Error fetching caregiver clinician info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCaregiverClinicianInfo();
  }, []);

  const options = [
    {
      id: 'video',
      title: 'Video Consultation',
      subtitle: 'Start a live video call with the clinician',
      icon: 'videocam',
      color: '#059669',
      onPress: () => {
        if (!clinicianId) {
          Alert.alert(
            'Select Clinician',
            'No clinician specified. Please select a doctor from the Browse Doctors section or wait for an accepted consultation.',
            [
              { text: 'Browse Doctors', onPress: () => router.push('/(app)/caregiver/browse-doctors' as any) },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
          return;
        }
        
        router.push({
          pathname: '/(app)/caregiver/teleconsultation' as any,
          params: { clinicianId, patientId }
        });
      },
    },
    
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading clinician information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#1e40af', '#1e3a8a']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Clinician</Text>
          <View style={{ width: 44 }} />
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Clinician Info Card */}
        {clinicianName && (
          <View style={styles.clinicianCard}>
            <View style={styles.clinicianAvatar}>
              <Ionicons name="person-circle" size={48} color="#3b82f6" />
            </View>
            <View style={styles.clinicianInfo}>
              <Text style={styles.clinicianName}>Dr. {clinicianName}</Text>
              {clinicianEmail && <Text style={styles.clinicianDetail}>{clinicianEmail}</Text>}
              {clinicianPhone && <Text style={styles.clinicianDetail}>{clinicianPhone}</Text>}
            </View>
          </View>
        )}

        <Text style={styles.instructions}>
          How would you like to contact {clinicianName ? `Dr. ${clinicianName}` : 'the clinician'}?
        </Text>

        {options.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[styles.optionCard, option.id !== 'video' && { opacity: 0.6 }]}
            onPress={option.onPress}
            activeOpacity={0.8}
            disabled={option.id !== 'video'}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${option.color}15` }]}>
              <Ionicons name={option.icon as any} size={28} color={option.color} />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>
        ))}
      </View>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
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
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  clinicianCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  clinicianAvatar: {
    marginRight: 16,
  },
  clinicianInfo: {
    flex: 1,
  },
  clinicianName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  clinicianDetail: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 2,
  },
  instructions: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 24,
    fontWeight: '500',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
});
