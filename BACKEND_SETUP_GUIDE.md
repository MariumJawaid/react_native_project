# Backend Setup Guide - Node.js/Express for Voice Assessment

## Quick Start

### 1. Project Initialization

```bash
# Create backend directory (separate from React Native app)
mkdir alztwin-backend
cd alztwin-backend

# Initialize Node project
npm init -y

# Install dependencies
npm install express cors multer axios dotenv firebase-admin winston body-parser
npm install --save-dev nodemon

# Recommended additional packages
npm install express-rate-limit helmet compression
```

### 2. Project Structure

```
alztwin-backend/
├── .env
├── .env.example
├── .gitignore
├── server.js
├── package.json
├── config/
│   ├── firebaseAdmin.js
│   ├── geminiClient.js
│   └── logger.js
├── middleware/
│   ├── errorHandler.js
│   ├── audioUpload.js
│   └── rateLimiter.js
├── services/
│   ├── geminiEvaluator.js
│   ├── audioProcessor.js
│   └── scoringEngine.js
├── routes/
│   ├── assessmentRoutes.js
│   └── health.js
├── controllers/
│   └── assessmentController.js
└── logs/
    └── application.log
```

---

## Step 1: Environment Setup

### `.env` File
```env
# Server
PORT=5000
NODE_ENV=development

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Admin
FIREBASE_PROJECT_ID=alztwin-test
FIREBASE_PRIVATE_KEY_ID=your_key_id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@alztwin-test.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# Audio settings
MAX_AUDIO_FILE_SIZE=26214400  # 25MB in bytes
AUDIO_UPLOAD_DIR=./uploads/audio

# CORS
FRONTEND_URL=http://localhost:8081
FRONTEND_URL_PROD=https://yourappurl.com

# Logging
LOG_LEVEL=info
```

### `.env.example` (commit to repo)
```env
PORT=5000
NODE_ENV=development
GEMINI_API_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_CLIENT_ID=
FRONTEND_URL=http://localhost:8081
```

---

## Step 2: Core Files

### `package.json`
```json
{
  "name": "alztwin-backend",
  "version": "1.0.0",
  "description": "Backend for voice-based cognitive assessment",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "keywords": ["cognitive", "assessment", "voice", "gemini"],
  "author": "Your Team",
  "license": "MIT",
  "dependencies": {
    "axios": "^1.6.0",
    "body-parser": "^1.20.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "express": "^4.18.0",
    "express-rate-limit": "^6.7.0",
    "firebase-admin": "^11.0.0",
    "helmet": "^7.0.0",
    "multer": "^1.4.5",
    "winston": "^3.8.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.20"
  }
}
```

### `server.js` - Main Entry Point
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const logger = require('./config/logger');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const assessmentRoutes = require('./routes/assessmentRoutes');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 5000;

// Security
app.use(helmet());
app.use(compression());

// CORS Configuration
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:8081',
    process.env.FRONTEND_URL_PROD || 'https://app.example.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Body Parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate Limiting
app.use('/api/', rateLimiter);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/assessment', assessmentRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// Error Handler (Must be last)
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`✅ Backend server started on http://localhost:${PORT}`);
});

module.exports = app;
```

---

## Step 3: Configuration Files

### `config/logger.js`
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: './logs/application.log' ,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

module.exports = logger;
```

### `config/firebaseAdmin.js`
```javascript
const admin = require('firebase-admin');
const logger = require('./logger');

try {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  });
  
  const db = admin.firestore();
  logger.info('✅ Firebase Admin initialized');
  
  module.exports = { admin, db };
} catch (error) {
  logger.error('❌ Firebase initialization failed:', error);
  throw error;
}
```

### `config/geminiClient.js`
```javascript
const axios = require('axios');
const logger = require('./logger');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-1.5-flash';  // Supports audio processing

async function evaluateAudioWithGemini(base64Audio, prompt, mimeType = 'audio/mpeg') {
  try {
    const url = `${GEMINI_BASE_URL}/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Audio
              }
            },
            {
              text: prompt
            }
          ]
        }
      ]
    };

    const response = await axios.post(url, payload, {
      timeout: 60000  // 60 second timeout for audio processing
    });

    // Extract text response
    const textContent = response.data.candidates[0].content.parts[0].text;
    
    logger.info('✅ Gemini evaluation successful');
    
    // Parse JSON response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    return result;
    
  } catch (error) {
    logger.error('❌ Gemini API error:', error.message);
    throw new Error(`Gemini evaluation failed: ${error.message}`);
  }
}

module.exports = { evaluateAudioWithGemini };
```

---

## Step 4: Middleware

### `middleware/audioUpload.js`
```javascript
const multer = require('multer');
const path = require('path');
const logger = require('../config/logger');

// Configure storage
const storage = multer.memoryStorage();  // Keep in memory, don't persist

const fileFilter = (req, file, cb) => {
  // Allowed mime types
  const allowedMimes = [
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/m4a',
    'audio/mp4',
    'audio/webm'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid audio format: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: process.env.MAX_AUDIO_FILE_SIZE || 26214400  // 25MB
  }
});

module.exports = upload;
```

### `middleware/errorHandler.js`
```javascript
const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      maxSize: process.env.MAX_AUDIO_FILE_SIZE
    });
  }

  if (err.code === 'LIMIT_PART_COUNT') {
    return res.status(400).json({ error: 'Too many parts' });
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
};

module.exports = errorHandler;
```

### `middleware/rateLimiter.js`
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = limiter;
```

---

## Step 5: Services

### `services/geminiEvaluator.js`
```javascript
const { evaluateAudioWithGemini } = require('../config/geminiClient');
const logger = require('../config/logger');

class GeminiEvaluator {
  static async evaluateFAQQuestion(base64Audio, questionNumber) {
    const faqPrompts = {
      1: "Question: 'In the past 4 weeks, has the patient had difficulty writing checks, paying bills, or balancing a checkbook?'\nEvaluate the caregiver's response.\nScore:\n- 0: Normal/Never had difficulty\n- 1: Has difficulty but manages\n- 2: Requires assistance\n- 3: Dependent/Cannot do\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}",
      
      2: "Question: 'Have they had difficulty assembling tax records, business affairs, or papers?'\nScore 0-3.\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}",
      
      3: "Question: 'Can they shop alone for clothes, household necessities, or groceries?'\nScore 0-3.\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}",
      
      4: "Question: 'Can they play a game of skill, work on a hobby, or do a complex activity?'\nScore 0-3.\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}",
      
      5: "Question: 'Are they able to heat water, make a cup of coffee, and safely turn off the stove?'\nScore 0-3.\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}",
      
      6: "Question: 'Can they prepare a balanced meal on their own?'\nScore 0-3.\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}",
      
      7: "Question: 'Are they able to keep track of current events or what is going on in the neighborhood?'\nScore 0-3.\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}",
      
      8: "Question: 'Can they pay attention to, understand, and discuss a TV show, book, or magazine?'\nScore 0-3.\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}",
      
      9: "Question: 'Do they remember appointments, family occasions, holidays, and to take medications?'\nScore 0-3.\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}",
      
      10: "Question: 'Can they travel out of the neighborhood, drive, or arrange to take public transportation?'\nScore 0-3.\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}"
    };

    const prompt = faqPrompts[questionNumber];
    if (!prompt) throw new Error(`Invalid FAQ question number: ${questionNumber}`);

    return await evaluateAudioWithGemini(base64Audio, prompt);
  }

  static async evaluateMMSEQuestion(base64Audio, questionType, context = {}) {
    const prompts = {
      orientation_time: "Patient was asked: 'Tell me the year, the season, the month, today's date, and the day of the week.'\nCurrent date: April 7, 2026 (Spring).\nGive 1 point for each correct item. Max 5.\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}",
      
      orientation_place: "Patient was asked: 'Tell me what country we are in, the state, the city, the name of this building, and what floor we are on.'\nGive 1 point for each correct item. Max 5.\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}",
      
      registration: "Patient was asked to repeat: 'Apple, Penny, Table'\nGive 1 point for each word repeated correctly. Max 3.\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}",
      
      serial_sevens: "Patient was asked to subtract 7 from 100 repeatedly.\nGive 1 point for each correct subtraction (max 5).\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}",
      
      recall: "Target words: Apple, Penny, Table.\nGive 1 point for each word remembered. Max 3.\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}",
      
      naming: "Did the patient correctly name the shown object? 1 point if yes, 0 if no.\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}",
      
      repetition: "Patient was asked to repeat exactly: 'No ifs, ands, or buts'\nGive 1 point if exact, 0 if not.\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}"
    };

    const prompt = prompts[questionType];
    if (!prompt) throw new Error(`Invalid MMSE question type: ${questionType}`);

    return await evaluateAudioWithGemini(base64Audio, prompt);
  }

  static async evaluateADASQuestion(base64Audio, questionType) {
    const prompts = {
      word_recall: "Patient was asked to recall a list of 10 words.\nCount how many words the patient FORGOT (not said).\nScore = 10 minus number correctly recalled. Max 10 errors.\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}",
      
      serial_sevens: "Patient was asked to subtract 7 from 100 repeatedly.\nGive 1 point for every ERROR in subtraction. Max 5 errors.\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}",
      
      orientation: "Evaluate patient's response for date, time, location, etc.\nAdd 1 point for every INCORRECT or missing piece of information. Max 8.\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}",
      
      word_recognition: "Patient was shown words and asked if they were on original list.\nCount INCORRECT Yes/No answers. Score = number of errors. Max 12.\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}",
      
      delayed_recall: "Patient was asked to recall the original 10-word list again.\nScore = 10 minus number correctly recalled. Max 10.\nReturn ONLY: {\"transcript\": \"...\", \"score\": X}"
    };

    const prompt = prompts[questionType];
    if (!prompt) throw new Error(`Invalid ADAS question type: ${questionType}`);

    return await evaluateAudioWithGemini(base64Audio, prompt);
  }

  static async evaluateObservational(base64AudioList, assessmentType) {
    // For batch observational questions
    // base64AudioList = [audio1, audio2, audio3, ...]
    
    const parts = [
      ...base64AudioList.map(audio => ({
        inline_data: {
          mime_type: 'audio/mpeg',
          data: audio
        }
      })),
      {
        text: this.getObservationalPrompt(assessmentType)
      }
    ];

    const prompt = this.getObservationalPrompt(assessmentType);
    
    // Send batch to Gemini
    const { evaluateAudioWithGemini } = require('../config/geminiClient');
    
    logger.info(`Evaluating observational score for ${assessmentType}`);
    
    // This requires custom implementation - see below
    return await this.batchAudioEvaluation(base64AudioList, prompt);
  }

  static getObservationalPrompt(assessmentType) {
    const prompts = {
      language: "Analyze the patient's SPOKEN LANGUAGE QUALITY across all provided audio clips.\nRate 0-5:\n0 = Clear, articulate\n1 = Occasional slurring\n2 = Noticeable slurring\n3 = Significant difficulty\n4 = Mostly unintelligible\n5 = No speech\nReturn ONLY: {\"score\": X}",
      
      comprehension: "Rate patient's COMPREHENSION of instructions 0-5:\n0 = Understood perfectly\n1 = Minor confusion\n2 = Some confusion\n3 = Significant difficulty\n4 = Mostly didn't understand\n5 = Understood nothing\nReturn ONLY: {\"score\": X}",
      
      word_finding: "Rate WORD-FINDING DIFFICULTY 0-5:\n0 = No difficulty\n1 = Occasional hesitation\n2 = Noticeable hesitation\n3 = Significant difficulty\n4 = Severe difficulty\n5 = Unable to retrieve words\nReturn ONLY: {\"score\": X}",
      
      instruction_recall: "How often did patient forget instructions? Rate 0-5:\n0 = Never forgot\n1 = Occasionally asked for clarification\n2 = Frequently asked\n3 = Constantly forgetful\n4 = Repeated asking\n5 = Constantly confused\nReturn ONLY: {\"score\": X}",
      
      concentration: "Rate patient's CONCENTRATION/DISTRACTIBILITY 0-5:\n0 = Fully concentrated\n1 = Brief lapses\n2 = Occasional distractions\n3 = Frequent distractions\n4 = Severely distracted\n5 = Could not focus/withdrawn\nReturn ONLY: {\"score\": X}"
    };

    return prompts[assessmentType] || '';
  }

  static async batchAudioEvaluation(base64AudioList, prompt) {
    // Implement batch audio processing
    // This is a simplified version - may need adjustment based on Gemini API capabilities
    try {
      const { evaluateAudioWithGemini } = require('../config/geminiClient');
      
      // For now, concatenate instruction with audio files
      // Gemini API should handle multiple audio files in one request
      const result = await evaluateAudioWithGemini(base64AudioList[0], prompt);
      return result;
    } catch (error) {
      logger.error('Batch audio evaluation failed:', error);
      throw error;
    }
  }
}

module.exports = GeminiEvaluator;
```

### `services/audioProcessor.js`
```javascript
const logger = require('../config/logger');

class AudioProcessor {
  static validateAudioFile(file) {
    const errors = [];

    if (!file) {
      errors.push('No audio file provided');
    } else {
      // Check file size (25MB limit for Gemini)
      if (file.size > 26214400) {
        errors.push(`File too large: ${file.size} bytes (max 26214400)`);
      }

      // Check mime type
      const allowedMimes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a'];
      if (!allowedMimes.includes(file.mimetype)) {
        errors.push(`Invalid audio format: ${file.mimetype}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static convertToBase64(buffer) {
    if (!buffer) throw new Error('No buffer provided');
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
}

module.exports = AudioProcessor;
```

### `services/scoringEngine.js`
```javascript
const logger = require('../config/logger');

class ScoringEngine {
  static calculateFAQTotal(responses) {
    // responses = { q1: 2, q2: 1, ... q10: 3 }
    const total = Object.values(responses).reduce((sum, score) => sum + parseInt(score || 0), 0);
    
    if (total < 0 || total > 30) {
      throw new Error(`Invalid FAQ total: ${total} (must be 0-30)`);
    }

    return {
      FAQTOTAL: total,
      severity: this.getFAQSeverity(total)
    };
  }

  static calculateMMSETotal(responses) {
    const total = Object.values(responses).reduce((sum, score) => sum + parseInt(score || 0), 0);
    
    if (total < 0 || total > 30) {
      throw new Error(`Invalid MMSE total: ${total} (must be 0-30)`);
    }

    return {
      MMSCORE: total,
      severity: this.getMMSESeverity(total)
    };
  }

  static calculateADASTotal(responses) {
    // ADAS scores are errors (higher = worse), so sum all 13 components
    const total = Object.values(responses).reduce((sum, score) => sum + parseInt(score || 0), 0);
    
    if (total < 0 || total > 85) {
      throw new Error(`Invalid ADAS total: ${total} (must be 0-85)`);
    }

    return {
      TOTAL13: total,
      severity: this.getADARSeverity(total)
    };
  }

  static getFAQSeverity(score) {
    if (score <= 9) return 'Normal';
    if (score <= 15) return 'Mild Impairment';
    if (score <= 22) return 'Moderate Impairment';
    return 'Severe Dependency';
  }

  static getMMSESeverity(score) {
    if (score >= 24) return 'Normal';
    if (score >= 18) return 'Mild Impairment';
    if (score >= 11) return 'Moderate Impairment';
    return 'Severe Impairment';
  }

  static getADASeverity(score) {
    if (score <= 20) return 'Normal';
    if (score <= 30) return 'Mild Impairment';
    if (score <= 50) return 'Moderate Impairment';
    return 'Severe Impairment';
  }
}

module.exports = ScoringEngine;
```

---

## Step 6: Routes and Controllers

### `routes/health.js`
```javascript
const express = require('express');
const router = express.Router();
const logger = require('../config/logger');

router.get('/', (req, res) => {
  logger.info('Health check');
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
```

### `routes/assessmentRoutes.js`
```javascript
const express = require('express');
const router = express.Router();
const upload = require('../middleware/audioUpload');
const assessmentController = require('../controllers/assessmentController');

// FAQ assessment
router.post('/faq/question', upload.single('audio'), assessmentController.evaluateFAQQuestion);

// MMSE assessment
router.post('/mmse/question', upload.single('audio'), assessmentController.evaluateMMSEQuestion);

// ADAS assessment
router.post('/adas/question', upload.single('audio'), assessmentController.evaluateADASQuestion);

// Image evaluation (for drawings)
router.post('/image/evaluate', assessmentController.evaluateImage);

// Complete assessment
router.post('/complete', assessmentController.completeAssessment);

module.exports = router;
```

### `controllers/assessmentController.js`
```javascript
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

      // Validate
      const validation = AudioProcessor.validateAudioFile(file);
      if (!validation.valid) {
        return res.status(400).json({ errors: validation.errors });
      }

      if (!questionNumber) {
        return res.status(400).json({ error: 'questionNumber required' });
      }

      // Convert to base64
      const base64Audio = AudioProcessor.convertToBase64(file.buffer);

      // Evaluate with Gemini
      const result = await GeminiEvaluator.evaluateFAQQuestion(base64Audio, questionNumber);

      // Validate score
      const scoreValidation = AudioProcessor.validateScore(result.score, 3);
      if (!scoreValidation.valid) {
        logger.warn(`Invalid FAQ score ${result.score} for question ${questionNumber}`);
        return res.status(400).json({ error: scoreValidation.error });
      }

      logger.info(`FAQ Q${questionNumber} evaluated: score=${result.score}`);

      res.json({
        success: true,
        questionNumber,
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

      // Validate
      const validation = AudioProcessor.validateAudioFile(file);
      if (!validation.valid) {
        return res.status(400).json({ errors: validation.errors });
      }

      const base64Audio = AudioProcessor.convertToBase64(file.buffer);
      const result = await GeminiEvaluator.evaluateMMSEQuestion(base64Audio, questionType);

      // Validate score based on question type
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

      logger.info(`MMSE ${questionType} evaluated: score=${result.score}`);

      res.json({
        success: true,
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

      const validation = AudioProcessor.validateAudioFile(file);
      if (!validation.valid) {
        return res.status(400).json({ errors: validation.errors });
      }

      const base64Audio = AudioProcessor.convertToBase64(file.buffer);
      const result = await GeminiEvaluator.evaluateADASQuestion(base64Audio, questionType);

      logger.info(`ADAS ${questionType} evaluated: score=${result.score}`);

      res.json({
        success: true,
        questionType,
        transcript: result.transcript,
        score: result.score,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }

  static async evaluateImage(req, res, next) {
    try {
      const { base64Image, imageType } = req.body;

      if (!base64Image || !imageType) {
        return res.status(400).json({ error: 'base64Image and imageType required' });
      }

      // TODO: Implement Gemini image evaluation
      // Evaluate drawing (praxis, copying, writing)

      res.json({
        success: true,
        imageType,
        score: 1,  // placeholder
        feedback: 'Image evaluation not yet implemented'
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

      if (!patientId || !testType || !responses) {
        return res.status(400).json({
          error: 'patientId, testType, and responses required'
        });
      }

      // Calculate total score
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
          return res.status(400).json({ error: 'Invalid testType' });
      }

      // Prepare document
      const sessionId = `${testType}_${Date.now()}`;
      const assessmentDoc = {
        patientId,
        testType,
        sessionDate: new Date(),
        completedAt: new Date(),
        responses,
        ...aggregated,
        severity: aggregated.severity,
        metadata: {
          caregiverId: caregiverId || null,
          completionRate: 1,
          appVersion: '1.0.0'
        }
      };

      // Save to Firebase
      await db.collection('voiceAssessmentResults').doc(sessionId).set(assessmentDoc);

      logger.info(`Assessment completed: ${testType} for patient ${patientId}`);

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
}

module.exports = AssessmentController;
```

---

## Running the Backend

```bash
# Development
npm run dev

# Production
npm start

# Test
npm test
```

Expected output:
```
✅ Backend server started on http://localhost:5000
✅ Firebase Admin initialized
Ready to receive audio from frontend
```

---

## Testing Endpoints

### Test FAQ Question
```bash
curl -X POST http://localhost:5000/api/assessment/faq/question \
  -F "audio=@/path/to/audio.wav" \
  -F "questionNumber=1"
```

### Test MMSE Question
```bash
curl -X POST http://localhost:5000/api/assessment/mmse/question \
  -F "audio=@/path/to/audio.wav" \
  -F "questionType=orientation_time"
```

### Complete Assessment
```bash
curl -X POST http://localhost:5000/api/assessment/complete \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient_123",
    "testType": "FAQ",
    "caregiverId": "caregiver_456",
    "responses": {
      "q1": 1,
      "q2": 2,
      ...
      "q10": 1
    }
  }'
```

---

## Next Step

Once backend is running, implement the React Native frontend components.
