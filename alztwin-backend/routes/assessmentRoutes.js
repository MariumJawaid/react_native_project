const express = require('express');
const router = express.Router();
const upload = require('../middleware/audioUpload');
const assessmentController = require('../controllers/assessmentController');

router.post('/faq/question', upload.single('audio'), assessmentController.evaluateFAQQuestion);
router.post('/mmse/question', upload.single('audio'), assessmentController.evaluateMMSEQuestion);
router.post('/adas/question', upload.single('audio'), assessmentController.evaluateADASQuestion);
router.post('/complete', assessmentController.completeAssessment);
router.post('/batch-evaluate', upload.array('audio', 10), assessmentController.batchEvaluate);

module.exports = router;
