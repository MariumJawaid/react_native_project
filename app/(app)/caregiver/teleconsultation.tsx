import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  addDoc,
  serverTimestamp,
  query,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
  RTCView,
} from 'react-native-webrtc';

const { width, height } = Dimensions.get('window');

type CallStatus = 'idle' | 'connecting' | 'ringing' | 'connected' | 'ended' | 'error';

export default function TeleconsultationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const existingRoomId = params.roomId as string | undefined;
  const clinicianId = params.clinicianId as string | undefined;
  const patientId = params.patientId as string | undefined;

  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [roomId, setRoomId] = useState<string>(existingRoomId || '');
  const [sessionId, setSessionId] = useState<string>('');
  const [callDuration, setCallDuration] = useState(0);
  const [loadingSession, setLoadingSession] = useState(false);
  
  // Real WebRTC integration state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionListenerRef = useRef<Unsubscribe | null>(null);
  const signalListenerRef = useRef<Unsubscribe | null>(null);

  const generateRoomId = (): string => {
    return `room_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  };

  const startSession = async () => {
    console.log('[Teleconsultation] Step 1: Initialize');
    try {
      setLoadingSession(true);
      const caregiverId = auth.currentUser?.uid;
      if (!caregiverId) throw new Error('Not authenticated');

      let resolvedPatientId = patientId;
      if (!resolvedPatientId) {
        const userDoc = await getDoc(doc(db, 'users', caregiverId));
        if (userDoc.exists()) {
          resolvedPatientId = userDoc.data().patientId;
        }
      }

      // Step 2: Create the session
      const newRoomId = existingRoomId || generateRoomId();
      setRoomId(newRoomId);

      const sessionData = {
        roomId: newRoomId,
        clinicianId: clinicianId || '', // Exact match, case sensitive
        patientId: resolvedPatientId || '', // Exact match
        caregiverId,
        status: 'waiting',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const sessionRef = await addDoc(collection(db, 'consultation_sessions'), sessionData);
      const currentSessionId = sessionRef.id;
      setSessionId(currentSessionId);
      setCallStatus('ringing');

      // Step 3: Get media + create peer connection
      let stream: MediaStream;
      try {
        stream = await mediaDevices.getUserMedia({ video: true, audio: true }) as MediaStream;
        setLocalStream(stream);
        streamRef.current = stream;
      } catch (err) {
        console.error('Camera permissions denied', err);
        Alert.alert('Camera Error', 'Could not access the camera. Check permissions.');
        setCallStatus('error');
        setLoadingSession(false);
        return;
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      pcRef.current = pc;

      // Attach tracks
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // Attach handlers before creating offer
      pc.ontrack = (e) => {
        if (e.streams && e.streams[0]) {
          setRemoteStream(e.streams[0]);
        }
      };

      pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        addDoc(collection(db, "webrtc_signals"), {
          sessionId: currentSessionId,
          type: "ice-candidate",
          data: JSON.stringify(e.candidate.toJSON()),
          fromUserId: caregiverId,
          createdAt: serverTimestamp(),
          processed: false,
        });
      };

      pc.onconnectionstatechange = () => {
        console.log("PC Connection State:", pc.connectionState);
      };

      // Step 4: Write the offer
      const offer = await pc.createOffer({});
      await pc.setLocalDescription(offer);

      await addDoc(collection(db, "webrtc_signals"), {
        sessionId: currentSessionId,
        type: "offer",
        data: JSON.stringify({ type: offer.type, sdp: offer.sdp }),
        fromUserId: caregiverId,
        createdAt: serverTimestamp(),
        processed: false,
      });

      // Step 5: Listen for clinician's answer + ICE
      const unsubSignals = onSnapshot(
        query(collection(db, "webrtc_signals"), where("sessionId", "==", currentSessionId)),
        async (snap) => {
          for (const change of snap.docChanges()) {
            if (change.type !== "added") continue;
            const d = change.doc.data();
            if (d.fromUserId === caregiverId) continue; // skip own
            
            const payload = JSON.parse(d.data);

            if (d.type === "answer") {
              if (!pc.currentRemoteDescription) {
                await pc.setRemoteDescription(new RTCSessionDescription(payload));
              }
            } else if (d.type === "ice-candidate") {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(payload));
              } catch (e) {
                console.error("Error adding ice candidate", e);
              }
            }
          }
        }
      );
      signalListenerRef.current = unsubSignals;

      // Step 6: Listen for status
      const unsubSession = onSnapshot(
        doc(db, "consultation_sessions", currentSessionId),
        (docSnap) => {
          const s = docSnap.data();
          if (s?.status === 'active' && callStatus !== 'connected') {
            setCallStatus('connected');
            startCallTimer();
          }
          if (s?.status === 'ended') {
            handleCallEnded();
          }
        }
      );
      sessionListenerRef.current = unsubSession;

    } catch (error: any) {
      console.error('Error starting session:', error);
      Alert.alert('Error', 'Failed to start consultation: ' + error.message);
      setCallStatus('error');
    } finally {
      setLoadingSession(false);
    }
  };

  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Step 7: Hangup
  const endCall = async () => {
    Alert.alert('End Call', 'Are you sure you want to end the consultation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Call',
        style: 'destructive',
        onPress: async () => {
          try {
            if (pcRef.current) pcRef.current.close();
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (signalListenerRef.current) signalListenerRef.current();

            if (sessionId) {
              await updateDoc(doc(db, 'consultation_sessions', sessionId), {
                status: 'ended',
                updatedAt: serverTimestamp(),
              });
            }
            handleCallEnded();
          } catch (err) {
            console.error('Error ending call:', err);
            handleCallEnded();
          }
        },
      },
    ]);
  };

  const handleCallEnded = () => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (sessionListenerRef.current) sessionListenerRef.current();
    if (signalListenerRef.current) signalListenerRef.current();
    if (pcRef.current) pcRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());

    setCallStatus('ended');
    setTimeout(() => router.back(), 2000);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted; // Toggle: if it WAS muted, enable it
      });
    }
  };

  const toggleCamera = () => {
    setIsCameraOff(!isCameraOff);
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = isCameraOff;
      });
    }
  };

  useEffect(() => {
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (sessionListenerRef.current) sessionListenerRef.current();
      if (signalListenerRef.current) signalListenerRef.current();
      if (pcRef.current) pcRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        startSession();
        unsubAuth();
      }
    });
    return () => unsubAuth();
  }, []);

  const renderConnecting = () => (
    <View style={styles.connectingContainer}>
      <View style={styles.ringOuter}>
        <View style={styles.ringMiddle}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={56} color="#fff" />
          </View>
        </View>
      </View>

      <Text style={styles.connectingTitle}>
        {callStatus === 'ringing' ? 'Waiting for Clinician...' : 'Connecting...'}
      </Text>
      {roomId ? (
        <View style={styles.roomIdBadge}>
          <Text style={styles.roomIdLabel}>Room ID</Text>
          <Text style={styles.roomIdText}>{roomId}</Text>
        </View>
      ) : null}
      {loadingSession && (
        <ActivityIndicator color="#60a5fa" size="large" style={{ marginTop: 20 }} />
      )}
    </View>
  );

  const renderActiveCall = () => (
    <View style={styles.callContainer}>
      {remoteStream ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
        />
      ) : (
        <View style={styles.remoteVideo}>
          <LinearGradient colors={['#0f2044', '#1e3a8a']} style={styles.remoteVideoGradient}>
             <ActivityIndicator color="#60a5fa" size="large" />
             <Text style={styles.remoteLabel}>Connecting video...</Text>
          </LinearGradient>
        </View>
      )}

      <View style={styles.localVideo}>
        {isCameraOff ? (
          <View style={styles.cameraOffView}>
            <Ionicons name="videocam-off" size={24} color="#fff" />
          </View>
        ) : localStream ? (
          <RTCView
            streamURL={localStream.toURL()}
            style={{ flex: 1 }}
            objectFit="cover"
            zOrder={1}
          />
        ) : (
          <LinearGradient colors={['#1e3a8a', '#2563eb']} style={styles.localVideoGradient}>
            <Ionicons name="person" size={28} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        )}
      </View>

      <View style={styles.callInfoBar}>
        <View style={styles.callStatusBadge}>
          <View style={styles.callActiveDot} />
          <Text style={styles.callStatusText}>Connected</Text>
        </View>
        <Text style={styles.callDuration}>{formatDuration(callDuration)}</Text>
      </View>
    </View>
  );

  const renderEnded = () => (
    <View style={styles.endedContainer}>
      <View style={styles.endedIcon}>
        <Ionicons name="checkmark-circle" size={64} color="#10b981" />
      </View>
      <Text style={styles.endedTitle}>Call Ended</Text>
      <Text style={styles.endedSubtitle}>Duration: {formatDuration(callDuration)}</Text>
      <Text style={styles.endedNote}>Returning to dashboard...</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.callArea}>
        {callStatus === 'ended'
          ? renderEnded()
          : callStatus === 'connected'
          ? renderActiveCall()
          : renderConnecting()}
      </View>

      {callStatus !== 'ended' && (
        <View style={styles.controlsContainer}>
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,30,0.85)']}
            style={styles.controlsGradient}
          >
            {roomId && (
              <Text style={styles.controlsRoomId} numberOfLines={1}>
                Room: {roomId}
              </Text>
            )}

            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
                onPress={toggleMute}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isMuted ? 'mic-off' : 'mic'}
                  size={26}
                  color={isMuted ? '#ef4444' : '#fff'}
                />
                <Text style={styles.controlBtnLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.endCallBtn} onPress={endCall} activeOpacity={0.8}>
                <Ionicons name="call" size={30} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]}
                onPress={toggleCamera}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isCameraOff ? 'videocam-off' : 'videocam'}
                  size={26}
                  color={isCameraOff ? '#ef4444' : '#fff'}
                />
                <Text style={styles.controlBtnLabel}>{isCameraOff ? 'Camera On' : 'Camera'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.webrtcNote}>
              📡 Secure Peer-to-Peer WebRTC Consultation
            </Text>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
  callArea: {
    flex: 1,
  },

  // ─── Connecting state ───
  connectingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a1628',
    paddingHorizontal: 24,
  },
  ringOuter: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(59,130,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  ringMiddle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(59,130,246,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  roomIdBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  roomIdLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  roomIdText: {
    fontSize: 14,
    color: '#60a5fa',
    fontWeight: '600',
    marginTop: 4,
  },

  // ─── Active call ───
  callContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    flex: 1,
  },
  remoteVideoGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteAvatarContainer: {
    alignItems: 'center',
  },
  remoteLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 12,
    fontWeight: '600',
  },
  localVideo: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 100,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cameraOffView: {
    flex: 1,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  localVideoGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callInfoBar: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  callStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  callActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  callStatusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  callDuration: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  // ─── Controls ───
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  controlsGradient: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  controlsRoomId: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 20,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  controlBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(239,68,68,0.2)',
  },
  controlBtnLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    textAlign: 'center',
  },
  endCallBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '135deg' }],
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  webrtcNote: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginTop: 16,
  },

  // ─── Ended state ───
  endedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a1628',
    paddingHorizontal: 24,
  },
  endedIcon: {
    marginBottom: 24,
  },
  endedTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  endedSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  endedNote: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 16,
  },
});
