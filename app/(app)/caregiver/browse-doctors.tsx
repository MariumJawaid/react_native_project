import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../../../firebaseConfig';
import { collection, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function BrowseCliniciansScreen() {
  const router = useRouter();
  const [clinicians, setClinicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClinician, setSelectedClinician] = useState<any>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadClinicians();
    loadPatientId();
  }, []);

  const loadPatientId = async () => {
    try {
      const caregiverUID = auth.currentUser?.uid;
      if (!caregiverUID) return;
      const userDoc = await getDoc(doc(db, 'users', caregiverUID));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setPatientId(userData.patientId || null);
      }
    } catch (error) {
      console.error('Error loading patient ID:', error);
    }
  };

  const loadClinicians = async () => {
    try {
      setLoading(true);
      // Changed from 'clinician' to 'clinicians' to match your database
      const querySnapshot = await getDocs(collection(db, 'clinicians'));
      const cliniciansList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log('Loaded clinicians:', cliniciansList); // Debug log
      setClinicians(cliniciansList);
    } catch (error) {
      console.error('Error loading clinicians:', error);
      Alert.alert('Error', 'Failed to load clinicians.');
    } finally {
      setLoading(false);
    }
  };

  const renderClinicianItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.clinicianCard}
      onPress={() => setSelectedClinician(item)}
      activeOpacity={0.8}
    >
      <Ionicons name="person-circle" size={50} color="#2563eb" />
      <View style={styles.clinicianInfo}>
        <Text style={styles.clinicianName}>{item.fullName || 'Unknown'}</Text>
        <Text style={styles.clinicianSpecialty}>{item.specialization || 'N/A'}</Text>
        <Text style={styles.clinicianExperience}>
          {item.yearsOfExperience ? `${item.yearsOfExperience} years experience` : 'New clinician'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#64748b" />
    </TouchableOpacity>
  );

  const sendRequest = async () => {
    if (!summary.trim()) {
      Alert.alert('Error', 'Please enter a short summary of the patient.');
      return;
    }
    if (!patientId) {
      Alert.alert('Error', 'No patient linked to your account.');
      return;
    }

    try {
      setSending(true);
      await addDoc(collection(db, 'consult_requests'), {
        clinicianId: selectedClinician.id,
        patientId,
        caregiverId: auth.currentUser?.uid,
        summary,
        status: 'pending',
        createdAt: new Date(),
      });
      Alert.alert('Success', 'Consultation request sent!', [
        { text: 'OK', onPress: () => { setSelectedClinician(null); setSummary(''); } },
      ]);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to send request: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Browse Clinicians</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
      ) : (
        <FlatList
          data={clinicians}
          renderItem={renderClinicianItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No clinicians found.</Text>
          }
        />
      )}

      {/* Details Modal */}
      <Modal
        visible={!!selectedClinician}
        animationType="slide"
        onRequestClose={() => setSelectedClinician(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedClinician(null)}>
              <Ionicons name="close" size={28} color="#1e3a8a" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Clinician Details</Text>
            <View style={{ width: 28 }} />
          </View>

          {selectedClinician && (
            <ScrollView 
              style={styles.modalContent}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>{selectedClinician.fullName || 'N/A'}</Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Specialty:</Text>
                <Text style={styles.detailValue}>{selectedClinician.specialization || 'N/A'}</Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Department:</Text>
                <Text style={styles.detailValue}>{selectedClinician.department || 'N/A'}</Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Years of Experience:</Text>
                <Text style={styles.detailValue}>{selectedClinician.yearsOfExperience || '0'} years</Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Hospital:</Text>
                <Text style={styles.detailValue}>{selectedClinician.hospital || 'N/A'}</Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Address:</Text>
                <Text style={styles.detailValue}>{selectedClinician.address || 'N/A'}</Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Qualifications:</Text>
                <Text style={styles.detailValue}>{selectedClinician.qualifications || 'N/A'}</Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>License Number:</Text>
                <Text style={styles.detailValue}>{selectedClinician.licenseNumber || 'N/A'}</Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailValue}>{selectedClinician.phone || 'N/A'}</Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Email:</Text>
                <Text style={styles.detailValue}>{selectedClinician.email || 'N/A'}</Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Total Patients:</Text>
                <Text style={styles.detailValue}>{selectedClinician.patientsCount || 0}</Text>
              </View>

              <Text style={styles.summaryLabel}>Patient Summary:</Text>
              <TextInput
                style={styles.summaryInput}
                multiline
                numberOfLines={4}
                value={summary}
                onChangeText={setSummary}
                placeholder="Enter a short summary of the patient..."
              />

              <TouchableOpacity
                style={styles.sendButton}
                onPress={sendRequest}
                disabled={sending}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={sending ? ['#94a3b8', '#64748b'] : ['#0ea5e9', '#0284c7']}
                  style={styles.sendGradient}
                >
                  {sending ? (
                    <>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.sendText}>Sending...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="send" size={24} color="#fff" />
                      <Text style={styles.sendText}>Send Request</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1e3a8a' },
  loader: { flex: 1, justifyContent: 'center' },
  listContainer: { padding: 20 },
  emptyText: { textAlign: 'center', color: '#64748b', fontSize: 16 },
  clinicianCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clinicianInfo: { flex: 1, marginLeft: 12 },
  clinicianName: { fontSize: 18, fontWeight: '700', color: '#1e3a8a' },
  clinicianSpecialty: { fontSize: 14, color: '#2563eb', marginTop: 2 },
  clinicianExperience: { fontSize: 13, color: '#64748b', marginTop: 4 },
  modalContainer: { flex: 1, backgroundColor: '#f1f5f9' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1e3a8a' },
  modalContent: { flex: 1, padding: 20 },
  modalScrollContent: { paddingBottom: 100 },
  detailSection: { marginBottom: 16 },
  detailLabel: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  detailValue: { fontSize: 16, color: '#1e3a8a' },
  summaryLabel: { fontSize: 16, fontWeight: '600', color: '#1e3a8a', marginBottom: 8, marginTop: 20 },
  summaryInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sendButton: { marginTop: 20, borderRadius: 16, overflow: 'hidden' },
  sendGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  sendText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});