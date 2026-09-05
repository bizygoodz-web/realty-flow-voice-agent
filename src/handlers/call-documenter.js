const { logger } = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// In-memory call transcript storage (replace with database in production)
const callTranscripts = new Map();

const callDocumenter = {
  /**
   * Create a new call transcript document
   */
  createTranscript: (callId, callData) => {
    try {
      const transcriptId = uuidv4();
      const transcript = {
        transcriptId,
        callId,
        from: callData.from,
        to: callData.to,
        startTime: new Date(),
        endTime: null,
        duration: null,
        words: [],
        emotions: [],
        summary: '',
        status: 'active'
      };

      callTranscripts.set(transcriptId, transcript);
      logger.info('Transcript created', { transcriptId, callId });

      return transcriptId;
    } catch (error) {
      logger.error('Error creating transcript', { error: error.message });
      throw error;
    }
  },

  /**
   * Add a word to the transcript with metadata
   */
  addWord: (transcriptId, wordData) => {
    try {
      const transcript = callTranscripts.get(transcriptId);

      if (!transcript) {
        const error = new Error('Transcript not found');
        error.status = 404;
        throw error;
      }

      const wordEntry = {
        wordId: uuidv4(),
        text: wordData.text,
        speaker: wordData.speaker || 'unknown', // 'caller' or 'agent'
        timestamp: wordData.timestamp || new Date(),
        confidence: wordData.confidence || 1.0,
        emotion: wordData.emotion || 'neutral',
        emotionConfidence: wordData.emotionConfidence || 0,
        sentiment: wordData.sentiment || 'neutral',
        duration: wordData.duration || 0,
        index: transcript.words.length,
        metadata: wordData.metadata || {}
      };

      transcript.words.push(wordEntry);

      logger.debug('Word added to transcript', {
        transcriptId,
        word: wordData.text,
        speaker: wordData.speaker
      });

      return wordEntry;
    } catch (error) {
      logger.error('Error adding word to transcript', { error: error.message });
      throw error;
    }
  },

  /**
   * Add emotion detection to specific word
   */
  updateWordEmotion: (transcriptId, wordIndex, emotion, confidence) => {
    try {
      const transcript = callTranscripts.get(transcriptId);

      if (!transcript) {
        const error = new Error('Transcript not found');
        error.status = 404;
        throw error;
      }

      if (wordIndex < 0 || wordIndex >= transcript.words.length) {
        const error = new Error('Word index out of range');
        error.status = 400;
        throw error;
      }

      const word = transcript.words[wordIndex];
      word.emotion = emotion;
      word.emotionConfidence = confidence;

      logger.debug('Word emotion updated', {
        transcriptId,
        wordIndex,
        emotion,
        confidence
      });

      return word;
    } catch (error) {
      logger.error('Error updating word emotion', { error: error.message });
      throw error;
    }
  },

  /**
   * Get full transcript text
   */
  getTranscriptText: (transcriptId) => {
    try {
      const transcript = callTranscripts.get(transcriptId);

      if (!transcript) {
        const error = new Error('Transcript not found');
        error.status = 404;
        throw error;
      }

      let text = '';
      let currentSpeaker = null;

      transcript.words.forEach(word => {
        if (word.speaker !== currentSpeaker) {
          currentSpeaker = word.speaker;
          text += `\n\n${currentSpeaker.toUpperCase()}: `;
        } else {
          text += ' ';
        }
        text += word.text;
      });

      return text;
    } catch (error) {
      logger.error('Error getting transcript text', { error: error.message });
      throw error;
    }
  },

  /**
   * Get detailed word-by-word transcript
   */
  getDetailedTranscript: (transcriptId) => {
    try {
      const transcript = callTranscripts.get(transcriptId);

      if (!transcript) {
        const error = new Error('Transcript not found');
        error.status = 404;
        throw error;
      }

      return {
        transcriptId: transcript.transcriptId,
        callId: transcript.callId,
        from: transcript.from,
        to: transcript.to,
        startTime: transcript.startTime,
        endTime: transcript.endTime,
        duration: transcript.duration,
        status: transcript.status,
        words: transcript.words,
        totalWords: transcript.words.length,
        emotions: transcript.emotions,
        summary: transcript.summary
      };
    } catch (error) {
      logger.error('Error getting detailed transcript', { error: error.message });
      throw error;
    }
  },

  /**
   * Get transcript by speaker
   */
  getTranscriptBySpeaker: (transcriptId, speaker) => {
    try {
      const transcript = callTranscripts.get(transcriptId);

      if (!transcript) {
        const error = new Error('Transcript not found');
        error.status = 404;
        throw error;
      }

      const speakerWords = transcript.words.filter(
        word => word.speaker.toLowerCase() === speaker.toLowerCase()
      );

      return {
        speaker,
        wordCount: speakerWords.length,
        words: speakerWords,
        text: speakerWords.map(w => w.text).join(' ')
      };
    } catch (error) {
      logger.error('Error getting speaker transcript', { error: error.message });
      throw error;
    }
  },

  /**
   * Get emotion timeline
   */
  getEmotionTimeline: (transcriptId) => {
    try {
      const transcript = callTranscripts.get(transcriptId);

      if (!transcript) {
        const error = new Error('Transcript not found');
        error.status = 404;
        throw error;
      }

      const timeline = [];
      let currentEmotion = null;
      let emotionStart = 0;
      let emotionWords = [];

      transcript.words.forEach((word, index) => {
        if (word.emotion !== currentEmotion) {
          if (currentEmotion) {
            timeline.push({
              emotion: currentEmotion,
              startIndex: emotionStart,
              endIndex: index - 1,
              wordCount: emotionWords.length,
              words: emotionWords,
              text: emotionWords.map(w => w.text).join(' ')
            });
          }
          currentEmotion = word.emotion;
          emotionStart = index;
          emotionWords = [word];
        } else {
          emotionWords.push(word);
        }
      });

      // Add last emotion block
      if (currentEmotion) {
        timeline.push({
          emotion: currentEmotion,
          startIndex: emotionStart,
          endIndex: transcript.words.length - 1,
          wordCount: emotionWords.length,
          words: emotionWords,
          text: emotionWords.map(w => w.text).join(' ')
        });
      }

      return timeline;
    } catch (error) {
      logger.error('Error getting emotion timeline', { error: error.message });
      throw error;
    }
  },

  /**
   * Generate transcript summary
   */
  generateSummary: (transcriptId) => {
    try {
      const transcript = callTranscripts.get(transcriptId);

      if (!transcript) {
        const error = new Error('Transcript not found');
        error.status = 404;
        throw error;
      }

      const fullText = callDocumenter.getTranscriptText(transcriptId);
      const emotionTimeline = callDocumenter.getEmotionTimeline(transcriptId);
      const callerWords = callDocumenter.getTranscriptBySpeaker(transcriptId, 'caller');
      const agentWords = callDocumenter.getTranscriptBySpeaker(transcriptId, 'agent');

      const summary = {
        callId: transcript.callId,
        totalWords: transcript.words.length,
        callerWordCount: callerWords.wordCount,
        agentWordCount: agentWords.wordCount,
        duration: transcript.duration,
        primaryEmotion: emotionTimeline.length > 0 ? emotionTimeline[0].emotion : 'neutral',
        emotionProgression: emotionTimeline.map(e => ({
          emotion: e.emotion,
          wordCount: e.wordCount
        })),
        fullText: fullText,
        timestamp: new Date()
      };

      transcript.summary = summary;

      logger.info('Transcript summary generated', { transcriptId });

      return summary;
    } catch (error) {
      logger.error('Error generating summary', { error: error.message });
      throw error;
    }
  },

  /**
   * Close transcript and finalize
   */
  closeTranscript: (transcriptId) => {
    try {
      const transcript = callTranscripts.get(transcriptId);

      if (!transcript) {
        const error = new Error('Transcript not found');
        error.status = 404;
        throw error;
      }

      transcript.endTime = new Date();
      transcript.duration = Math.floor((transcript.endTime - transcript.startTime) / 1000);
      transcript.status = 'closed';

      // Generate summary
      callDocumenter.generateSummary(transcriptId);

      logger.info('Transcript closed', {
        transcriptId,
        duration: transcript.duration,
        wordCount: transcript.words.length
      });

      return transcript;
    } catch (error) {
      logger.error('Error closing transcript', { error: error.message });
      throw error;
    }
  }
};

module.exports = callDocumenter;
