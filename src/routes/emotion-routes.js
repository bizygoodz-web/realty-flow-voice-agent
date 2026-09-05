const express = require('express');
const router = express.Router();
const emotionDetector = require('../handlers/emotion-detector');
const { logger } = require('../utils/logger');

/**
 * Analyze emotion from audio or text
 */
router.post('/analyze', async (req, res) => {
  try {
    const { audio, text, audioUrl } = req.body;
    
    if (!audio && !text && !audioUrl) {
      return res.status(400).json({ error: 'Audio or text input required' });
    }
    
    const emotion = await emotionDetector.detectEmotion({
      audio,
      text,
      audioUrl
    });
    
    res.json(emotion);
  } catch (error) {
    logger.error('Error analyzing emotion', { error: error.message });
    res.status(500).json({ error: 'Failed to analyze emotion' });
  }
});

/**
 * Get emotion statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    const stats = await emotionDetector.getEmotionStats(timeRange);
    res.json(stats);
  } catch (error) {
    logger.error('Error retrieving emotion stats', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve emotion stats' });
  }
});

module.exports = router;
