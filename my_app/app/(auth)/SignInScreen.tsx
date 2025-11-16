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
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSignIn = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      const { user } = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      const role = await AsyncStorage.getItem(`role_${user.uid}`);

      if (!role) {
        Alert.alert('Error', 'User role not found.');
        return;
      }

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
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your health account</Text>

          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
          />

          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            placeholderTextColor="#9ca3af"
          />

          <TouchableOpacity onPress={onSignIn} activeOpacity={0.8} disabled={loading}>
            <LinearGradient
              colors={['#4cc9f0', '#4361ee']}
              style={[styles.button, loading && { opacity: 0.7 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Don’t have an account?{' '}
            <Text style={styles.link} onPress={() => router.push('/(auth)/SignUpScreen')}>
              Sign Up
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
