const twilio = require('twilio');
const { logger } = require('../utils/logger');
const { matchEmotionResponse, buildEmotionReply, getEmotionProfile } = require('../utils/emotion-mapper');
const emotionDetector = require('./emotion-detector');
const { v4: uuidv4 } = require('uuid');

const VoiceResponse = twilio.twiml.VoiceResponse;
const callStorage = new Map();

const safeCallData = (callData = {}) => ({
  From: callData.From || callData.from || 'Unknown',
  To: callData.To || callData.to || 'Unknown',
  CallSid: callData.CallSid || callData.callSid || uuidv4(),
  SpeechResult: callData.SpeechResult || callData.speechResult || '',
  emotion: callData.emotion || 'neutral'
});

const voiceHandler = {
  /**
   * Handle incoming voice call.
   */
  handleIncomingCall: async (callData = {}) => {
    try {
      const normalizedCall = safeCallData(callData);
      const callId = uuidv4();
      const twiml = new VoiceResponse();

      callStorage.set(callId, {
        callId,
        from: normalizedCall.From,
        to: normalizedCall.To,
        callSid: normalizedCall.CallSid,
        startTime: new Date(),
        status: 'active',
        lastEmotion: normalizedCall.emotion
      });

      logger.info('Call initiated', { callId, from: normalizedCall.From, to: normalizedCall.To });

      const greeting = buildEmotionReply(normalizedCall.emotion, 'Welcome to Realty Flow. We help with home buying, selling and rentals.');
      twiml.say(greeting, { voice: 'alice' });
      twiml.pause({ length: 1 });
      twiml.gather({
        input: 'speech dtmf',
        method: 'POST',
        timeout: 5,
        speechTimeout: '2',
        action: '/api/voice/response',
        finishOnKey: '#'
      }).say('Tell me whether you want to buy, sell, or rent a property today.');

      return twiml.toString();
    } catch (error) {
      logger.error('Error handling incoming call', { error: error.message });
      throw error;
    }
  },

  /**
   * Handle an incoming voice response after gather.
   */
  handleSpeechResponse: async (requestData = {}) => {
    try {
      const transcript = requestData.SpeechResult || requestData.transcript || requestData.text || 'Hello';
      const emotionResult = await emotionDetector.detectEmotion({ text: transcript });
      const matched = matchEmotionResponse(emotionResult.emotion, buildEmotionReply(emotionResult.emotion, transcript));

      const twiml = new VoiceResponse();
      twiml.say(matched.response, { voice: 'alice' });
      twiml.pause({ length: 1 });
      twiml.say('I can help with buying, selling, or renting a property. Please tell me which service you need next.', { voice: 'alice' });
      twiml.hangup();

      return twiml.toString();
    } catch (error) {
      logger.error('Error handling speech response', { error: error.message });
      const fallback = new VoiceResponse();
      fallback.say('Thanks for calling Realty Flow. I can help with property buying, selling, or rentals. Please call back anytime.', { voice: 'alice' });
      fallback.hangup();
      return fallback.toString();
    }
  },

  /**
   * Process call recording.
   */
  processRecording: async (recordingData = {}) => {
    try {
      const { CallSid, RecordingUrl } = recordingData;
      logger.info('Processing recording', { CallSid, recordingUrl: RecordingUrl });

      const callId = Array.from(callStorage.entries())
        .find(([, call]) => call.callSid === CallSid)?.[0];

      if (callId) {
        const call = callStorage.get(callId);
        call.recordingUrl = RecordingUrl;
        call.endTime = new Date();
        call.status = 'completed';
        logger.info('Call recording stored', { callId, duration: call.endTime - call.startTime });
      }

      return { status: 'success', callSid: CallSid };
    } catch (error) {
      logger.error('Error processing recording', { error: error.message });
      throw error;
    }
  },

  /**
   * Get call history.
   */
  getCallHistory: async (limit = 10, offset = 0) => {
    try {
      const numericLimit = Number(limit) || 10;
      const numericOffset = Number(offset) || 0;

      const calls = Array.from(callStorage.values())
        .sort((a, b) => b.startTime - a.startTime)
        .slice(numericOffset, numericOffset + numericLimit);

      return {
        total: callStorage.size,
        limit: numericLimit,
        offset: numericOffset,
        calls
      };
    } catch (error) {
      logger.error('Error retrieving call history', { error: error.message });
      throw error;
    }
  },

  /**
   * Get a specific call by ID.
   */
  getCallDetails: async (callId) => {
    try {
      const call = callStorage.get(callId);

      if (!call) {
        const error = new Error('Call not found');
        error.status = 404;
        throw error;
      }

      return call;
    } catch (error) {
      logger.error('Error retrieving call details', { error: error.message });
      throw error;
    }
  }
};

module.exports = voiceHandler;
