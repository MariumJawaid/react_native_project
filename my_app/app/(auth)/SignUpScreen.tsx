import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../firebaseConfig';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'caregiver'>('patient');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSignUp = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);

      const { user } = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        trimmedPassword
      );

      // ✅ STORE ROLE IN FIRESTORE
      await setDoc(doc(db, "users", user.uid), {
        email: trimmedEmail,
        role: role,
        createdAt: new Date(),
      });

      // (Optional cache)
      await AsyncStorage.setItem(`role_${user.uid}`, role);

      router.replace(`/(app)/${role}/dashboard` as any);

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={{
        uri: 'https://images.unsplash.com/photo-1588776814546-382ff04958dc?auto=format&fit=crop&w=1000&q=80',
      }}
      style={styles.background}
      blurRadius={5}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join as a {role === 'patient' ? 'Patient' : 'Caregiver'}
          </Text>

          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            placeholderTextColor="#9ca3af"
          />

          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[
                styles.roleBtn,
                role === 'patient' && styles.selectedRole,
              ]}
              onPress={() => setRole('patient')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.roleText,
                  role === 'patient' && styles.selectedText,
                ]}
              >
                Patient
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleBtn,
                role === 'caregiver' && styles.selectedRole,
              ]}
              onPress={() => setRole('caregiver')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.roleText,
                  role === 'caregiver' && styles.selectedText,
                ]}
              >
                Caregiver
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={onSignUp}
            activeOpacity={0.8}
            disabled={loading}
          >
            <LinearGradient
              colors={['#4cc9f0', '#4361ee']}
              style={[styles.button, loading && { opacity: 0.7 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Text
              style={styles.link}
              onPress={() => router.push('/(auth)/SignInScreen')}
            >
              Sign In
            </Text>
          </Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 64, 128, 0.3)',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1e3a8a',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    textAlign: 'center',
    color: '#64748b',
    marginBottom: 25,
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    color: '#334155',
  },
  roleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  selectedRole: {
    backgroundColor: '#4361ee',
    borderColor: '#4361ee',
  },
  roleText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 15,
  },
  selectedText: {
    color: '#ffffff',
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerText: {
    textAlign: 'center',
    marginTop: 18,
    color: '#475569',
    fontSize: 14,
  },
  link: {
    color: '#2563eb',
    fontWeight: '600',
  },
});