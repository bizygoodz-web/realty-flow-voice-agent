const axios = require('axios');
const { logger } = require('../utils/logger');
const { getEmotionProfile } = require('../utils/emotion-mapper');

const DEFAULT_EMOTION = 'neutral';
const emotionHistory = [];

const normalizeEmotion = (value = DEFAULT_EMOTION) => {
  const normalized = String(value || DEFAULT_EMOTION).trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call({ happy: true, frustrated: true, anxious: true, satisfied: true, angry: true, neutral: true }, normalized)
    ? normalized
    : DEFAULT_EMOTION;
};

const emotionDetector = {
  /**
   * Detect emotion from audio or text.
   */
  detectEmotion: async (input = {}) => {
    try {
      const { audio, text, audioUrl } = input;
      let detectedEmotion = DEFAULT_EMOTION;
      let confidence = 0.5;

      if (audio || audioUrl) {
        const audioResult = await emotionDetector.detectFromAudio(audio || audioUrl);
        detectedEmotion = audioResult.emotion;
        confidence = audioResult.confidence;
      } else if (text) {
        const textResult = await emotionDetector.detectFromText(text);
        detectedEmotion = textResult.emotion;
        confidence = textResult.confidence;
      }

      const normalizedEmotion = normalizeEmotion(detectedEmotion);
      const emotionData = {
        emotion: normalizedEmotion,
        confidence: Number(confidence) || 0.5,
        profile: getEmotionProfile(normalizedEmotion),
        timestamp: new Date(),
        input: text ? 'text' : 'audio'
      };

      emotionHistory.push(emotionData);

      logger.info('Emotion detected', {
        emotion: normalizedEmotion,
        confidence: emotionData.confidence
      });

      return emotionData;
    } catch (error) {
      logger.error('Error detecting emotion', { error: error.message });
      throw error;
    }
  },

  /**
   * Detect emotion from audio.
   */
  detectFromAudio: async (audioInput) => {
    try {
      if (!process.env.EMOTION_API_ENDPOINT) {
        return {
          emotion: DEFAULT_EMOTION,
          confidence: 0.5
        };
      }

      const response = await axios.post(
        process.env.EMOTION_API_ENDPOINT,
        { audio: audioInput },
        {
          headers: {
            Authorization: `Bearer ${process.env.EMOTION_API_KEY || ''}`
          },
          timeout: 10000
        }
      );

      return {
        emotion: normalizeEmotion(response.data?.emotion || DEFAULT_EMOTION),
        confidence: Number(response.data?.confidence) || 0.5
      };
    } catch (error) {
      logger.warn('Error calling emotion API, using default', { error: error.message });
      return {
        emotion: DEFAULT_EMOTION,
        confidence: 0.5
      };
    }
  },

  /**
   * Detect emotion from text using a keyword match strategy.
   */
  detectFromText: async (text) => {
    try {
      if (!text || !String(text).trim()) {
        return {
          emotion: DEFAULT_EMOTION,
          confidence: 0.5
        };
      }

      const emotionKeywords = {
        happy: ['happy', 'great', 'wonderful', 'excellent', 'love', 'amazing', 'good', 'pleased', 'excited'],
        frustrated: ['frustrated', 'annoyed', 'irritated', 'upset', 'angry', 'fed up', 'tired', 'disappointed'],
        anxious: ['worried', 'anxious', 'nervous', 'scared', 'concerned', 'afraid', 'stressed'],
        satisfied: ['satisfied', 'pleased', 'good', 'fine', 'okay', 'comfortable', 'confident', 'content'],
        angry: ['angry', 'furious', 'hate', 'disgusted', 'mad', 'rage']
      };

      const lowerText = String(text).toLowerCase();
      let detectedEmotion = DEFAULT_EMOTION;
      let maxMatches = 0;

      for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
        const matches = keywords.filter(keyword => lowerText.includes(keyword)).length;
        if (matches > maxMatches) {
          maxMatches = matches;
          detectedEmotion = emotion;
        }
      }

      if (maxMatches === 0) {
        const neutralSignals = ['hello', 'hi', 'thanks', 'thank you', 'okay', 'fine', 'morning', 'evening'];
        const neutralMatches = neutralSignals.filter(signal => lowerText.includes(signal)).length;
        detectedEmotion = neutralMatches > 0 ? DEFAULT_EMOTION : DEFAULT_EMOTION;
      }

      const confidence = maxMatches > 0 ? Math.min(maxMatches * 0.2, 0.95) : 0.5;

      return {
        emotion: normalizeEmotion(detectedEmotion),
        confidence
      };
    } catch (error) {
      logger.error('Error detecting emotion from text', { error: error.message });
      throw error;
    }
  },

  /**
   * Get emotion statistics.
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
      } else {
        startTime = new Date(now - 24 * 60 * 60 * 1000);
      }

      const filtered = emotionHistory.filter(entry => entry.timestamp >= startTime);
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
