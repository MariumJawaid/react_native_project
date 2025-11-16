import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to the App</Text>
      <Link href="/(auth)/SignInScreen" asChild>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
      </Link>
      <Link href="/(auth)/SignUpScreen" asChild>
        <TouchableOpacity style={[styles.button, styles.signUpButton]}>
          <Text style={[styles.buttonText, styles.signUpButtonText]}>Sign Up</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, marginBottom: 10 },
  buttonText: { color: 'white', fontSize: 18 },
  signUpButton: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#007AFF' },
  signUpButtonText: { color: '#007AFF' },
});