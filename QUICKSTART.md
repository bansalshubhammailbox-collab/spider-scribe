# Quick Start Guide - Spiritual Companion

Get up and running in 5 steps!

## Prerequisites

- Python 3.9+
- Android Studio
- Anthropic API key
- Notion API key

## Backend Setup (5 minutes)

### 1. Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure API Keys

```bash
cp .env.example .env
```

Edit `.env`:
```
ANTHROPIC_API_KEY=your_key_here
NOTION_API_KEY=your_key_here
NOTION_DATABASE_ID=your_database_id
```

### 3. Build Knowledge Base

```bash
./build_memory.sh
```

This extracts content from your Notion database and builds the AI's memory.

### 4. Start Services

**Terminal 1 - Content API:**
```bash
./run_content_api.sh
```

**Terminal 2 - AI Guru API:**
```bash
./run_guru_api.sh
```

### 5. Test APIs

```bash
# Test content
curl http://localhost:8001/bhajans

# Test AI chat
curl -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What is dharma?", "guru": "KRISHNA"}'
```

## Android App Setup (3 minutes)

### 1. Open in Android Studio

Open the `spider-scribe` folder in Android Studio.

### 2. Update API URLs

Edit `app/src/main/java/com/spiritualcompanion/di/NetworkModule.kt`:

```kotlin
private const val CONTENT_BASE_URL = "http://10.0.2.2:8001/"
private const val AI_GURU_BASE_URL = "http://10.0.2.2:8002/"
```

### 3. Run

Click the "Run" button (▶️) in Android Studio!

## Test the App

1. **Onboarding**: See welcome + mandatory disclosure
2. **Home**: Three main options
3. **Chat**: Select a Guru, ask spiritual questions
4. **Bhajans**: Browse devotional songs
5. **Stories**: Read sacred stories

## What You Get

✅ Voice-first spiritual guidance
✅ 6 Guru personas (Krishna, Shiva, Rama, Durga, Ganesha, Hanuman)
✅ RAG-powered responses from your Notion knowledge base
✅ Risk detection for sensitive questions
✅ Elderly-friendly UI (large text, high contrast)
✅ Devotional content (bhajans & stories)

## Troubleshooting

**"Notion database not found"**
→ Check your NOTION_API_KEY and NOTION_DATABASE_ID
→ Make sure database is shared with your integration

**"Can't connect to backend"**
→ Make sure both APIs are running
→ Use `10.0.2.2` for Android emulator
→ Use your local IP for physical devices

**"Low quality responses"**
→ Add more content to your Notion knowledge base
→ Rebuild with `./build_memory.sh`

## Next Steps

- Read [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed instructions
- Read [backend/README.md](backend/README.md) for API documentation
- Check the Notion database structure requirements
- Add more spiritual content to improve AI responses
- Test with elderly users and gather feedback

---

**Need help?** Check the full documentation or raise an issue on GitHub.
