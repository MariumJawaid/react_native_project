const GeminiEvaluator = require('../services/geminiEvaluator');
const AudioProcessor = require('../services/audioProcessor');
const ScoringEngine = require('../services/scoringEngine');
const { db } = require('../config/firebaseAdmin');
const logger = require('../config/logger');

class AssessmentController {
  static async evaluateFAQQuestion(req, res, next) {
    try {
      const { questionNumber } = req.body;
      const file = req.file;

      logger.info(`FAQ Question evaluation requested: Q${questionNumber}`);

      const validation = AudioProcessor.validateAudioFile(file);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Audio validation failed',
          errors: validation.errors
        });
      }

      if (!questionNumber) {
        return res.status(400).json({ error: 'questionNumber is required' });
      }

      const base64Audio = AudioProcessor.convertToBase64(file.buffer);
      const result = await GeminiEvaluator.evaluateFAQQuestion(base64Audio, questionNumber);
      const scoreValidation = AudioProcessor.validateScore(result.score, 3);
      if (!scoreValidation.valid) {
        logger.warn(`Invalid FAQ score ${result.score} for Q${questionNumber}`);
        return res.status(400).json({ error: scoreValidation.error });
      }

      res.json({
        success: true,
        test: 'FAQ',
        questionNumber: parseInt(questionNumber),
        transcript: result.transcript,
        score: result.score,
        maxScore: 3,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }

  static async evaluateMMSEQuestion(req, res, next) {
    try {
      const { questionType } = req.body;
      const file = req.file;

      logger.info(`MMSE Question evaluation requested: ${questionType}`);

      const validation = AudioProcessor.validateAudioFile(file);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Audio validation failed',
          errors: validation.errors
        });
      }

      const base64Audio = AudioProcessor.convertToBase64(file.buffer);
      const result = await GeminiEvaluator.evaluateMMSEQuestion(base64Audio, questionType);

      const maxScoreMap = {
        orientation_time: 5,
        orientation_place: 5,
        registration: 3,
        serial_sevens: 5,
        recall: 3,
        naming: 1,
        repetition: 1
      };

      const maxScore = maxScoreMap[questionType] || 1;
      const scoreValidation = AudioProcessor.validateScore(result.score, maxScore);
      if (!scoreValidation.valid) {
        return res.status(400).json({ error: scoreValidation.error });
      }

      res.json({
        success: true,
        test: 'MMSE',
        questionType,
        transcript: result.transcript,
        score: result.score,
        maxScore,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }

  static async evaluateADASQuestion(req, res, next) {
    try {
      const { questionType } = req.body;
      const file = req.file;

      logger.info(`ADAS Question evaluation requested: ${questionType}`);

      const validation = AudioProcessor.validateAudioFile(file);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Audio validation failed',
          errors: validation.errors
        });
      }

      const base64Audio = AudioProcessor.convertToBase64(file.buffer);
      const result = await GeminiEvaluator.evaluateADASQuestion(base64Audio, questionType);

      res.json({
        success: true,
        test: 'ADAS',
        questionType,
        transcript: result.transcript,
        score: result.score,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }

  static async completeAssessment(req, res, next) {
    try {
      const {
        patientId,
        testType,
        responses,
        caregiverId
      } = req.body;

      logger.info(`Complete assessment request: ${testType} for patient ${patientId}`);

      if (!patientId || !testType || !responses) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['patientId', 'testType', 'responses']
        });
      }

      let aggregated;
      switch (testType) {
        case 'FAQ':
          aggregated = ScoringEngine.calculateFAQTotal(responses);
          break;
        case 'MMSE':
          aggregated = ScoringEngine.calculateMMSETotal(responses);
          break;
        case 'ADAS-Cog 13':
          aggregated = ScoringEngine.calculateADASTotal(responses);
          break;
        default:
          return res.status(400).json({ error: `Invalid testType: ${testType}` });
      }

      const sessionId = AudioProcessor.generateSessionId(testType);
      const assessmentDoc = {
        patientId,
        testType,
        sessionId,
        sessionDate: new Date(),
        completedAt: new Date(),
        responses,
        ...aggregated,
        metadata: {
          caregiverId: caregiverId || null,
          completionRate: 1,
          source: 'voice-assessment',
          appVersion: '1.0.0'
        }
      };

      await db.collection('voiceAssessmentResults').doc(sessionId).set(assessmentDoc);

      logger.info(`Assessment completed and saved: ${sessionId}`);

      res.json({
        success: true,
        sessionId,
        ...aggregated,
        message: `${testType} assessment completed successfully`
      });

    } catch (error) {
      next(error);
    }
  }

  static async batchEvaluate(req, res, next) {
    try {
      const files = req.files;
      const { assessmentType } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No audio files provided' });
      }

      logger.info(`Batch evaluation requested: ${assessmentType} with ${files.length} files`);

      res.json({
        success: true,
        message: 'Batch evaluation not yet implemented',
        filesReceived: files.length
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = AssessmentController;
