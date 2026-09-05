/**
 * Call Documentation Integration Guide
 * Step-by-step instructions for integrating the call documenter into your voice agent
 */

// ============================================
// STEP 1: IMPORT THE CALL DOCUMENTER
// ============================================

const callDocumenter = require('./handlers/call-documenter');
const { logger } = require('./utils/logger');

// ============================================
// STEP 2: INITIALIZE TRANSCRIPT ON CALL START
// ============================================

// In your call handler (e.g., when Twilio webhook receives a call)
async function handleIncomingCall(req, res) {
  try {
    const { from, to } = req.body;

    // Create a new transcript for this call
    const transcriptId = callDocumenter.createTranscript(
      req.body.CallSid, // Use Twilio CallSid as callId
      {
        from: from,
        to: to
      }
    );

    logger.info('Call started, transcript created', { transcriptId, from, to });

    // Store transcriptId in session/database for later reference
    // You might want to save this to your database or session store
    res.locals.transcriptId = transcriptId;

    return transcriptId;
  } catch (error) {
    logger.error('Error handling incoming call', { error: error.message });
    throw error;
  }
}

// ============================================
// STEP 3: CAPTURE WORDS FROM SPEECH-TO-TEXT
// ============================================

// When you receive transcribed text from your speech-to-text service
// (e.g., Google Speech-to-Text, Azure Speech Services)
async function processTranscribedText(transcriptId, text, speaker, confidence) {
  try {
    // Split text into individual words or receive word-level data
    const words = text.split(/\s+/);

    for (const word of words) {
      callDocumenter.addWord(transcriptId, {
        text: word,
        speaker: speaker, // 'caller' or 'agent'
        confidence: confidence || 0.95,
        timestamp: new Date(),
        metadata: {
          source: 'speech-to-text'
        }
      });
    }

    logger.info('Words added to transcript', {
      transcriptId,
      wordCount: words.length,
      speaker
    });
  } catch (error) {
    logger.error('Error processing transcribed text', { error: error.message });
  }
}

// ============================================
// STEP 4: INTEGRATE EMOTION DETECTION
// ============================================

const emotionDetector = require('./handlers/emotion-detector');

async function processWithEmotion(transcriptId, text, speaker, audioBuffer) {
  try {
    // 1. Detect emotion from audio
    const emotionResult = await emotionDetector.detectEmotion({
      audio: audioBuffer,
      text: text
    });

    // 2. Add words with emotion
    const words = text.split(/\s+/);
    
    words.forEach((word, index) => {
      const wordEntry = callDocumenter.addWord(transcriptId, {
        text: word,
        speaker: speaker,
        emotion: emotionResult.emotion,
        emotionConfidence: emotionResult.confidence,
        timestamp: new Date(),
        metadata: {
          emotionProfile: emotionResult.profile
        }
      });

      logger.debug('Word with emotion added', {
        word: word,
        emotion: emotionResult.emotion,
        confidence: emotionResult.confidence
      });
    });

    return emotionResult;
  } catch (error) {
    logger.error('Error processing with emotion', { error: error.message });
  }
}

// ============================================
// STEP 5: GET TRANSCRIPT DATA DURING CALL
// ============================================

// Get live transcript (useful for dashboards)
async function getLiveTranscript(transcriptId) {
  try {
    return callDocumenter.getDetailedTranscript(transcriptId);
  } catch (error) {
    logger.error('Error getting live transcript', { error: error.message });
  }
}

// Get speaker-specific transcript
async function getAgentTranscript(transcriptId) {
  try {
    return callDocumenter.getTranscriptBySpeaker(transcriptId, 'agent');
  } catch (error) {
    logger.error('Error getting agent transcript', { error: error.message });
  }
}

// Get emotion progression during call
async function getEmotionProgression(transcriptId) {
  try {
    return callDocumenter.getEmotionTimeline(transcriptId);
  } catch (error) {
    logger.error('Error getting emotion timeline', { error: error.message });
  }
}

// ============================================
// STEP 6: HANDLE CALL END
// ============================================

async function handleCallEnd(req, res) {
  try {
    const transcriptId = res.locals.transcriptId;

    // Close transcript and generate summary
    const closedTranscript = callDocumenter.closeTranscript(transcriptId);

    // Generate full summary
    const summary = callDocumenter.generateSummary(transcriptId);

    logger.info('Call ended, transcript finalized', {
      transcriptId,
      summary
    });

    // SAVE TO DATABASE
    // Save the complete transcript to your database for storage
    await saveTranscriptToDatabase(closedTranscript, summary);

    return {
      transcriptId,
      summary,
      transcript: closedTranscript
    };
  } catch (error) {
    logger.error('Error handling call end', { error: error.message });
  }
}

// ============================================
// STEP 7: INTEGRATE WITH YOUR ROUTE HANDLER
// ============================================

/**
 * Example Twilio webhook route
 */
const express = require('express');
const router = express.Router();

router.post('/voice/webhook', async (req, res) => {
  try {
    // Start call
    const transcriptId = await handleIncomingCall(req, res);
    res.locals.transcriptId = transcriptId;

    // Generate TwiML response
    const VoiceResponse = require('twilio').twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    twiml.gather({
      numDigits: 1,
      action: '/voice/gather',
      method: 'POST'
    }).say('Thank you for calling. Press 1 to continue.');

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    logger.error('Error in voice webhook', { error: error.message });
    res.status(500).send('Internal Server Error');
  }
});

router.post('/voice/gather', async (req, res) => {
  try {
    const transcriptId = req.body.transcriptId; // Pass from client
    const digit = req.body.Digits;

    // Process user input
    // ... your agent logic ...

    res.type('text/xml');
    res.send(new (require('twilio').twiml.VoiceResponse)().toString());
  } catch (error) {
    logger.error('Error in gather handler', { error: error.message });
    res.status(500).send('Internal Server Error');
  }
});

router.post('/voice/hangup', async (req, res) => {
  try {
    const transcriptId = req.body.transcriptId;
    const result = await handleCallEnd(req, res);

    res.json(result);
  } catch (error) {
    logger.error('Error in hangup handler', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STEP 8: REAL-TIME STREAMING INTEGRATION
// ============================================

/**
 * For real-time streaming (WebSocket)
 */
const WebSocket = require('ws');

async function setupWebSocketForTranscription(ws, transcriptId) {
  ws.on('message', async (data) => {
    try {
      const payload = JSON.parse(data);

      if (payload.type === 'speech') {
        // Add transcribed speech
        await processWithEmotion(
          transcriptId,
          payload.transcript,
          payload.speaker, // 'caller' or 'agent'
          payload.audioBuffer
        );

        // Send live update back to client
        const liveData = getLiveTranscript(transcriptId);
        ws.send(JSON.stringify({
          type: 'transcript-update',
          data: liveData
        }));
      }
    } catch (error) {
      logger.error('WebSocket message error', { error: error.message });
    }
  });
}

// ============================================
// STEP 9: API ENDPOINTS FOR TRANSCRIPT ACCESS
// ============================================

/**
 * REST API endpoints to fetch transcripts
 */
router.get('/api/transcripts/:transcriptId', async (req, res) => {
  try {
    const { transcriptId } = req.params;
    const transcript = callDocumenter.getDetailedTranscript(transcriptId);
    res.json(transcript);
  } catch (error) {
    logger.error('Error fetching transcript', { error: error.message });
    res.status(404).json({ error: 'Transcript not found' });
  }
});

router.get('/api/transcripts/:transcriptId/text', async (req, res) => {
  try {
    const { transcriptId } = req.params;
    const text = callDocumenter.getTranscriptText(transcriptId);
    res.json({ text });
  } catch (error) {
    logger.error('Error fetching transcript text', { error: error.message });
    res.status(404).json({ error: 'Transcript not found' });
  }
});

router.get('/api/transcripts/:transcriptId/emotions', async (req, res) => {
  try {
    const { transcriptId } = req.params;
    const timeline = callDocumenter.getEmotionTimeline(transcriptId);
    res.json({ timeline });
  } catch (error) {
    logger.error('Error fetching emotion timeline', { error: error.message });
    res.status(404).json({ error: 'Transcript not found' });
  }
});

// ============================================
// STEP 10: DATABASE STORAGE
// ============================================

/**
 * Save transcript to your database
 * (Replace with your actual database implementation)
 */
async function saveTranscriptToDatabase(transcript, summary) {
  try {
    // Example: MongoDB
    // await TranscriptModel.create({
    //   transcriptId: transcript.transcriptId,
    //   callId: transcript.callId,
    //   from: transcript.from,
    //   to: transcript.to,
    //   words: transcript.words,
    //   summary: summary,
    //   createdAt: new Date()
    // });

    logger.info('Transcript saved to database', {
      transcriptId: transcript.transcriptId
    });
  } catch (error) {
    logger.error('Error saving transcript to database', { error: error.message });
  }
}

module.exports = {
  router,
  handleIncomingCall,
  processTranscribedText,
  processWithEmotion,
  getLiveTranscript,
  getAgentTranscript,
  getEmotionProgression,
  handleCallEnd,
  setupWebSocketForTranscription,
  saveTranscriptToDatabase
};
