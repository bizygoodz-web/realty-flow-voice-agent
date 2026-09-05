const fs = require('fs');
const path = require('path');

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FORMAT = process.env.LOG_FORMAT || 'json';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = levels[LOG_LEVEL] || levels.info;

const formatLog = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  
  if (LOG_FORMAT === 'json') {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...data
    });
  }
  
  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${Object.keys(data).length > 0 ? JSON.stringify(data) : ''}`;
};

const logger = {
  error: (message, data) => {
    if (levels.error <= currentLevel) {
      console.error(formatLog('error', message, data));
    }
  },
  warn: (message, data) => {
    if (levels.warn <= currentLevel) {
      console.warn(formatLog('warn', message, data));
    }
  },
  info: (message, data) => {
    if (levels.info <= currentLevel) {
      console.log(formatLog('info', message, data));
    }
  },
  debug: (message, data) => {
    if (levels.debug <= currentLevel) {
      console.debug(formatLog('debug', message, data));
    }
  }
};

module.exports = { logger };
