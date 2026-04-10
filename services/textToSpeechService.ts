import * as Speech from 'expo-speech';

class TextToSpeechService {
  private isSpeaking = false;

  async speakQuestion(questionText: string, rate = 0.9): Promise<void> {
    try {
      if (this.isSpeaking) {
        console.warn('⚠️ Speech already in progress');
        return;
      }

      this.isSpeaking = true;

      await Speech.speak(questionText, {
        rate,
        pitch: 1.0,
        language: 'en'
      });

      console.log('✅ Speech completed');
    } catch (error) {
      console.error('❌ Text-to-speech failed:', error);
      throw error;
    } finally {
      this.isSpeaking = false;
    }
  }

  async stopSpeaking(): Promise<void> {
    try {
      await Speech.stop();
      this.isSpeaking = false;
      console.log('✅ Speech stopped');
    } catch (error) {
      console.error('❌ Failed to stop speech:', error);
    }
  }

  isSpeakingNow(): boolean {
    return this.isSpeaking;
  }
}

export const textToSpeechService = new TextToSpeechService();
