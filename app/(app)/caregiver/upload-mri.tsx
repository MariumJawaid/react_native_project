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
import { File } from 'expo-file-system'; // ← New modern Expo FileSystem API
import { useRouter } from 'expo-router';
import { auth, db } from '../../../firebaseConfig';
import { doc, getDoc, updateDoc, collection, addDoc, arrayUnion } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function UploadMRIScreen() {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
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
        type: ['*/*', 'application/dicom', 'application/octet-stream'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];

      // Optional: Relax size limit since your files are small (~187 KB)
      const maxSize = 2 * 1024 * 1024; // 2 MB (safe for Firestore + base64)
      if (file.size && file.size > maxSize) {
        Alert.alert('File Too Large', 'Please select a file smaller than 2 MB.', [{ text: 'OK' }]);
        return;
      }

      // Flexible DICOM validation
      const fileName = file.name.toLowerCase();
      const validExtensions = ['.dcm', '.dicom', '.dic'];
      const isLikelyDICOM =
        validExtensions.some((ext) => fileName.endsWith(ext)) ||
        fileName.includes('dicom') ||
        fileName.includes('patient') ||
        file.mimeType === 'application/dicom';

      if (!isLikelyDICOM) {
        Alert.alert(
          'Confirm File Type',
          `Selected file: ${file.name}\n\nIs this a DICOM file?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Yes, Continue',
              onPress: () => {
                addFileToSelection(file);
              },
            },
          ]
        );
        return;
      }

      addFileToSelection(file);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to pick file: ' + error.message);
    }
  };

  const addFileToSelection = (file: any) => {
    // Check if file already exists in selection
    if (selectedFiles.some(f => f.uri === file.uri)) {
      Alert.alert('Duplicate', 'This file is already selected.');
      return;
    }
    setSelectedFiles([...selectedFiles, file]);
    Alert.alert('Success', `Added: ${file.name}`);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const uploadMRI = async () => {
    if (selectedFiles.length === 0) {
      Alert.alert('Error', 'Please select at least one DICOM file');
      return;
    }
    if (!patientId) {
      Alert.alert('Error', 'No patient linked to your account');
      return;
    }

    try {
      setUploading(true);

      // Check individual file size
      for (const file of selectedFiles) {
        const maxFileSize = 10 * 1024 * 1024; // 10 MB per file
        if ((file.size || 0) > maxFileSize) {
          Alert.alert(
            'File Too Large',
            `${file.name} is ${((file.size || 0) / 1024 / 1024).toFixed(2)} MB\n\nMaximum allowed: 10 MB per file.`,
            [{ text: 'OK' }]
          );
          setUploading(false);
          return;
        }
      }

      // Create MRI record with file data in subcollection
      const mriId = `mri_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const imagesData: any[] = [];
      const failedFiles: string[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        try {
          const file = selectedFiles[i];
          const fileUri = file.uri;

          console.log(`Processing file ${i + 1}/${selectedFiles.length}: ${file.name}`);
          console.log(`File size: ${((file.size || 0) / 1024 / 1024).toFixed(2)} MB`);

          // Read file and convert to base64
          const fileObj = new File(fileUri);
          const base64 = await fileObj.base64();

          imagesData.push({
            fileName: file.name,
            fileSize: file.size || 0,
            base64Data: base64,
          });

          console.log(`✓ Successfully processed: ${file.name}`);
        } catch (fileError: any) {
          console.error(`✗ Failed to process file ${i + 1}:`, fileError);
          failedFiles.push(selectedFiles[i].name);
        }
      }

      if (imagesData.length === 0) {
        Alert.alert(
          'All Files Failed',
          `Could not process any files:\n${failedFiles.join('\n')}\n\nPlease try again.`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Store MRI in subcollection (avoids 1MB document limit)
      const mriSubcollectionRef = collection(db, 'patients', patientId, 'mriScans');
      
      // Split images if total size exceeds 900KB per document
      let currentBatch: any[] = [];
      let batchNumber = 1;
      const maxBatchSize = 900 * 1024; // 900KB to stay under 1MB limit

      for (const image of imagesData) {
        const imageSize = (image.base64Data?.length || 0) * 0.75; // Approximate base64 size
        
        if ((JSON.stringify(currentBatch).length + imageSize) > maxBatchSize && currentBatch.length > 0) {
          // Save current batch
          await addDoc(mriSubcollectionRef, {
            mriId: mriId,
            batchNumber: batchNumber,
            images: currentBatch,
            uploadedAt: new Date(),
            uploadedBy: auth.currentUser?.uid,
            fileType: 'DICOM',
          });
          
          currentBatch = [];
          batchNumber++;
        }
        
        currentBatch.push(image);
      }

      // Save remaining batch
      if (currentBatch.length > 0) {
        await addDoc(mriSubcollectionRef, {
          mriId: mriId,
          batchNumber: batchNumber,
          images: currentBatch,
          uploadedAt: new Date(),
          uploadedBy: auth.currentUser?.uid,
          fileType: 'DICOM',
        });
      }

      // Update patient document with MRI reference
      await updateDoc(doc(db, 'patients', patientId), {
        mriScans: arrayUnion({
          mriId: mriId,
          totalImages: imagesData.length,
          totalBatches: batchNumber,
          uploadedAt: new Date(),
          uploadedBy: auth.currentUser?.uid,
          status: 'uploaded',
        }),
      });

      if (failedFiles.length > 0) {
        Alert.alert(
          'Partial Upload',
          `Successfully uploaded ${imagesData.length} file(s).\n\nFailed: ${failedFiles.join(', ')}`
        );
      } else {
        Alert.alert('Success', `MRI with ${imagesData.length} image(s) uploaded successfully!`, [
          {
            text: 'OK',
            onPress: () => {
              setSelectedFiles([]);
              router.back();
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      
      Alert.alert(
        'Upload Failed',
        `Error: ${error.message}\n\nPlease check your internet connection and try again.`,
        [{ text: 'OK' }]
      );
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
        {patientName ? (
          <View style={styles.patientCard}>
            <Ionicons name="person-circle" size={40} color="#2563eb" />
            <View style={styles.patientInfo}>
              <Text style={styles.patientLabel}>Uploading for:</Text>
              <Text style={styles.patientName}>{patientName}</Text>
            </View>
          </View>
        ) : null}

        {/* Instructions Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#2563eb" />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>DICOM File Format</Text>
            <Text style={styles.infoDescription}>
              Upload multiple MRI scan images in DICOM format (.dcm files). All images will be saved as one MRI record. Maximum size per file: 10 MB.
            </Text>
          </View>
        </View>

        {/* File Selection Area */}
        <View style={styles.uploadSection}>
          {selectedFiles.length > 0 ? (
            <View>
              <View style={styles.selectedFilesHeader}>
                <Text style={styles.selectedFilesTitle}>
                  Selected Files ({selectedFiles.length})
                </Text>
                <TouchableOpacity onPress={() => setSelectedFiles([])}>
                  <Text style={styles.clearAllText}>Clear All</Text>
                </TouchableOpacity>
              </View>
              {selectedFiles.map((file, index) => (
                <View key={index} style={styles.selectedFileCard}>
                  <View style={styles.fileIcon}>
                    <Ionicons name="document" size={40} color="#2563eb" />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName}>{file.name}</Text>
                    <Text style={styles.fileSize}>
                      {file.size ? (file.size / 1024 / 1024).toFixed(2) : '0'} MB
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeFile(index)} style={styles.removeBtn}>
                    <Ionicons name="close-circle" size={24} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={styles.addMoreButton}
                onPress={pickDICOMFile}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={24} color="#2563eb" />
                <Text style={styles.addMoreText}>Add More Images</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.pickButton} onPress={pickDICOMFile} activeOpacity={0.8}>
              <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.pickGradient}>
                <Ionicons name="cloud-upload-outline" size={48} color="#fff" />
                <Text style={styles.pickText}>Select DICOM Files</Text>
                <Text style={styles.pickSubtext}>Tap to browse files</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Upload Button */}
        {selectedFiles.length > 0 && (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={uploadMRI}
            disabled={uploading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={uploading ? ['#94a3b8', '#64748b'] : ['#0ea5e9', '#0284c7']}
              style={styles.uploadGradient}
            >
              {uploading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.uploadText}>Uploading {selectedFiles.length} file(s)...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={24} color="#fff" />
                  <Text style={styles.uploadText}>
                    Upload MRI ({selectedFiles.length} image{selectedFiles.length !== 1 ? 's' : ''})
                  </Text>
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
            <Text style={styles.guidelineText}>Files must be in DICOM format (.dcm)</Text>
          </View>
          <View style={styles.guidelineItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.guidelineText}>Maximum file size per image: 10 MB</Text>
          </View>
          <View style={styles.guidelineItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.guidelineText}>Upload multiple images for complete MRI scan</Text>
          </View>
          <View style={styles.guidelineItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.guidelineText}>All images will be saved as one MRI record</Text>
          </View>
          <View style={styles.guidelineItem}>
            <Ionicons name="warning" size={20} color="#f59e0b" />
            <Text style={styles.guidelineText}>
              Ensure you have a stable internet connection while uploading
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles remain exactly the same
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
  patientInfo: { marginLeft: 12 },
  patientLabel: { fontSize: 13, color: '#64748b', marginBottom: 2 },
  patientName: { fontSize: 18, fontWeight: '700', color: '#1e3a8a' },
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
  infoText: { flex: 1, marginLeft: 12 },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#1e40af', marginBottom: 4 },
  infoDescription: { fontSize: 13, color: '#1e3a8a', lineHeight: 18 },
  uploadSection: { marginHorizontal: 20, marginBottom: 20 },
  pickButton: { height: 200, borderRadius: 16, overflow: 'hidden' },
  pickGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  pickText: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 12 },
  pickSubtext: { fontSize: 14, color: '#dbeafe', marginTop: 4 },
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
  fileInfo: { flex: 1, marginLeft: 12 },
  fileName: { fontSize: 15, fontWeight: '600', color: '#1e3a8a', marginBottom: 4 },
  fileSize: { fontSize: 13, color: '#64748b' },
  removeBtn: { padding: 4 },
  selectedFilesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedFilesTitle: { fontSize: 15, fontWeight: '600', color: '#1e3a8a' },
  clearAllText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
    borderRadius: 12,
    backgroundColor: '#f0f9ff',
    gap: 8,
  },
  addMoreText: { fontSize: 15, fontWeight: '600', color: '#2563eb' },
  uploadButton: { marginHorizontal: 20, marginBottom: 20, borderRadius: 16, overflow: 'hidden' },
  uploadGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  uploadText: { fontSize: 17, fontWeight: '700', color: '#fff' },
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
  guidelinesTitle: { fontSize: 16, fontWeight: '700', color: '#1e3a8a', marginBottom: 12 },
  guidelineItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  guidelineText: { fontSize: 14, color: '#475569', flex: 1 },
});