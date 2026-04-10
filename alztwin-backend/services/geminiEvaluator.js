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
