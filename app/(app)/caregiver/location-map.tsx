import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '../../../firebaseConfig';

export default function MapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [dataFetched, setDataFetched] = useState(false);
  
  const paramLat = params.latitude ? parseFloat(params.latitude as string) : 0;
  const paramLng = params.longitude ? parseFloat(params.longitude as string) : 0;
  const patientId = params.patientId as string;
  const title = params.title || 'Patient Location';

  useEffect(() => {
    console.log('MapScreen: Loading latest patient data');
    
    // Set initial values from params if provided
    if (paramLat !== 0) {
      setLatitude(paramLat);
    }
    if (paramLng !== 0) {
      setLongitude(paramLng);
    }

    // Reference to the latest patient data in the realtime database
    const patientRef = ref(rtdb, `patients/latest`);
    console.log('Setting up listener for: patients/latest');

    // Listen for real-time changes
    const unsubscribe = onValue(
      patientRef,
      (snapshot) => {
        console.log('Snapshot received:', snapshot.val());
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log('Data from DB:', data);
          if (data.latitude !== undefined) {
            console.log('Setting latitude to:', data.latitude);
            setLatitude(data.latitude);
          }
          if (data.longitude !== undefined) {
            console.log('Setting longitude to:', data.longitude);
            setLongitude(data.longitude);
          }
          setDataFetched(true);
          setDbError(null);
        } else {
          console.warn('No data at patients/latest');
          setDbError('No patient data found in database at patients/latest');
          setDataFetched(true);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Error listening to patient data:', error);
        setDbError(`Database error: ${error.message}`);
        setIsLoading(false);
      }
    );

    // Cleanup: unsubscribe from real-time updates when component unmounts
    return () => {
      console.log('Cleaning up listener');
      off(patientRef);
    };
  }, [paramLat, paramLng]);

  const openGoogleMaps = () => {
    const url = `https://maps.google.com/?q=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  const openAppleMaps = () => {
    const url = `maps://maps.apple.com/?q=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => openGoogleMaps());
  };

  const isValidLocation = latitude !== 0 && longitude !== 0;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1e40af', '#1e3a8a']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Debug Info */}
        {dbError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color="#dc2626" />
            <Text style={styles.errorBannerText}>{dbError}</Text>
          </View>
        )}
        
        {/* Current Values Display */}
        <View style={styles.debugCard}>
          <Text style={styles.debugTitle}>Current Values:</Text>
          <Text style={styles.debugText}>Latitude: {latitude}</Text>
          <Text style={styles.debugText}>Longitude: {longitude}</Text>
          <Text style={styles.debugText}>DB Path: patients/latest</Text>
          <Text style={styles.debugText}>Data Fetched: {dataFetched ? 'Yes' : 'No'}</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text>Loading location data...</Text>
          </View>
        ) : latitude === 0 && longitude === 0 ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color="#ef4444" />
            <Text style={styles.errorTitle}>Location Data is 0</Text>
            <Text style={styles.errorText}>
              The database contains 0,0 coordinates. Please verify the location data in Firebase Realtime Database.
            </Text>
          </View>
        ) : (
          <>
            {/* Live Location Status */}
            <View style={styles.liveStatusBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveStatusText}>Live Tracking Active</Text>
            </View>

            {/* Location Display */}
            <View style={styles.locationCard}>
              <View style={styles.iconContainer}>
                <Ionicons name="location" size={48} color="#3b82f6" />
              </View>
              <Text style={styles.statusText}>Live Location Detected</Text>
            </View>

            {/* Coordinates */}
            <View style={styles.coordinatesCard}>
              <View style={styles.coordinateRow}>
                <Text style={styles.label}>Latitude</Text>
                <Text style={styles.value}>{typeof latitude === 'number' ? latitude.toFixed(6) : latitude}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.coordinateRow}>
                <Text style={styles.label}>Longitude</Text>
                <Text style={styles.value}>{typeof longitude === 'number' ? longitude.toFixed(6) : longitude}</Text>
              </View>
            </View>

            {/* Map Links */}
            <View style={styles.linksSection}>
              <Text style={styles.sectionTitle}>Open in Maps</Text>
              
              <TouchableOpacity style={styles.mapButton} onPress={openGoogleMaps}>
                <View style={styles.mapButtonContent}>
                  <Ionicons name="logo-google" size={24} color="#fff" />
                  <Text style={styles.mapButtonText}>Open in Google Maps</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.mapButton, styles.appleButton]} onPress={openAppleMaps}>
                <View style={styles.mapButtonContent}>
                  <Ionicons name="map" size={24} color="#fff" />
                  <Text style={styles.mapButtonText}>Open in Apple Maps</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#0ea5e9" />
              <Text style={styles.infoText}>
                Click "Open in Maps" to view the location on a detailed map with navigation options
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  liveStatusBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
  },
  liveStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  coordinatesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  coordinateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  linksSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  mapButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appleButton: {
    backgroundColor: '#1f2937',
  },
  mapButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mapButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  infoBox: {
    backgroundColor: '#cffafe',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 13,
    color: '#0c4a6e',
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#dc2626',
    flex: 1,
  },
  debugCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#78350f',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
