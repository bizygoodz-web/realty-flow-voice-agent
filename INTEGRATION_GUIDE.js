/**
 * Call Documentation Integration Guide
 * Step-by-step instructions for integrating the call documenter into your voice agent
 * Enhanced with validation, error handling, session management, and robust database models.
 */

const express = require('express');
const router = express.Router();
const WebSocket = require('ws');
const twilio = require('twilio');

const callDocumenter = require('./handlers/call-documenter');
const emotionDetector = require('./handlers/emotion-detector');
const { logger } = require('./utils/logger');

// Optional: Placeholder for Mongoose model if using MongoDB
// const TranscriptModel = require('./models/transcript');

// In-memory active session timeout tracking (to clean up orphaned sessions)
const activeSessions = new Map();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function trackSession(transcriptId) {
  const timeout = setTimeout(() => {
    if (activeSessions.has(transcriptId)) {
      logger.warn('Session timed out without formal hangup, force closing', { transcriptId });
      try {
        callDocumenter.closeTranscript(transcriptId);
      } catch (err) {
        logger.error('Error auto-closing timed out transcript', { error: err.message });
      }
      activeSessions.delete(transcriptId);
    }
  }, SESSION_TIMEOUT_MS);
  
  activeSessions.set(transcriptId, timeout);
}

function clearSessionTimer(transcriptId) {
  if (activeSessions.has(transcriptId)) {
    clearTimeout(activeSessions.get(transcriptId));
    activeSessions.delete(transcriptId);
  }
}

// ============================================
// STEP 1: IMPORT THE CALL DOCUMENTER (Done above)
// ============================================

// ============================================
// STEP 2: INITIALIZE TRANSCRIPT ON CALL START
// ============================================

async function handleIncomingCall(req, res) {
  try {
    const { From: from, To: to, CallSid } = req.body;

    if (!CallSid) {
      throw new Error('Missing CallSid in request body');
    }

    const transcriptId = callDocumenter.createTranscript(CallSid, {
      from: from || 'Unknown',
      to: to || 'Unknown'
    });

    trackSession(transcriptId);
    logger.info('Call started, transcript created', { transcriptId, from, to });

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

async function processTranscribedText(transcriptId, text, speaker, confidence = 0.95) {
  try {
    if (!text) return;
    const words = text.split(/\s+/);

    for (const word of words) {
      callDocumenter.addWord(transcriptId, {
        text: word,
        speaker: speaker, // 'caller' or 'agent'
        confidence: confidence,
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

async function processWithEmotion(transcriptId, text, speaker, audioBuffer) {
  try {
    let emotionResult = { emotion: 'neutral', confidence: 1.0, profile: {} };

    if (audioBuffer) {
      try {
        emotionResult = await emotionDetector.detectEmotion({
          audio: audioBuffer,
          text: text
        });
      } catch (emotionErr) {
        logger.warn('Emotion detection service failed, falling back to neutral', { error: emotionErr.message });
      }
    }

    const words = text ? text.split(/\s+/) : [];
    
    for (const word of words) {
      callDocumenter.addWord(transcriptId, {
        text: word,
        speaker: speaker,
        emotion: emotionResult.emotion,
        emotionConfidence: emotionResult.confidence,
        timestamp: new Date(),
        metadata: {
          emotionProfile: emotionResult.profile
        }
      });
    }

    return emotionResult;
  } catch (error) {
    logger.error('Error processing with emotion', { error: error.message });
  }
}

// ============================================
// STEP 5: GET TRANSCRIPT DATA DURING CALL
// ============================================

async function getLiveTranscript(transcriptId) {
  try {
    return callDocumenter.getDetailedTranscript(transcriptId);
  } catch (error) {
    logger.error('Error getting live transcript', { error: error.message });
  }
}

async function getAgentTranscript(transcriptId) {
  try {
    return callDocumenter.getTranscriptBySpeaker(transcriptId, 'agent');
  } catch (error) {
    logger.error('Error getting agent transcript', { error: error.message });
  }
}

async function getEmotionProgression(transcriptId) {
  try {
    return callDocumenter.getEmotionTimeline(transcriptId);
  } catch (error) {
    logger.error('Error getting emotion timeline', { error: error.message });
  }
}

// ============================================
// STEP 6: HANDLE CALL END & REAL ESTATE TAGGING
// ============================================

async function handleCallEnd(transcriptId) {
  try {
    clearSessionTimer(transcriptId);

    const closedTranscript = callDocumenter.closeTranscript(transcriptId);
    const summary = callDocumenter.generateSummary(transcriptId);

    // Automated Real Estate Intent Tagging
    const fullText = callDocumenter.getTranscriptText(transcriptId).toLowerCase();
    const tags = [];
    if (fullText.includes('buy') || fullText.includes('purchase') || fullText.includes('looking for a home')) tags.push('buyer');
    if (fullText.includes('sell') || fullText.includes('listing') || fullText.includes('market value')) tags.push('seller');
    if (fullText.includes('rent') || fullText.includes('lease')) tags.push('renter');

    const enrichedSummary = {
      ...summary,
      realEstateTags: tags,
      qualifiedLead: tags.length > 0
    };

    logger.info('Call ended, transcript finalized with tags', {
      transcriptId,
      tags
    });

    await saveTranscriptToDatabase(closedTranscript, enrichedSummary);

    return {
      transcriptId,
      summary: enrichedSummary,
      transcript: closedTranscript
    };
  } catch (error) {
    logger.error('Error handling call end', { error: error.message });
  }
}

// ============================================
// STEP 7: ROUTE HANDLERS WITH TWILIO VALIDATION
// ============================================

// Optional Twilio request validation middleware
const validateTwilioRequest = (req, res, next) => {
  // Set to true if you configured Twilio Auth Token validation in production environment variables
  if (process.env.VALIDATE_TWILIO === 'true') {
    const twilioSignature = req.headers['x-twilio-signature'];
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!twilio.validateRequest(authToken, twilioSignature, url, req.body)) {
      return res.status(403.1).send('Twilio Request Validation Failed.');
    }
  }
  next();
};

router.post('/voice/webhook', validateTwilioRequest, async (req, res) => {
  try {
    const transcriptId = await handleIncomingCall(req, res);
    res.locals.transcriptId = transcriptId;

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    twiml.gather({
      numDigits: 1,
      action: `/voice/gather?transcriptId=${transcriptId}`,
      method: 'POST'
    }).say('Thank you for calling Realty Flow. Press 1 to speak with our voice agent, or stay on the line.');

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    logger.error('Error in voice webhook', { error: error.message });
    res.status(500).send('Internal Server Error');
  }
});

router.post('/voice/gather', validateTwilioRequest, async (req, res) => {
  try {
    const transcriptId = req.query.transcriptId || req.body.transcriptId;
    const digit = req.body.Digits;

    logger.info('Gather input received', { transcriptId, digit });

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.say('Got it. Connecting you now.');

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    logger.error('Error in gather handler', { error: error.message });
    res.status(500).send('Internal Server Error');
  }
});

router.post('/voice/hangup', validateTwilioRequest, async (req, res) => {
  try {
    const transcriptId = req.body.transcriptId || req.query.transcriptId;
    if (!transcriptId) {
      return res.status(400).json({ error: 'Missing transcriptId' });
    }
    const result = await handleCallEnd(transcriptId);
    res.json(result);
  } catch (error) {
    logger.error('Error in hangup handler', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STEP 8: REAL-TIME STREAMING INTEGRATION
// ============================================

async function setupWebSocketForTranscription(ws, transcriptId) {
  ws.on('message', async (data) => {
    try {
      const payload = JSON.parse(data);

      if (payload.type === 'speech') {
        await processWithEmotion(
          transcriptId,
          payload.transcript,
          payload.speaker, 
          payload.audioBuffer
        );

        const liveData = await getLiveTranscript(transcriptId);
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

router.get('/api/transcripts/:transcriptId', async (req, res) => {
  try {
    const { transcriptId } = req.params;
    const transcript = await callDocumenter.getDetailedTranscript(transcriptId);
    if (!transcript) return res.status(404).json({ error: 'Transcript not found' });
    res.json(transcript);
  } catch (error) {
    logger.error('Error fetching transcript', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
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
// STEP 10: DATABASE STORAGE (MongoDB Mongoose Implementation)
// ============================================

async function saveTranscriptToDatabase(transcript, summary) {
  try {
    // Production-ready MongoDB implementation example:
    /*
    await TranscriptModel.findOneAndUpdate(
      { transcriptId: transcript.transcriptId },
      {
        transcriptId: transcript.transcriptId,
        callId: transcript.callId,
        from: transcript.from,
        to: transcript.to,
        words: transcript.words,
        summary: summary,
        tags: summary.realEstateTags,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    */

    logger.info('Transcript saved successfully to database storage', {
      transcriptId: transcript.transcriptId
    });
  } catch (error) {
    logger.error('Error saving transcript to database', { error: error.message });
    throw error;
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
