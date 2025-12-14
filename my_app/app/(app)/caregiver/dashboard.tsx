import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function CaregiverDashboard() {
  const router = useRouter();
  const [caregiverName, setCaregiverName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

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
          const patientDoc = await getDoc(doc(db, 'patients', userData.patientId));
          if (patientDoc.exists()) {
            setPatientName(patientDoc.data().name);
          }
        }
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPatient = () => {
    router.push('/(app)/caregiver/add-patient' as any);
  };

  const handleUploadMRI = () => {
    router.push('/(app)/caregiver/upload-mri' as any);
  };

  const handleBrowseDoctors = () => {
    router.push('/(app)/caregiver/browse-doctors' as any);
  };

  const handleSignOut = async () => {
    await auth.signOut();
    router.replace('/(auth)/SignInScreen');
  };

  const menuOptions = [
    {
      id: 1,
      title: 'Add Patient',
      subtitle: 'Register a new patient',
      icon: 'person-add',
      colors: ['#3b82f6', '#2563eb'],
      onPress: handleAddPatient,
    },
    {
      id: 2,
      title: 'Upload MRI',
      subtitle: 'Upload brain scan images',
      icon: 'cloud-upload',
      colors: ['#0ea5e9', '#0284c7'],
      onPress: handleUploadMRI,
    },
    {
      id: 3,
      title: 'Browse Doctors',
      subtitle: 'Find specialists nearby',
      icon: 'medical',
      colors: ['#06b6d4', '#0891b2'],
      onPress: handleBrowseDoctors,
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
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {patientName && (
          <View style={styles.patientCard}>
            <Ionicons name="person-circle-outline" size={20} color="#1e40af" />
            <Text style={styles.patientText}>Patient: {patientName}</Text>
          </View>
        )}
      </LinearGradient>

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        {menuOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            activeOpacity={0.9}
            onPress={option.onPress}
          >
            <LinearGradient
              colors={option.colors as any}
              style={styles.card}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name={option.icon as any} size={32} color="#fff" />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{option.title}</Text>
                  <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: '#dbeafe',
    fontWeight: '500',
  },
  name: {
    fontSize: 28,
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
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 10,
  },
  patientText: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e3a8a',
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e3a8a',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
});