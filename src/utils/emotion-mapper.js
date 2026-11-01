const emotionMap = {
  happy: {
    level: 5,
    name: 'Happy',
    emoji: '😊',
    tone: 'upbeat',
    responseStyle: 'enthusiastic',
    keyPhrases: ["That's great!", 'Wonderful!', 'Excited to help!']
  },
  satisfied: {
    level: 4,
    name: 'Satisfied',
    emoji: '😌',
    tone: 'positive',
    responseStyle: 'professional',
    keyPhrases: ["I'm glad", 'Pleased to assist', 'Happy to help']
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
    keyPhrases: ['I understand your concern', "I'm here to help", 'Let me resolve this']
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
    keyPhrases: ["Don't worry", "I've got this", 'Everything will be fine']
  }
};

const normalizeEmotion = (emotion = 'neutral') => String(emotion || 'neutral').trim().toLowerCase();

const getEmotionProfile = (emotion = 'neutral') => {
  const key = normalizeEmotion(emotion);
  return emotionMap[key] || emotionMap.neutral;
};

const buildEmotionReply = (detectedEmotion = 'neutral', context = '') => {
  const profile = getEmotionProfile(detectedEmotion);
  const phrase = profile.keyPhrases[Math.floor(Math.random() * profile.keyPhrases.length)] || 'I understand.';
  const lookupText = String(context || '').toLowerCase();
  const propertyContext = /home|buy|sell|rent|property|mortgage|loan|listing/.test(lookupText)
    ? ' I can help with your real estate goals today.'
    : '';

  return `${phrase}${propertyContext}`.trim();
};

const matchEmotionResponse = (detectedEmotion = 'neutral', responseText = '') => {
  const normalized = normalizeEmotion(detectedEmotion);
  const profile = getEmotionProfile(normalized);

  return {
    emotion: normalized,
    profile,
    response: responseText || buildEmotionReply(normalized),
    tone: profile.tone,
    style: profile.responseStyle
  };
};

module.exports = {
  emotionMap,
  getEmotionProfile,
  buildEmotionReply,
  matchEmotionResponse
};
