const axios = require('axios');
const { logger } = require('../utils/logger');
const { getEmotionProfile } = require('../utils/emotion-mapper');

// In-memory emotion storage (replace with database in production)
const emotionHistory = [];

const emotionDetector = {
  /**
   * Detect emotion from audio or text
   */
  detectEmotion: async (input) => {
    try {
      const { audio, text, audioUrl } = input;
      let detectedEmotion = 'neutral';
      let confidence = 0;

      if (audio || audioUrl) {
        // Call external emotion detection API for audio
        const audioResult = await emotionDetector.detectFromAudio(audio || audioUrl);
        detectedEmotion = audioResult.emotion;
        confidence = audioResult.confidence;
      } else if (text) {
        // Detect emotion from text
        const textResult = await emotionDetector.detectFromText(text);
        detectedEmotion = textResult.emotion;
        confidence = textResult.confidence;
      }

      const emotionData = {
        emotion: detectedEmotion,
        confidence,
        profile: getEmotionProfile(detectedEmotion),
        timestamp: new Date(),
        input: text ? 'text' : 'audio'
      };

      // Store in history
      emotionHistory.push(emotionData);

      logger.info('Emotion detected', {
        emotion: detectedEmotion,
        confidence
      });

      return emotionData;
    } catch (error) {
      logger.error('Error detecting emotion', { error: error.message });
      throw error;
    }
  },

  /**
   * Detect emotion from audio
   */
  detectFromAudio: async (audioInput) => {
    try {
      // Integration with external emotion detection service (e.g., Azure, Google, AWS)
      // This is a placeholder implementation
      const response = await axios.post(
        process.env.EMOTION_API_ENDPOINT,
        { audio: audioInput },
        {
          headers: {
            'Authorization': `Bearer ${process.env.EMOTION_API_KEY}`
          }
        }
      );

      return {
        emotion: response.data.emotion || 'neutral',
        confidence: response.data.confidence || 0.5
      };
    } catch (error) {
      logger.warn('Error calling emotion API, using default', { error: error.message });
      return {
        emotion: 'neutral',
        confidence: 0
      };
    }
  },

  /**
   * Detect emotion from text
   */
  detectFromText: async (text) => {
    try {
      // Simple keyword-based emotion detection (placeholder)
      const emotionKeywords = {
        happy: ['happy', 'great', 'wonderful', 'excellent', 'love', 'amazing'],
        frustrated: ['frustrated', 'annoyed', 'irritated', 'upset', 'angry'],
        anxious: ['worried', 'anxious', 'nervous', 'scared', 'concerned'],
        satisfied: ['satisfied', 'pleased', 'good', 'fine', 'okay'],
        angry: ['angry', 'furious', 'hate', 'disgusted', 'mad']
      };

      const lowerText = text.toLowerCase();
      let detectedEmotion = 'neutral';
      let maxMatches = 0;

      for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
        const matches = keywords.filter(keyword => lowerText.includes(keyword)).length;
        if (matches > maxMatches) {
          maxMatches = matches;
          detectedEmotion = emotion;
        }
      }

      const confidence = maxMatches > 0 ? Math.min(maxMatches * 0.2, 0.95) : 0.5;

      return {
        emotion: detectedEmotion,
        confidence
      };
    } catch (error) {
      logger.error('Error detecting emotion from text', { error: error.message });
      throw error;
    }
  },

  /**
   * Get emotion statistics
   */
  getEmotionStats: async (timeRange = '24h') => {
    try {
      const now = new Date();
      let startTime;

      if (timeRange === '24h') {
        startTime = new Date(now - 24 * 60 * 60 * 1000);
      } else if (timeRange === '7d') {
        startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
      } else if (timeRange === '30d') {
        startTime = new Date(now - 30 * 24 * 60 * 60 * 1000);
      }

      const filtered = emotionHistory.filter(e => e.timestamp >= startTime);
      const emotionCounts = {};

      filtered.forEach(entry => {
        emotionCounts[entry.emotion] = (emotionCounts[entry.emotion] || 0) + 1;
      });

      const total = filtered.length;
      const distribution = {};

      for (const [emotion, count] of Object.entries(emotionCounts)) {
        distribution[emotion] = {
          count,
          percentage: total > 0 ? ((count / total) * 100).toFixed(2) : 0
        };
      }

      return {
        timeRange,
        total,
        distribution,
        startTime,
        endTime: now
      };
    } catch (error) {
      logger.error('Error retrieving emotion stats', { error: error.message });
      throw error;
    }
  }
};

module.exports = emotionDetector;
