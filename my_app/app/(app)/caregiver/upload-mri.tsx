import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { auth, db } from '../../../firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function UploadMRIScreen() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string>('');

  useEffect(() => {
    loadPatientInfo();
  }, []);

  const loadPatientInfo = async () => {
    try {
      const caregiverUID = auth.currentUser?.uid;
      if (!caregiverUID) return;

      const userDoc = await getDoc(doc(db, 'users', caregiverUID));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.patientId) {
          setPatientId(userData.patientId);
          
          const patientDoc = await getDoc(doc(db, 'patients', userData.patientId));
          if (patientDoc.exists()) {
            setPatientName(patientDoc.data().name);
          }
        }
      }
    } catch (error) {
      console.error('Error loading patient:', error);
    }
  };

  const pickDICOMFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      
      // Check file size (max 5MB for Firestore)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size && file.size > maxSize) {
        Alert.alert(
          'File Too Large',
          'DICOM file must be smaller than 5MB for Firestore storage',
          [{ text: 'OK' }]
        );
        return;
      }

      // Check if file is DICOM
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.dcm') && !fileName.includes('dicom')) {
        Alert.alert(
          'Invalid File',
          'Please select a DICOM file (.dcm extension)',
          [{ text: 'OK' }]
        );
        return;
      }

      setSelectedFile(file);
      Alert.alert('Success', `Selected: ${file.name}`);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to pick file: ' + error.message);
    }
  };

  const uploadMRI = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a DICOM file first');
      return;
    }

    if (!patientId) {
      Alert.alert('Error', 'No patient linked to your account');
      return;
    }

    try {
      setUploading(true);

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(selectedFile.uri, {
        encoding: 'base64',
      });

      // Create MRI metadata
      const mriData = {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        uploadedAt: new Date(),
        uploadedBy: auth.currentUser?.uid,
        fileType: 'DICOM',
        base64Data: base64, // Store base64 in Firestore
      };

      // Add MRI to patient's document
      await updateDoc(doc(db, 'patients', patientId), {
        mriScans: arrayUnion(mriData),
      });

      Alert.alert('Success', 'MRI uploaded successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setSelectedFile(null);
            router.back();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upload MRI Scan</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Patient Info Card */}
        {patientName && (
          <View style={styles.patientCard}>
            <Ionicons name="person-circle" size={40} color="#2563eb" />
            <View style={styles.patientInfo}>
              <Text style={styles.patientLabel}>Uploading for:</Text>
              <Text style={styles.patientName}>{patientName}</Text>
            </View>
          </View>
        )}

        {/* Instructions Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#2563eb" />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>DICOM File Format</Text>
            <Text style={styles.infoDescription}>
              Please upload MRI scans in DICOM format (.dcm files). Maximum size: 5MB.
            </Text>
          </View>
        </View>

        {/* File Selection Area */}
        <View style={styles.uploadSection}>
          {selectedFile ? (
            <View style={styles.selectedFileCard}>
              <View style={styles.fileIcon}>
                <Ionicons name="document" size={40} color="#2563eb" />
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName}>{selectedFile.name}</Text>
                <Text style={styles.fileSize}>
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedFile(null)}
                style={styles.removeBtn}
              >
                <Ionicons name="close-circle" size={24} color="#dc2626" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.pickButton}
              onPress={pickDICOMFile}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.pickGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="cloud-upload-outline" size={48} color="#fff" />
                <Text style={styles.pickText}>Select DICOM File</Text>
                <Text style={styles.pickSubtext}>Tap to browse files</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Upload Button */}
        {selectedFile && (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={uploadMRI}
            disabled={uploading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={uploading ? ['#94a3b8', '#64748b'] : ['#0ea5e9', '#0284c7']}
              style={styles.uploadGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {uploading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.uploadText}>Uploading...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={24} color="#fff" />
                  <Text style={styles.uploadText}>Upload MRI Scan</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Guidelines */}
        <View style={styles.guidelinesCard}>
          <Text style={styles.guidelinesTitle}>Upload Guidelines:</Text>
          <View style={styles.guidelineItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.guidelineText}>File must be in DICOM format (.dcm)</Text>
          </View>
          <View style={styles.guidelineItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.guidelineText}>Maximum file size: 5 MB</Text>
          </View>
          <View style={styles.guidelineItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.guidelineText}>Ensure scan quality is clear</Text>
          </View>
          <View style={styles.guidelineItem}>
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <Text style={styles.guidelineText}>Files stored in Firestore as base64</Text>
          </View>
        </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientInfo: {
    marginLeft: 12,
  },
  patientLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#dbeafe',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
    color: '#1e3a8a',
    lineHeight: 18,
  },
  uploadSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  pickButton: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
  },
  pickGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  pickText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
  },
  pickSubtext: {
    fontSize: 14,
    color: '#dbeafe',
    marginTop: 4,
  },
  selectedFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fileIcon: {
    width: 60,
    height: 60,
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e3a8a',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 13,
    color: '#64748b',
  },
  removeBtn: {
    padding: 4,
  },
  uploadButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  uploadGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  uploadText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  guidelinesCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e3a8a',
    marginBottom: 12,
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  guidelineText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
});