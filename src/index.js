require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const voiceRoutes = require('./routes/voice-routes');
const emotionRoutes = require('./routes/emotion-routes');
const { logger } = require('./utils/logger');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/voice', voiceRoutes);
app.use('/api/emotion', emotionRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'realty-flow-voice-agent'
  });
});

app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    status: err.status || 500
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const startServer = () => {
  app.listen(PORT, () => {
    logger.info(`Voice Agent server running on port ${PORT}`);
  });
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
