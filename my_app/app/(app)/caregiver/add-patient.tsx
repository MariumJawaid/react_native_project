import React, { useState } from 'react';
import { View, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebaseConfig';

export default function AddPatientScreen() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddPatient = async () => {
    if (!name || !age || !email) {
      Alert.alert('Error', 'Please fill all fields');
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

      // Create patient document with single caregiver ID
      await setDoc(doc(db, 'patients', patientId), {
        name,
        age: parseInt(age),
        email,
        caregiverId: caregiverUID,  // Single caregiver (not array)
        createdAt: new Date(),
        createdBy: caregiverUID,
      });

      // Link patient to caregiver's user document
      await updateDoc(doc(db, 'users', caregiverUID), {
        patientId: patientId,
      });

      Alert.alert('Success', 'Patient added successfully!');
      
      // Clear form
      setName('');
      setAge('');
      setEmail('');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Patient Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />
      <TextInput
        placeholder="Age"
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />
      <Button
        title={loading ? 'Adding...' : 'Add Patient'}
        onPress={handleAddPatient}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    color: '#334155',
  },
});