/**
 * Maps emotion detection results to response strategies
 */

const emotionMap = {
  happy: {
    level: 5,
    name: 'Happy',
    emoji: '😊',
    tone: 'upbeat',
    responseStyle: 'enthusiastic',
    keyPhrases: ['That\'s great!', 'Wonderful!', 'Excited to help!']
  },
  satisfied: {
    level: 4,
    name: 'Satisfied',
    emoji: '😌',
    tone: 'positive',
    responseStyle: 'professional',
    keyPhrases: ['I\'m glad', 'Pleased to assist', 'Happy to help']
  },
  neutral: {
    level: 3,
    name: 'Neutral',
    emoji: '😐',
    tone: 'balanced',
    responseStyle: 'professional',
    keyPhrases: ['I understand', 'Let me help', 'Here\'s what I can do']
  },
  frustrated: {
    level: 2,
    name: 'Frustrated',
    emoji: '😕',
    tone: 'empathetic',
    responseStyle: 'supportive',
    keyPhrases: ['I understand your concern', 'I\'m here to help', 'Let me resolve this']
  },
  angry: {
    level: 1,
    name: 'Angry',
    emoji: '😠',
    tone: 'calm',
    responseStyle: 'apologetic',
    keyPhrases: ['I sincerely apologize', 'Your concern is important', 'Let me make this right']
  },
  anxious: {
    level: 2,
    name: 'Anxious',
    emoji: '😨',
    tone: 'reassuring',
    responseStyle: 'supportive',
    keyPhrases: ['Don\'t worry', 'I\'ve got this', 'Everything will be fine']
  }
};

const getEmotionProfile = (emotion) => {
  return emotionMap[emotion.toLowerCase()] || emotionMap.neutral;
};

const matchEmotionResponse = (detectedEmotion, responseText) => {
  const profile = getEmotionProfile(detectedEmotion);
  return {
    emotion: detectedEmotion,
    profile,
    response: responseText,
    tone: profile.tone,
    style: profile.responseStyle
  };
};

module.exports = {
  emotionMap,
  getEmotionProfile,
  matchEmotionResponse
};
