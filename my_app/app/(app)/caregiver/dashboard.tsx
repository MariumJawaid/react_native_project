import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CaregiverDashboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Caregiver Dashboard</Text>
      <Text>Welcome, Caregiver! Here are your tasks.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
});