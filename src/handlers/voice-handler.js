const twilio = require('twilio');
const { logger } = require('../utils/logger');
const { matchEmotionResponse } = require('../utils/emotion-mapper');
const { v4: uuidv4 } = require('uuid');

const VoiceResponse = twilio.twiml.VoiceResponse;

// In-memory call storage (replace with database in production)
const callStorage = new Map();

const voiceHandler = {
  /**
   * Handle incoming voice call
   */
  handleIncomingCall: async (callData) => {
    try {
      const callId = uuidv4();
      const twiml = new VoiceResponse();
      
      // Store call metadata
      callStorage.set(callId, {
        callId,
        from: callData.From,
        to: callData.To,
        callSid: callData.CallSid,
        startTime: new Date(),
        status: 'active'
      });
      
      logger.info('Call initiated', { callId, from: callData.From });
      
      // Welcome message
      twiml.say('Welcome to Realty Flow. How can I help you today?');
      
      // Record the call
      twiml.record({
        action: '/api/voice/recording',
        method: 'POST',
        recordingStatusCallback: '/api/voice/recording',
        maxLength: 3600,
        playBeep: true,
        timeout: 5
      });
      
      return twiml.toString();
    } catch (error) {
      logger.error('Error handling incoming call', { error: error.message });
      throw error;
    }
  },

  /**
   * Process call recording
   */
  processRecording: async (recordingData) => {
    try {
      const { CallSid, RecordingUrl } = recordingData;
      
      logger.info('Processing recording', { CallSid, recordingUrl: RecordingUrl });
      
      // Update call with recording
      const callId = Array.from(callStorage.entries())
        .find(([, call]) => call.callSid === CallSid)?.[0];
      
      if (callId) {
        const call = callStorage.get(callId);
        call.recordingUrl = RecordingUrl;
        call.endTime = new Date();
        call.status = 'completed';
        
        logger.info('Call recording stored', { callId, duration: call.endTime - call.startTime });
      }
    } catch (error) {
      logger.error('Error processing recording', { error: error.message });
      throw error;
    }
  },

  /**
   * Get call history
   */
  getCallHistory: async (limit = 10, offset = 0) => {
    try {
      const calls = Array.from(callStorage.values())
        .sort((a, b) => b.startTime - a.startTime)
        .slice(offset, offset + limit);
      
      return {
        total: callStorage.size,
        limit,
        offset,
        calls
      };
    } catch (error) {
      logger.error('Error retrieving call history', { error: error.message });
      throw error;
    }
  },

  /**
   * Get specific call details
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
