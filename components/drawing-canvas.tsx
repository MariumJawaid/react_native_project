import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  GestureResponderEvent
} from 'react-native';
import { Buffer } from 'buffer';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '@/services/logger';

interface DrawingPathPoint {
  x: number;
  y: number;
}

interface DrawingPath {
  points: DrawingPathPoint[];
  timestamp: number;
}

interface DrawingCanvasProps {
  taskType: 'clock' | 'copy' | 'write'; // MMSE praxis tasks
  taskDescription: string;
  onComplete: (imageData: string) => Promise<void>;
  isEvaluating?: boolean;
}

/**
 * Drawing Canvas Component for MMSE Praxis Tasks
 * Supports:
 * - Clock Drawing Test (CDT)
 * - Copy Drawing (intersecting pentagons)
 * - Writing Name/Date
 */
export default function DrawingCanvas({
  taskType,
  taskDescription,
  onComplete,
  isEvaluating = false
}: DrawingCanvasProps) {
  const canvasRef = useRef<View>(null);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handle touch start
   */
  const handleTouchStart = () => {
    setIsDrawing(true);
    setPaths([...paths, { points: [], timestamp: Date.now() }]);
  };

  /**
   * Handle touch move
   */
  const handleTouchMove = (event: GestureResponderEvent) => {
    if (!isDrawing) return;

    const touch = event.nativeEvent.touches[0];
    if (!touch) return;

    const newPaths = [...paths];
    if (newPaths.length > 0) {
      const lastPath = newPaths[newPaths.length - 1];
      lastPath.points.push({
        x: touch.pageX,
        y: touch.pageY
      });
      setPaths(newPaths);
    }
  };

  /**
   * Handle touch end
   */
  const handleTouchEnd = () => {
    setIsDrawing(false);
  };

  /**
   * Clear the canvas
   */
  const handleClear = () => {
    Alert.alert(
      'Clear Canvas',
      'Are you sure you want to clear the drawing?',
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel'
        },
        {
          text: 'Clear',
          onPress: () => setPaths([]),
          style: 'destructive'
        }
      ]
    );
  };

  /**
   * Undo last stroke
   */
  const handleUndo = () => {
    if (paths.length > 0) {
      setPaths(paths.slice(0, -1));
    }
  };

  /**
   * Submit drawing for evaluation
   */
  const handleSubmit = async () => {
    if (paths.length === 0) {
      Alert.alert('Error', 'Please draw something before submitting');
      return;
    }

    try {
      setIsSubmitting(true);

      // Convert drawing paths to base64 image
      const imageData = JSON.stringify({
        taskType,
        paths,
        timestamp: Date.now(),
        canvasWidth: 300,
        canvasHeight: 400
      });

      // Encode as base64
      const base64Data = Buffer.from(imageData).toString('base64');

      // Send to evaluation service
      await onComplete(base64Data);

      logger.info(`Drawing submitted for ${taskType}`);
    } catch (error) {
      logger.error(`Error submitting drawing: ${error}`);
      Alert.alert('Error', 'Failed to submit drawing');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Get task-specific instructions
   */
  const getTaskInstructions = () => {
    switch (taskType) {
      case 'clock':
        return 'Draw a clock showing 10:11 (ten minutes past ten)';
      case 'copy':
        return 'Copy this figure of two intersecting pentagons';
      case 'write':
        return 'Write your name, today\'s date, and the current time';
      default:
        return 'Complete the drawing task as instructed';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Drawing Task</Text>
        <Text style={styles.taskType}>{taskType.toUpperCase()}</Text>
      </View>

      <View style={styles.instructionsBox}>
        <Ionicons name="information-circle" size={20} color={Colors.primary} />
        <Text style={styles.instructions}>
          {taskDescription || getTaskInstructions()}
        </Text>
      </View>

      {/* Canvas Area */}
      <View
        ref={canvasRef}
        style={styles.canvasContainer}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Reference image for copy task */}
        {taskType === 'copy' && (
          <View style={styles.referenceImageContainer}>
            <Text style={styles.referenceLabel}>Original (Reference)</Text>
            <View style={styles.refPentagons}>
              <View style={[styles.pentagon, { marginRight: -15 }]} />
              <View style={styles.pentagon} />
            </View>
          </View>
        )}

        {/* Canvas background */}
        <View style={styles.canvas}>
          {/* Render drawing paths */}
          {paths.map((path, pathIndex) => (
            <View key={pathIndex} style={styles.path}>
              {path.points.map((point, pointIndex) => {
                if (pointIndex === 0) return null;
                const prevPoint = path.points[pointIndex - 1];
                const angle = Math.atan2(
                  point.y - prevPoint.y,
                  point.x - prevPoint.x
                );
                const distance = Math.sqrt(
                  Math.pow(point.x - prevPoint.x, 2) +
                  Math.pow(point.y - prevPoint.y, 2)
                );

                return (
                  <View
                    key={pointIndex}
                    style={[
                      styles.stroke,
                      {
                        left: prevPoint.x,
                        top: prevPoint.y,
                        width: distance,
                        transform: [{ rotate: `${angle}rad` }]
                      }
                    ]}
                  />
                );
              })}
            </View>
          ))}

          {/* Placeholder text */}
          {paths.length === 0 && (
            <Text style={styles.canvasPlaceholder}>Draw here</Text>
          )}
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleUndo}
          disabled={paths.length === 0 || isSubmitting}
        >
          <Ionicons name="arrow-undo" size={20} color={Colors.primary} />
          <Text style={[styles.buttonText, { color: Colors.primary }]}>Undo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={handleClear}
          disabled={paths.length === 0 || isSubmitting}
        >
          <Ionicons name="trash" size={20} color="#ff6b6b" />
          <Text style={[styles.buttonText, { color: '#ff6b6b' }]}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.submitButton,
            (isSubmitting || isEvaluating) && styles.buttonDisabled
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || isEvaluating || paths.length === 0}
        >
          {isSubmitting || isEvaluating ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="checkmark" size={20} color="white" />
          )}
          <Text style={styles.buttonText}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stroke count indicator */}
      <Text style={styles.strokeCounter}>Strokes: {paths.length}</Text>
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
    marginBottom: 20
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4
  },
  taskType: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600'
  },
  instructionsBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'flex-start',
    gap: 12
  },
  instructions: {
    fontSize: 14,
    color: '#1565c0',
    flex: 1,
    lineHeight: 20
  },
  canvasContainer: {
    marginBottom: 16
  },
  referenceImageContainer: {
    marginBottom: 16,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  referenceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8
  },
  refPentagons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    width: 120
  },
  pentagon: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: '#999',
    borderRadius: 2
  },
  canvas: {
    width: '100%',
    height: 400,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    position: 'relative',
    overflow: 'hidden'
  },
  path: {
    position: 'absolute'
  },
  stroke: {
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 1.5
  },
  canvasPlaceholder: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -40,
    marginTop: -10,
    fontSize: 16,
    color: '#ccc',
    fontWeight: '500'
  },
  controlsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  secondaryButton: {
    borderColor: Colors.primary
  },
  clearButton: {
    borderColor: '#ff6b6b'
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderWidth: 0
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white'
  },
  strokeCounter: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginTop: 8
  }
});
