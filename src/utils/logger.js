const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const LOG_LEVEL_PRIORITY = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor(name, level = process.env.LOG_LEVEL || 'info') {
    this.name = name;
    this.level = level.toUpperCase();
    this.logFile = path.join(logsDir, 'app.log');
  }

  /**
   * Format log message
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
    return `[${timestamp}] [${level}] [${this.name}] ${message} ${metaStr}`;
  }

  /**
   * Write log to file
   */
  writeToFile(message) {
    try {
      fs.appendFileSync(this.logFile, message + '\n', 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Check if level should be logged
   */
  shouldLog(level) {
    const currentPriority = LOG_LEVEL_PRIORITY[this.level] || LOG_LEVEL_PRIORITY.INFO;
    const messagePriority = LOG_LEVEL_PRIORITY[level] || LOG_LEVEL_PRIORITY.INFO;
    return messagePriority <= currentPriority;
  }

  /**
   * Log error
   */
  error(message, meta = {}) {
    if (this.shouldLog('ERROR')) {
      const formatted = this.formatMessage(LOG_LEVELS.ERROR, message, meta);
      console.error(formatted);
      this.writeToFile(formatted);
    }
  }

  /**
   * Log warning
   */
  warn(message, meta = {}) {
    if (this.shouldLog('WARN')) {
      const formatted = this.formatMessage(LOG_LEVELS.WARN, message, meta);
      console.warn(formatted);
      this.writeToFile(formatted);
    }
  }

  /**
   * Log info
   */
  info(message, meta = {}) {
    if (this.shouldLog('INFO')) {
      const formatted = this.formatMessage(LOG_LEVELS.INFO, message, meta);
      console.log(formatted);
      this.writeToFile(formatted);
    }
  }

  /**
   * Log debug
   */
  debug(message, meta = {}) {
    if (this.shouldLog('DEBUG')) {
      const formatted = this.formatMessage(LOG_LEVELS.DEBUG, message, meta);
      console.log(formatted);
      this.writeToFile(formatted);
    }
  }
}

// Create default logger instance
const logger = new Logger('App');

module.exports = {
  Logger,
  logger,
  createLogger: (name) => new Logger(name)
};
