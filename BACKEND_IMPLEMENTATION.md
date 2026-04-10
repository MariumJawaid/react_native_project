# Backend Implementation Files

This document contains complete starter code for all backend files. Copy these to your `alztwin-backend/` directory.

## Directory Structure to Create

```
alztwin-backend/
├── server.js
├── package.json
├── .env
├── .gitignore
├── config/
│   ├── logger.js
│   ├── firebaseAdmin.js
│   └── geminiClient.js
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
└── logs/ (create directory, .gitkeep file)
```

---

## File 1: server.js

```javascript
const express = require('express');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();

const logger = require('./config/logger');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const assessmentRoutes = require('./routes/assessmentRoutes');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Performance Middleware
app.use(compression());

const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:8081',
    'http://localhost:19000',
    'http://localhost:19001'
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
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error Handler (Must be last)
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  logger.info(`✅ Backend server started on port ${PORT}`);
  console.log(`🚀 Voice Assessment Backend Ready`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api`);
});

module.exports = app;
```

---

## File 2: package.json

```json
{
  "name": "alztwin-voice-backend",
  "version": "1.0.0",
  "description": "Backend for voice-based cognitive assessment with Gemini AI",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [
    "cognitive-assessment",
    "voice-ai",
    "gemini",
    "firebase",
    "healthcare"
  ],
  "author": "Your Team",
  "license": "MIT",
  "dependencies": {
    "axios": "^1.6.0",
    "body-parser": "^1.20.0",
    "compression": "^1.7.4",
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
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
```

---

## File 3: .env

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id

# CORS
FRONTEND_URL=http://localhost:8081
FRONTEND_URL_PROD=https://your_app_url.com

# Audio Processing
MAX_AUDIO_FILE_SIZE=26214400
AUDIO_UPLOAD_DIR=./uploads/audio

# Logging
LOG_LEVEL=info
```

---

## File 4: .gitignore

```
node_modules/
.env
.env.local
.env.*.local
logs/
uploads/
dist/
.DS_Store
*.log
*.tmp
.vscode/
.idea/
```

---

## File 5: config/logger.js

```javascript
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'voice-assessment-backend' },
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/application.log'),
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service }) => {
          return `[${timestamp}] ${level}: ${message}`;
        })
      )
    })
  ]
});

module.exports = logger;
```

---

## File 6: config/firebaseAdmin.js

```javascript
const admin = require('firebase-admin');
const logger = require('./logger');

let db;
let adminInstance;

try {
  // Initialize Firebase Admin SDK
  adminInstance = admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  });

  db = admin.firestore();
  logger.info('✅ Firebase Admin initialized successfully');
} catch (error) {
  logger.error('❌ Firebase initialization failed:', error.message);
  throw new Error('Firebase Admin SDK initialization failed');
}

module.exports = {
  admin,
  db,
  adminInstance
};
```

---

## File 7: config/geminiClient.js

```javascript
const axios = require('axios');
const logger = require('./logger');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-1.5-flash';

async function evaluateAudioWithGemini(base64Audio, prompt, mimeType = 'audio/mpeg') {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

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
      ],
      generationConfig: {
        temperature: 0.3,
        topP: 0.9,
        maxOutputTokens: 500
      }
    };

    const response = await axios.post(url, payload, {
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Extract text response
    const textContent = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      throw new Error('No text response from Gemini');
    }

    logger.debug(`Gemini response received: ${textContent.substring(0, 100)}...`);

    // Parse JSON response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Unable to extract JSON from response: ${textContent}`);
    }

    const result = JSON.parse(jsonMatch[0]);
    return result;
  } catch (error) {
    logger.error('Gemini API error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    throw new Error(`Gemini evaluation failed: ${error.message}`);
  }
}

module.exports = {
  evaluateAudioWithGemini
};
```

---

## File 8: middleware/errorHandler.js

```javascript
const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Request error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      maxSize: process.env.MAX_AUDIO_FILE_SIZE,
      received: err.limit
    });
  }

  if (err.code === 'LIMIT_PART_COUNT') {
    return res.status(400).json({ error: 'Too many form fields' });
  }

  if (err.message && err.message.includes('File too large')) {
    return res.status(413).json({
      error: 'Audio file exceeds maximum size (25MB)',
      maxSize: '26214400 bytes'
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.message
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString(),
    requestId: Math.random().toString(36).substr(2, 9)
  });
};

module.exports = errorHandler;
```

---

## File 9: middleware/audioUpload.js

```javascript
const multer = require('multer');

// Store in memory to avoid disk I/O
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
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
    fileSize: 26214400  // 25MB
  }
});

module.exports = upload;
```

---

## File 10: middleware/rateLimiter.js

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 1000,  // Limit per IP
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  }
});

module.exports = limiter;
```

---

## File 11: services/audioProcessor.js

```javascript
const logger = require('../config/logger');

class AudioProcessor {
  static validateAudioFile(file) {
    const errors = [];

    if (!file) {
      errors.push('No audio file provided');
      return { valid: false, errors };
    }

    // Check file size
    const maxSize = parseInt(process.env.MAX_AUDIO_FILE_SIZE || '26214400');
    if (file.size > maxSize) {
      errors.push(`File too large: ${file.size} bytes (max ${maxSize})`);
    }

    // Check mime type
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
```

---

## File 12: services/scoringEngine.js

```javascript
const logger = require('../config/logger');

class ScoringEngine {
  static validateFAQResponses(responses) {
    const errors = [];
    for (let i = 1; i <= 10; i++) {
      const key = `q${i}`;
      if (!(key in responses)) {
        errors.push(`Missing FAQ question ${i}`);
      } else {
        const score = parseInt(responses[key]);
        if (isNaN(score) || score < 0 || score > 3) {
          errors.push(`Invalid FAQ Q${i} score: ${responses[key]} (must be 0-3)`);
        }
      }
    }
    return errors;
  }

  static calculateFAQTotal(responses) {
    const errors = this.validateFAQResponses(responses);
    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }

    const total = Object.values(responses).reduce((sum, score) => {
      return sum + parseInt(score || 0);
    }, 0);

    if (total < 0 || total > 30) {
      throw new Error(`Invalid FAQ total: ${total} (must be 0-30)`);
    }

    return {
      FAQTOTAL: total,
      severity: this.getFAQSeverity(total),
      classification: 'FAQ',
      maxScore: 30
    };
  }

  static calculateMMSETotal(responses) {
    const total = Object.values(responses).reduce((sum, score) => {
      return sum + parseInt(score || 0);
    }, 0);

    if (total < 0 || total > 30) {
      throw new Error(`Invalid MMSE total: ${total} (must be 0-30)`);
    }

    return {
      MMSCORE: total,
      severity: this.getMMSESeverity(total),
      classification: 'MMSE',
      maxScore: 30
    };
  }

  static calculateADASTotal(responses) {
    const total = Object.values(responses).reduce((sum, score) => {
      return sum + parseInt(score || 0);
    }, 0);

    if (total < 0 || total > 85) {
      throw new Error(`Invalid ADAS total: ${total} (must be 0-85)`);
    }

    return {
      TOTAL13: total,
      severity: this.getADASeverity(total),
      classification: 'ADAS-Cog 13',
      maxScore: 85
    };
  }

  static getFAQSeverity(score) {
    if (score <= 9) return 'Normal - Independent';
    if (score <= 15) return 'Mild Impairment - Some assistance needed';
    if (score <= 22) return 'Moderate Impairment - Significant assistance needed';
    return 'Severe Dependency - Complete assistance required';
  }

  static getMMSESeverity(score) {
    if (score >= 24) return 'Normal cognition';
    if (score >= 18) return 'Mild cognitive impairment';
    if (score >= 11) return 'Moderate cognitive impairment';
    return 'Severe cognitive impairment';
  }

  static getADASeverity(score) {
    if (score <= 20) return 'Normal - Minimal impairment';
    if (score <= 30) return 'Mild impairment';
    if (score <= 50) return 'Moderate impairment';
    return 'Severe impairment';
  }
}

module.exports = ScoringEngine;
```

---

## File 13: services/geminiEvaluator.js

```javascript
const { evaluateAudioWithGemini } = require('../config/geminiClient');
const logger = require('../config/logger');

class GeminiEvaluator {
  static faqPrompts = {
    1: "The caregiver responds to the question: 'In the past 4 weeks, has the patient had difficulty writing checks, paying bills, or balancing a checkbook?'\nUse this scale:\n0 = Normal/Has never had difficulty\n1 = Has difficulty but manages\n2 = Requires assistance\n3 = Completely dependent/cannot do\nRespond with ONLY valid JSON: {\"transcript\": \"...\", \"score\": NUMBER}",

    2: "Question: 'Have they had difficulty assembling tax records, business affairs, or handling papers?'\nScore 0-3 based on the caregiver's response.\nRespond with ONLY: {\"transcript\": \"...\", \"score\": NUMBER}",

    3: "Question: 'Can they shop alone for clothes, household necessities, or groceries?'\nScore: 0=Yes/normal, 1=Some difficulty, 2=Needs help, 3=Cannot do\nRespond with ONLY: {\"transcript\": \"...\", \"score\": NUMBER}",

    4: "Question: 'Can they play a game of skill, work on a hobby, or do a complex activity?'\nScore 0-3 based on response.\nRespond with ONLY: {\"transcript\": \"...\", \"score\": NUMBER}",

    5: "Question: 'Are they able to heat water, make coffee, and safely turn off the stove?'\nScore 0-3.\nRespond with ONLY: {\"transcript\": \"...\", \"score\": NUMBER}",

    6: "Question: 'Can they prepare a balanced meal on their own?'\nScore: 0=Yes, 1=Some difficulty, 2=Needs help, 3=Cannot do\nRespond with ONLY: {\"transcript\": \"...\", \"score\": NUMBER}",

    7: "Question: 'Are they able to keep track of current events or neighborhood happenings?'\nScore 0-3.\nRespond with ONLY: {\"transcript\": \"...\", \"score\": NUMBER}",

    8: "Question: 'Can they pay attention to, understand, and discuss a TV show, book, or magazine?'\nScore 0-3.\nRespond with ONLY: {\"transcript\": \"...\", \"score\": NUMBER}",

    9: "Question: 'Do they remember appointments, family occasions, holidays, and take medications regularly?'\nScore: 0=Yes always, 1=Usually, 2=Sometimes forgets, 3=Always forgets\nRespond with ONLY: {\"transcript\": \"...\", \"score\": NUMBER}",

    10: "Question: 'Can they travel out of neighborhood, drive, or arrange public transportation?'\nScore: 0=Yes, 1=Limited, 2=Needs help, 3=Cannot do\nRespond with ONLY: {\"transcript\": \"...\", \"score\": NUMBER}"
  };

  static async evaluateFAQQuestion(base64Audio, questionNumber) {
    const questionNum = parseInt(questionNumber);
    if (questionNum < 1 || questionNum > 10) {
      throw new Error(`Invalid FAQ question number: ${questionNumber}`);
    }

    const prompt = this.faqPrompts[questionNum];
    const result = await evaluateAudioWithGemini(base64Audio, prompt);

    // Validate score is 0-3
    if (result.score < 0 || result.score > 3) {
      throw new Error(`Invalid FAQ score: ${result.score}. Must be 0-3.`);
    }

    logger.info(`FAQ Q${questionNumber} evaluated with score ${result.score}`);
    return result;
  }

  static async evaluateMMSEQuestion(base64Audio, questionType) {
    const prompts = {
      orientation_time:
        "Patient was asked: 'Tell me the year, the season, the month, today's date, and the day of the week.'\nCurrent date: April 7, 2026 (Spring)\n1 point for each correct item. Max 5.\nRespond with ONLY: {\"transcript\": \"...\", \"score\": NUMBER}",

      orientation_place:
        "Patient was asked: 'Tell me the country, state, city, building name, and floor number.'\nExpected: United States, [state], [city], [current location], [floor]\nGive 1 point for each correct. Max 5.\nRespond with ONLY: {\"transcript\": \"...\", \"score\": NUMBER}",

      registration:
        "Patient was asked to repeat: 'Apple, Penny, Table'\n1 point for each word repeated correctly. Max 3.\nRespond with ONLY: {\"transcript\": \"...\", \"score\": NUMBER}",

      serial_sevens:
        "Patient was asked: subtract 7 from 100 repeatedly: 100-7=93, 93-7=86, 86-7=79, 79-7=72, 72-7=65\nGive 1 point for each CORRECT subtraction. Max 5.\nRespond with ONLY: {\"transcript\": \"...\", \"score\": NUMBER}",

      recall:
        "Recall test: Patient should remember 'Apple, Penny, Table'\nGive 1 point for each correctly remembered word. Max 3.\nRespond with ONLY: {\"transcript\": \"...\", \"score\": NUMBER}",

      naming:
        "Patient was shown objects and asked to name them. Did they name them correctly?\nGive 1 point if correct, 0 if incorrect.\nRespond with ONLY: {\"transcript\": \"...\", \"score\": NUMBER}",

      repetition:
        "Patient was asked to repeat exactly: 'No ifs, ands, or buts'\nGive 1 point if exact repetition, 0 if any errors.\nRespond with ONLY: {\"transcript\": \"...\", \"score\": NUMBER}"
    };

    const prompt = prompts[questionType];
    if (!prompt) {
      throw new Error(`Invalid MMSE question type: ${questionType}`);
    }

    const result = await evaluateAudioWithGemini(base64Audio, prompt);
    logger.info(`MMSE ${questionType} evaluated with score ${result.score}`);
    return result;
  }

  static async evaluateADASQuestion(base64Audio, questionType) {
    const prompts = {
      word_recall:
        "Word Recall Test: Patient was asked to recall 10 words.\nCount how many words the patient FORGOT (did not say).\nScore = number of words forgotten. Max 10 errors.\nRespond with ONLY: {\"transcript\": \"...\", \"score\": NUMBER}",

      serial_sevens:
        "Patient was asked: subtract 7 from 100 repeatedly.\nGive 1 point for every ERROR (incorrect subtraction). Max 5 errors.\nCorrect: 100→93→86→79→72→65\nRespond with ONLY: {\"transcript\": \"...\", \"score\": NUMBER}",

      orientation:
        "Evaluate patient's response about date, time, location, and context.\nAdd 1 point for every INCORRECT or missing piece of information.\nMax 8 errors.\nRespond with ONLY: {\"transcript\": \"...\", \"score\": NUMBER}",

      word_recognition:
        "Patient saw 10 words and was asked if shown words were on the list.\nCount INCORRECT yes/no answers. Score = number of errors. Max 12.\nRespond with ONLY: {\"transcript\": \"...\", \"score\": NUMBER}",

      delayed_recall:
        "Delayed recall: Patient asked to recall the original 10 words again.\nScore = 10 minus number correctly recalled. Max 10 errors.\nRespond with ONLY: {\"transcript\": \"...\", \"score\": NUMBER}"
    };

    const prompt = prompts[questionType];
    if (!prompt) {
      throw new Error(`Invalid ADAS question type: ${questionType}`);
    }

    const result = await evaluateAudioWithGemini(base64Audio, prompt);
    logger.info(`ADAS ${questionType} evaluated with score ${result.score}`);
    return result;
  }
}

module.exports = GeminiEvaluator;
```

---

## File 14: routes/health.js

```javascript
const express = require('express');
const router = express.Router();
const logger = require('../config/logger');

router.get('/', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Voice Assessment Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
```

---

## File 15: routes/assessmentRoutes.js

```javascript
const express = require('express');
const router = express.Router();
const upload = require('../middleware/audioUpload');
const assessmentController = require('../controllers/assessmentController');

// FAQ Questions
router.post('/faq/question', upload.single('audio'), assessmentController.evaluateFAQQuestion);

// MMSE Questions
router.post('/mmse/question', upload.single('audio'), assessmentController.evaluateMMSEQuestion);

// ADAS Questions
router.post('/adas/question', upload.single('audio'), assessmentController.evaluateADASQuestion);

// Complete Assessment - Submit all responses
router.post('/complete', assessmentController.completeAssessment);

// Batch Audio Evaluation (for observational questions)
router.post('/batch-evaluate', upload.array('audio', 10), assessmentController.batchEvaluate);

module.exports = router;
```

---

## File 16: controllers/assessmentController.js

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

      logger.info(`FAQ Question evaluation requested: Q${questionNumber}`);

      // Validate file
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

      // Convert to base64
      const base64Audio = AudioProcessor.convertToBase64(file.buffer);

      // Evaluate with Gemini
      const result = await GeminiEvaluator.evaluateFAQQuestion(base64Audio, questionNumber);

      // Validate score
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

      // Validate file
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
          return res.status(400).json({ error: `Invalid testType: ${testType}` });
      }

      // Prepare document
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

      // Save to Firebase
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
```

---

## Installation Steps

1. Create alztwin-backend directory:
   ```bash
   mkdir alztwin-backend && cd alztwin-backend
   ```

2. Copy all files above into respective directories

3. Create logs directory:
   ```bash
   mkdir logs && touch logs/.gitkeep
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Configure .env with your Gemini API key and Firebase credentials

6. Start server:
   ```bash
   npm run dev
   ```

Expected output:
```
✅ Backend server started on port 5000
✅ Firebase Admin initialized successfully
🚀 Voice Assessment Backend Ready
📍 http://localhost:5000
🔌 API: http://localhost:5000/api
```
