import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PatientDashboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Patient Dashboard</Text>
      <Text>Welcome, Patient! Here is your care plan.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
});