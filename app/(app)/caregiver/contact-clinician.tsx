import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function ContactClinicianScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const clinicianId = params.clinicianId as string | undefined;
  const clinicianName = params.clinicianName as string | undefined;
  const patientId = params.patientId as string | undefined;

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
    {
      id: 'chat',
      title: 'Message Clinician',
      subtitle: 'Send a text message (Coming Soon)',
      icon: 'chatbubble-ellipses',
      color: '#3b82f6',
      onPress: () => {},
    },
    {
      id: 'call',
      title: 'Voice Call',
      subtitle: 'Start an audio-only call (Coming Soon)',
      icon: 'call',
      color: '#8b5cf6',
      onPress: () => {},
    },
  ];

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
