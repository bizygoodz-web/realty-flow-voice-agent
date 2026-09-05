# Realty Flow Voice Agent

A voice agent system that accepts incoming calls and responds with emotion-aware replies, matching the caller's emotional tone.

## Features

- 🎤 **Voice Call Handling**: Accept and process incoming voice calls
- 😊 **Emotion Detection**: Analyze caller emotion in real-time
- 💬 **Emotion-Matched Responses**: Reply with appropriate emotional tone
- 🏠 **Real Estate Focused**: Tailored for Realty Flow operations
- 📊 **Call Analytics**: Track sentiment and interaction patterns

## Tech Stack

- **Voice API**: Twilio/Voiceflow (to be configured)
- **Emotion Detection**: Speech-to-Text + Sentiment Analysis
- **Backend**: Node.js/Python (to be selected)
- **Database**: PostgreSQL/MongoDB (to be selected)

## Project Structure

```
realty-flow-voice-agent/
├── src/
│   ├── voice-handler/       # Incoming call handling
│   ├── emotion-detection/   # Emotion analysis module
│   ├── response-engine/     # Emotion-matched response generation
│   └── utils/               # Helper utilities
├── config/                  # Configuration files
├── tests/                   # Test suite
└── docs/                    # Documentation
```

## Getting Started

### Prerequisites

- Node.js 16+ or Python 3.8+
- Twilio account (or alternative voice provider)
- API keys for emotion detection service

### Installation

```bash
git clone https://github.com/bizygoodz-web/realty-flow-voice-agent.git
cd realty-flow-voice-agent
npm install  # or pip install -r requirements.txt
```

### Configuration

1. Copy `.env.example` to `.env`
2. Add your API credentials
3. Configure voice provider settings

### Running the Agent

```bash
npm start  # or python main.py
```

## Architecture

### Call Flow

1. **Incoming Call** → Twilio webhook
2. **Audio Capture** → Convert to text + analyze emotion
3. **Emotion Detection** → Determine caller sentiment
4. **Response Generation** → Create empathetic response
5. **Voice Reply** → Send audio response with matched emotion

### Emotion Levels

- 😢 Sad/Frustrated
- 😐 Neutral
- 😊 Happy/Satisfied
- 😠 Angry/Upset
- 😨 Anxious/Worried

## API Endpoints

- `POST /call/incoming` - Handle incoming calls
- `POST /call/emotion` - Analyze emotion from audio
- `POST /call/response` - Generate emotion-matched response
- `GET /call/history` - Retrieve call history

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
