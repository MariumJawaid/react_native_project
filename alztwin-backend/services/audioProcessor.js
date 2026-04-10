const logger = require('../config/logger');

class AudioProcessor {
  static validateAudioFile(file) {
    const errors = [];

    if (!file) {
      errors.push('No audio file provided');
      return { valid: false, errors };
    }

    const maxSize = parseInt(process.env.MAX_AUDIO_FILE_SIZE || '26214400');
    if (file.size > maxSize) {
      errors.push(`File too large: ${file.size} bytes (max ${maxSize})`);
    }

    const allowedMimes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a'];
    if (!allowedMimes.includes(file.mimetype)) {
      errors.push(`Invalid audio format: ${file.mimetype}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static convertToBase64(buffer) {
    if (!buffer) {
      throw new Error('No buffer provided');
    }
    return buffer.toString('base64');
  }

  static validateScore(score, maxScore) {
    const scoreNum = parseInt(score);

    if (isNaN(scoreNum)) {
      return { valid: false, error: 'Score is not a number' };
    }

    if (scoreNum < 0 || scoreNum > maxScore) {
      return { valid: false, error: `Score must be between 0 and ${maxScore}` };
    }

    return { valid: true, error: null };
  }

  static generateSessionId(testType) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `${testType}_${timestamp}_${random}`;
  }
}

module.exports = AudioProcessor;
