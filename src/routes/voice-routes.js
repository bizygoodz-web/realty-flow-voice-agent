const express = require('express');
const router = express.Router();
const voiceHandler = require('../handlers/voice-handler');
const { logger } = require('../utils/logger');

/**
 * Handle incoming voice calls
 */
router.post('/incoming', async (req, res) => {
  try {
    logger.info('Incoming call received', { from: req.body.From });
    const twimlResponse = await voiceHandler.handleIncomingCall(req.body);
    res.type('text/xml');
    res.send(twimlResponse);
  } catch (error) {
    logger.error('Error handling incoming call', { error: error.message });
    res.status(500).json({ error: 'Failed to handle incoming call' });
  }
});

/**
 * Handle call recording webhook
 */
router.post('/recording', async (req, res) => {
  try {
    logger.info('Call recording received', { callSid: req.body.CallSid });
    await voiceHandler.processRecording(req.body);
    res.json({ status: 'success' });
  } catch (error) {
    logger.error('Error processing recording', { error: error.message });
    res.status(500).json({ error: 'Failed to process recording' });
  }
});

/**
 * Get call history
 */
router.get('/history', async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    const history = await voiceHandler.getCallHistory(limit, offset);
    res.json(history);
  } catch (error) {
    logger.error('Error retrieving call history', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve call history' });
  }
});

/**
 * Get specific call details
 */
router.get('/:callId', async (req, res) => {
  try {\n    const callDetails = await voiceHandler.getCallDetails(req.params.callId);
    res.json(callDetails);
  } catch (error) {
    logger.error('Error retrieving call details', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve call details' });
  }
});

module.exports = router;
