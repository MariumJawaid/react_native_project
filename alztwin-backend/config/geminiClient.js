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

    const textContent = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      throw new Error('No text response from Gemini');
    }

    logger.debug(`Gemini response received: ${textContent.substring(0, 100)}...`);

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
