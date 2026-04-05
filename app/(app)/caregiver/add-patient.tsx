import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function AddPatientScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddPatient = async () => {
    if (!name || !age || !email || !location || !gender) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      const caregiverUID = auth.currentUser?.uid;

      if (!caregiverUID) {
        Alert.alert('Error', 'No caregiver logged in');
        return;
      }

      const patientId = `patient_${Date.now()}`;

      // Create patient document
      await setDoc(doc(db, 'patients', patientId), {
        name,
        age: parseInt(age),
        email,
        location,
        gender,
        caregiverId: caregiverUID,
        createdAt: new Date(),
        createdBy: caregiverUID,
      });

      // Link patient to caregiver's user document
      await updateDoc(doc(db, 'users', caregiverUID), {
        patientId: patientId,
      });

      Alert.alert('Success', 'Patient added successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);

      // Clear form
      setName('');
      setAge('');
      setEmail('');
      setLocation('');
      setGender('');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const GenderButton = ({ value, label, icon }: { value: string; label: string; icon: any }) => (
    <TouchableOpacity
      style={[styles.genderButton, gender === value && styles.genderButtonActive]}
      onPress={() => setGender(value)}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon}
        size={24}
        color={gender === value ? '#fff' : '#2563eb'}
      />
      <Text style={[styles.genderText, gender === value && styles.genderTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#eff6ff', '#dbeafe', '#bfdbfe']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Patient</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon Header */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-add" size={50} color="#2563eb" />
            </View>
            <Text style={styles.subtitle}>Enter patient details</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  placeholder="Enter patient's full name"
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Age Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Age</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="calendar-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  placeholder="Enter age"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  style={styles.input}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Gender Selection */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderContainer}>
                <GenderButton value="male" label="Male" icon="male" />
                <GenderButton value="female" label="Female" icon="female" />
                <GenderButton value="other" label="Other" icon="transgender" />
              </View>
            </View>

            {/* Location Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Location</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="location-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  placeholder="Enter city or address"
                  value={location}
                  onChangeText={setLocation}
                  style={styles.input}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  placeholder="Enter email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleAddPatient}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={loading ? ['#94a3b8', '#64748b'] : ['#2563eb', '#1e40af']}
                style={styles.submitGradient}
              >
                {loading ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.submitText}>Adding Patient...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                    <Text style={styles.submitText}>Add Patient</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eff6ff',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e3a8a',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: '#334155',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 14,
  },
  genderButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  genderTextActive: {
    color: '#fff',
  },
  submitButton: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  submitText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
});