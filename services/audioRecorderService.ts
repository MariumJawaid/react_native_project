import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

interface RecordingResult {
  uri: string;
  duration: number;
  mimeType: string;
  size: number;
}

class AudioRecorderService {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;

  async startRecording(): Promise<void> {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Audio recording permission denied');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        // playThroughEarpiece was removed in recent expo-av versions
      });

      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await this.recording.startAsync();

      console.log('✅ Audio recording started');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<RecordingResult> {
    try {
      if (!this.recording) {
        throw new Error('No active recording');
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();

      if (!uri) {
        throw new Error('No recording URI obtained');
      }

      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('Recording file not found');
      }
      const size = fileInfo.size || 0;

      const status = await this.recording.getStatusAsync();
      const duration = status.durationMillis || 0;

      const result: RecordingResult = {
        uri,
        duration,
        mimeType: 'audio/mpeg',
        size
      };

      console.log(`✅ Recording stopped: ${duration}ms, ${size} bytes`);

      this.recording = null;
      return result;
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      throw error;
    }
  }

  async cancelRecording(): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
        console.log('✅ Recording cancelled');
      }
    } catch (error) {
      console.error('❌ Failed to cancel recording:', error);
      throw error;
    }
  }

  async convertToBase64(uri: string): Promise<string> {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as any
      });
      return base64;
    } catch (error) {
      console.error('❌ Failed to convert recording to base64:', error);
      throw error;
    }
  }

  async playRecording(uri: string): Promise<void> {
    try {
      this.sound = new Audio.Sound();
      await this.sound.loadAsync({ uri });
      await this.sound.playAsync();
    } catch (error) {
      console.error('❌ Failed to play recording:', error);
      throw error;
    }
  }

  async stopPlayback(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
    } catch (error) {
      console.error('❌ Failed to stop playback:', error);
    }
  }
}

export const audioRecorder = new AudioRecorderService();
