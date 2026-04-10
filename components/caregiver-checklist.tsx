import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput
} from 'react-native';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export interface CaregiverRating {
  isObservational: boolean; // Caregiver observed vs patient self-report
  caregiverId?: string;
  caregiverName?: string;
  relationship?: string; // spouse, adult child, sibling, friend, professional
  confidence: number; // 1-5 confidence level in rating
}

interface CaregiverChecklistProps {
  onRatingChange: (rating: CaregiverRating) => void;
  initialValue?: CaregiverRating;
}

/**
 * Caregiver Checkbox/Rating Component
 * Used for MMSE and ADAS observational scoring
 */
export default function CaregiverChecklist({
  onRatingChange,
  initialValue
}: CaregiverChecklistProps) {
  const [isObservational, setIsObservational] = useState(
    initialValue?.isObservational || false
  );
  const [caregiverName, setCaregiverName] = useState(
    initialValue?.caregiverName || ''
  );
  const [relationship, setRelationship] = useState(
    initialValue?.relationship || 'family'
  );
  const [confidence, setConfidence] = useState(initialValue?.confidence || 3);

  const relationships = [
    { id: 'spouse', label: 'Spouse' },
    { id: 'adult-child', label: 'Adult Child' },
    { id: 'sibling', label: 'Sibling' },
    { id: 'friend', label: 'Friend' },
    { id: 'professional', label: 'Professional Caregiver' },
    { id: 'other', label: 'Other' }
  ];

  const handleToggleObservational = (value: boolean) => {
    setIsObservational(value);
    onRatingChange({
      isObservational: value,
      caregiverName: value ? caregiverName : undefined,
      relationship: value ? relationship : undefined,
      confidence: value ? confidence : 3
    });
  };

  const handleNameChange = (text: string) => {
    setCaregiverName(text);
    onRatingChange({
      isObservational,
      caregiverName: text,
      relationship,
      confidence
    });
  };

  const handleRelationshipChange = (rel: string) => {
    setRelationship(rel);
    onRatingChange({
      isObservational,
      caregiverName,
      relationship: rel,
      confidence
    });
  };

  const handleConfidenceChange = (level: number) => {
    setConfidence(level);
    onRatingChange({
      isObservational,
      caregiverName,
      relationship,
      confidence: level
    });
  };

  const confidenceLevels = [
    { level: 1, label: 'Low' },
    { level: 2, label: 'Moderate' },
    { level: 3, label: 'Good' },
    { level: 4, label: 'High' },
    { level: 5, label: 'Very High' }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="person" size={24} color={Colors.primary} />
        <Text style={styles.title}>Assessment Type</Text>
      </View>

      {/* Self-Report vs Observational Toggle */}
      <View style={styles.card}>
        <View style={styles.toggleContainer}>
          <View>
            <Text style={styles.toggleLabel}>Self-Report Assessment</Text>
            <Text style={styles.toggleDescription}>
              Patient completes assessment directly
            </Text>
          </View>
          <Switch
            value={!isObservational}
            onValueChange={(value) => handleToggleObservational(!value)}
            trackColor={{ false: '#ccc', true: Colors.primary }}
            thumbColor="white"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.toggleContainer}>
          <View>
            <Text style={styles.toggleLabel}>Observational Assessment</Text>
            <Text style={styles.toggleDescription}>
              Caregiver observes and rates patient
            </Text>
          </View>
          <Switch
            value={isObservational}
            onValueChange={handleToggleObservational}
            trackColor={{ false: '#ccc', true: Colors.primary }}
            thumbColor="white"
          />
        </View>
      </View>

      {/* Observational Details */}
      {isObservational && (
        <View style={styles.detailsContainer}>
          {/* Caregiver Name Input */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Caregiver Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter caregiver's name"
              value={caregiverName}
              onChangeText={handleNameChange}
              placeholderTextColor="#bbb"
            />
          </View>

          {/* Relationship Selection */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Relationship to Patient</Text>
            <View style={styles.relationshipGrid}>
              {relationships.map((rel) => (
                <TouchableOpacity
                  key={rel.id}
                  style={[
                    styles.relationshipButton,
                    relationship === rel.id && styles.relationshipButtonActive
                  ]}
                  onPress={() => handleRelationshipChange(rel.id)}
                >
                  <Text
                    style={[
                      styles.relationshipButtonText,
                      relationship === rel.id && styles.relationshipButtonTextActive
                    ]}
                  >
                    {rel.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Confidence Level Selection */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Confidence Level in Rating</Text>
            <Text style={styles.confidenceDescription}>
              How confident are you in these ratings?
            </Text>
            <View style={styles.confidenceContainer}>
              {confidenceLevels.map((item) => (
                <TouchableOpacity
                  key={item.level}
                  style={[
                    styles.confidenceButton,
                    confidence === item.level && styles.confidenceButtonActive
                  ]}
                  onPress={() => handleConfidenceChange(item.level)}
                >
                  <View style={styles.confidenceButtonInner}>
                    <Text
                      style={[
                        styles.confidenceButtonNumber,
                        confidence === item.level &&
                          styles.confidenceButtonNumberActive
                      ]}
                    >
                      {item.level}
                    </Text>
                    <Text
                      style={[
                        styles.confidenceButtonLabel,
                        confidence === item.level &&
                          styles.confidenceButtonLabelActive
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Observational Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Observational Assessment</Text>
              <Text style={styles.infoText}>
                The caregiver will rate the patient's abilities based on their
                observations over the past few weeks.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Self-Report Info Box */}
      {!isObservational && (
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#4caf50" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Self-Report Assessment</Text>
            <Text style={styles.infoText}>
              The patient will complete the assessment by voice or direct
              responses.
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  content: {
    padding: 16
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4
  },
  toggleDescription: {
    fontSize: 13,
    color: '#666'
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12
  },
  detailsContainer: {
    marginVertical: 8
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#f9f9f9'
  },
  relationshipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  relationshipButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    minWidth: '31%'
  },
  relationshipButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary
  },
  relationshipButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center'
  },
  relationshipButtonTextActive: {
    color: 'white'
  },
  confidenceDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12
  },
  confidenceContainer: {
    flexDirection: 'row',
    gap: 8
  },
  confidenceButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    alignItems: 'center'
  },
  confidenceButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary
  },
  confidenceButtonInner: {
    alignItems: 'center'
  },
  confidenceButtonNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666'
  },
  confidenceButtonNumberActive: {
    color: 'white'
  },
  confidenceButtonLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2
  },
  confidenceButtonLabelActive: {
    color: 'white'
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 12
  },
  infoContent: {
    flex: 1
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4
  },
  infoText: {
    fontSize: 12,
    color: '#1565c0',
    lineHeight: 18
  }
});
