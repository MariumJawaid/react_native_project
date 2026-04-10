# AlzTwin Voice Assessment Backend

Professional Node.js backend for voice-based cognitive assessment with Google Gemini AI integration.

## Features

- 🎙️ **Audio Processing** - Upload, validate, and process audio files (up to 25MB)
- 🧠 **Gemini AI Integration** - Transcription and clinical scoring using Google Gemini 1.5 Flash
- 📊 **Clinical Scoring** - Accurate ADAS-Cog 13, FAQ, and MMSE scoring algorithms
- 🔥 **Firebase Integration** - Firestore storage for assessments
- 🛡️ **Error Handling** - Comprehensive validation and retry logic
- 📈 **Rate Limiting** - Protect against abuse (1000 req/15min)
- 🪵 **Logging** - Winston logs to file and console
- 🔐 **CORS** - Configured for React Native frontend access

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env` file with:
```env
PORT=5000
GEMINI_API_KEY=your_api_key
FIREBASE_PROJECT_ID=your_project
FIREBASE_PRIVATE_KEY=your_key
FIREBASE_CLIENT_EMAIL=your_email
FIREBASE_CLIENT_ID=your_id
FRONTEND_URL=http://localhost:8081
```

### 3. Start Server
```bash
# Development
npm run dev

# Production
npm start
```

Expected output:
```
✅ Backend server started on port 5000
✅ Firebase Admin initialized successfully
🚀 Voice Assessment Backend Ready
📍 http://localhost:5000
🔌 API: http://localhost:5000/api
```

## API Endpoints

### Health Check
```bash
GET /api/health
```

### FAQ Assessment
```bash
POST /api/assessment/faq/question
Content-Type: multipart/form-data

Form Data:
- audio: WAV/MP3 file (max 25MB)
- questionNumber: 1-10

Response:
{
  "success": true,
  "test": "FAQ",
  "questionNumber": 1,
  "transcript": "...",
  "score": 2,
  "maxScore": 3,
  "timestamp": "2026-04-07T..."
}
```

### Complete Assessment
```bash
POST /api/assessment/complete
Content-Type: application/json

Body:
{
  "patientId": "patient_123",
  "testType": "FAQ",
  "responses": {
    "q1": 2,
    "q2": 1,
    ...
    "q10": 3
  },
  "caregiverId": "caregiver_456"
}

Response:
{
  "success": true,
  "sessionId": "FAQ_1712500000000_abc123",
  "FAQTOTAL": 25,
  "severity": "Mild Impairment - Some assistance needed"
}
```

## Project Structure

```
alztwin-backend/
├── server.js                 # Express app entry point
├── package.json              # Dependencies
├── .env                      # Configuration
├── config/
│   ├── logger.js            # Winston logger setup
│   ├── firebaseAdmin.js     # Firebase initialization
│   └── geminiClient.js      # Gemini API client
├── middleware/
│   ├── errorHandler.js      # Global error handler
│   ├── audioUpload.js       # Multer file upload
│   └── rateLimiter.js       # Express-rate-limit
├── services/
│   ├── audioProcessor.js    # Audio validation
│   ├── scoringEngine.js     # Score calculations
│   └── geminiEvaluator.js   # Gemini prompts
├── routes/
│   ├── health.js            # Health endpoint
│   └── assessmentRoutes.js  # Assessment endpoints
├── controllers/
│   └── assessmentController.js  # Request handlers
└── logs/                    # Application logs
```

## Scoring Algorithms

### FAQ (Functional Activities Questionnaire)
- 10 questions, each scored 0-3
- Total: 0-30 (lower = better)
- Measures: ADL independence and functional ability

### MMSE (Mini-Mental State Exam)
- 11 items, each scored 0-5 (mixed scoring)
- Total: 0-30 (higher = better)
- Measures: Orientation, registration, attention, recall, language

### ADAS-Cog 13 (Alzheimer's Disease Assessment Scale)
- 13 items with mixed scoring
- Total: 0-85 (lower = better)
- Measures: Cognitive decline including language and praxis

## Error Handling

All errors follow this format:
```json
{
  "error": "Error message",
  "timestamp": "2026-04-07T10:30:00Z",
  "requestId": "abc123def456"
}
```

Common errors:
- **400** - Validation failed (invalid audio format, missing fields)
- **413** - File too large (>25MB)
- **500** - Internal server error

## Logging

Logs are written to `logs/application.log` with rotation:
- Max file size: 5MB
- Max files: 5
- Log levels: debug, info, warn, error

## Testing

### Test Health Endpoint
```bash
curl http://localhost:5000/api/health
```

### Test FAQ Evaluation
```bash
curl -X POST http://localhost:5000/api/assessment/faq/question \
  -F "audio=@path/to/audio.wav" \
  -F "questionNumber=1"
```

### Test Assessment Submission
```bash
curl -X POST http://localhost:5000/api/assessment/complete \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient_123",
    "testType": "FAQ",
    "responses": {"q1": 2, "q2": 1, "q3": 0, "q4": 2, "q5": 1, "q6": 3, "q7": 1, "q8": 2, "q9": 2, "q10": 1}
  }'
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment | development |
| GEMINI_API_KEY | Google Gemini API key | AIzaSy... |
| FIREBASE_PROJECT_ID | Firebase project ID | alztwin-voice |
| FIREBASE_PRIVATE_KEY | Firebase private key | -----BEGIN... |
| FIREBASE_CLIENT_EMAIL | Firebase service account email | firebase-adminsdk@... |
| FRONTEND_URL | Frontend URL for CORS | http://localhost:8081 |
| MAX_AUDIO_FILE_SIZE | Max audio size in bytes | 26214400 |
| LOG_LEVEL | Logging level | info |

## Dependencies

- **express** - Web framework
- **cors** - Cross-Origin Resource Sharing
- **multer** - File upload handling
- **axios** - HTTP client for Gemini API
- **firebase-admin** - Firebase Admin SDK
- **winston** - Logging library
- **express-rate-limit** - Rate limiting middleware
- **compression** - Gzip compression

## Development

For development with auto-restart:
```bash
npm run dev
```

Requires nodemon to be installed.

## Production Deployment

Before deploying:

1. **Set Environment Variables**
   ```bash
   export NODE_ENV=production
   export FRONTEND_URL=https://your-app-url.com
   ```

2. **Update Security Rules** in Firebase Console

3. **Restrict API Keys** in Google Cloud Console

4. **Configure HTTPS**

5. **Set Up Monitoring**

6. **Run Health Check**
   ```bash
   curl https://your-domain.com/api/health
   ```

## Troubleshooting

### Backend won't start
```bash
# Check if port is in use
lsof -ti:5000

# Kill existing process
kill -9 <PID>

# Or change PORT in .env
PORT=5001
```

### Firebase initialization fails
```bash
# Check .env has FIREBASE_PRIVATE_KEY with \n (not actual newlines)
# Verify all FIREBASE_* variables are set
npm run dev
```

### Gemini API errors
```bash
# Verify API key in Cloud Console
# Check quota in Cloud Console
# Ensure Generative Language API is enabled
```

### Audio upload fails
```bash
# Check file size < 25MB
# Check file format (MP3, WAV, OGG, M4A supported)
# Check Content-Type header is multipart/form-data
```

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review logs in `logs/application.log`
3. Verify all environment variables are set
4. Test endpoints with curl

## License

MIT

## Created

April 2026 - AlzTwin Voice Assessment Platform
