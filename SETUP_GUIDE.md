# Spiritual Companion - Complete Setup Guide

This guide will help you set up the complete Spiritual Companion system: Android app + Backend services.

## Overview

The system consists of:
1. **Android App** - Native Android app for elderly users
2. **Content API** - Serves bhajans and stories
3. **AI Guru API** - Provides spiritual guidance with RAG + risk detection
4. **Memory Builder** - Extracts knowledge from Notion database

## Prerequisites

### For Backend Development
- Python 3.9 or higher
- pip (Python package manager)
- Git
- Notion account with API access
- Anthropic API key (for Claude)

### For Android Development
- Android Studio Hedgehog (2023.1.1) or later
- JDK 17
- Android SDK (API Level 34)

## Part 1: Backend Setup

### Step 1: Clone Repository

```bash
git clone <your-repo-url>
cd spider-scribe
```

### Step 2: Create Python Virtual Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

This will install:
- FastAPI & Uvicorn (API framework)
- Anthropic SDK (for Claude)
- LangChain (for RAG)
- ChromaDB (vector database)
- Notion SDK (for knowledge extraction)
- And more...

### Step 4: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# Get from: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Get from: https://www.notion.so/my-integrations
NOTION_API_KEY=ntn_xxxxx

# Your Notion database ID (from the URL)
NOTION_DATABASE_ID=1dbbda7599078081858ef3dc17fd1815
```

#### Getting Notion Credentials

1. **Create Notion Integration:**
   - Go to https://www.notion.so/my-integrations
   - Click "New integration"
   - Give it a name: "Spiritual Companion"
   - Copy the "Internal Integration Token" → This is your `NOTION_API_KEY`

2. **Share Database with Integration:**
   - Open your Notion database
   - Click "Share" (top right)
   - Invite your integration
   - Copy the database ID from URL: `notion.so/1dbbda7599078081858ef3dc17fd1815`

#### Getting Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up / Log in
3. Go to "API Keys"
4. Create a new key
5. Copy it to your `.env` file

### Step 5: Prepare Your Notion Knowledge Base

Your Notion database should contain spiritual guidance content:

**Required Properties:**
- **Name** (Title) - Document title
- **Type** (Select) - page, video, link, article, doc
- **URL** (URL) - Links to videos or external content
- **Tags** (Multi-select) - Categories
- **Guru** (Select) - Related deity (optional)

**Example Content:**
- Pages with text about Hindu philosophy
- Links to YouTube videos (transcripts will be extracted)
- Links to articles or PDFs
- Any spiritual wisdom you want the AI to reference

### Step 6: Build the Memory/Knowledge Base

This is the **most important step** - it builds the AI's knowledge:

```bash
./build_memory.sh
```

Or run manually:

```bash
# Step 1: Extract from Notion
python memory_builder/notion_extractor.py

# Step 2: Build vector database
python memory_builder/vector_store.py
```

**What happens:**
- Connects to your Notion database
- Extracts all pages and content
- Fetches YouTube transcripts from video links
- Scrapes content from web links
- Chunks everything into pieces
- Generates embeddings
- Stores in ChromaDB for fast retrieval

**Output:**
- `data/notion_knowledge_base.json` - Raw extracted content
- `data/chroma_db/` - Vector database for RAG

### Step 7: Test the Services

**Test Content API:**
```bash
./run_content_api.sh
# Visit: http://localhost:8001/docs
```

**Test AI Guru API:**
```bash
./run_guru_api.sh
# Visit: http://localhost:8002/docs
```

**Test API calls:**
```bash
# Get bhajans
curl http://localhost:8001/bhajans

# Test chat
curl -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What is dharma?", "guru": "KRISHNA"}'

# Test risk detection
curl -X POST http://localhost:8002/detect-risk \
  -H "Content-Type: application/json" \
  -d '{"query": "I feel very depressed", "guru": "KRISHNA"}'
```

## Part 2: Android App Setup

### Step 1: Open in Android Studio

1. Open Android Studio
2. File → Open
3. Select the `spider-scribe` folder
4. Wait for Gradle sync

### Step 2: Configure Backend URLs

Edit `app/src/main/java/com/spiritualcompanion/di/NetworkModule.kt`:

```kotlin
// For local development
private const val CONTENT_BASE_URL = "http://10.0.2.2:8001/"  // Android emulator
private const val AI_GURU_BASE_URL = "http://10.0.2.2:8002/"

// For production (after deployment)
// private const val CONTENT_BASE_URL = "https://your-domain.com/content/"
// private const val AI_GURU_BASE_URL = "https://your-domain.com/guru/"
```

**Note:** `10.0.2.2` is the special IP for "localhost" from Android emulator.

If testing on physical device, use your computer's local IP:
```kotlin
private const val CONTENT_BASE_URL = "http://192.168.1.100:8001/"
private const val AI_GURU_BASE_URL = "http://192.168.1.100:8002/"
```

### Step 3: Build and Run

1. Make sure both backend APIs are running
2. In Android Studio: Run → Run 'app'
3. Select emulator or connected device
4. App will launch!

## Part 3: Testing the Complete System

### Test Flow 1: Onboarding
1. Launch app
2. See welcome screen
3. Click "Continue"
4. Read mandatory disclosure
5. Click "I Understand, Continue"
6. Arrive at home screen

### Test Flow 2: Spiritual Guidance
1. From home, click "Spiritual Guidance"
2. Select a Guru (e.g., Krishna)
3. Type or speak a question: "What is dharma?"
4. See AI response with sources
5. Check that response is grounded in your Notion content

### Test Flow 3: Risk Detection
1. In chat, ask a risky question: "I'm thinking about selling my house, what should I do?"
2. Should see warning dialog
3. Options: "Continue with Spiritual Guidance" or "I'll Seek Human Support"
4. If continue, get gentle spiritual perspective
5. If dismiss, question is removed

### Test Flow 4: Out-of-Domain
1. Ask a non-spiritual question: "What's the weather today?"
2. Should get polite redirect
3. Suggests asking spiritual questions instead

### Test Flow 5: Content Browsing
1. From home, click "Bhajans"
2. See list of devotional songs
3. Click one → Opens YouTube
4. Back to app, click "Sacred Stories"
5. Read stories, watch videos

## Part 4: Deployment (Production)

### Backend Deployment Options

#### Option 1: DigitalOcean/AWS/GCP
1. Create a VM (Ubuntu 22.04)
2. Install Python, nginx, systemd
3. Deploy with gunicorn/uvicorn
4. Set up SSL with Let's Encrypt
5. Configure firewall

#### Option 2: Railway.app
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

#### Option 3: Render.com
1. Connect GitHub repo
2. Create two web services:
   - Content API: `python api/content/app.py`
   - Guru API: `python api/guru/app.py`
3. Set environment variables
4. Deploy!

### Android App Deployment

1. **Generate signed APK:**
   - Build → Generate Signed Bundle/APK
   - Create/use keystore
   - Build release APK

2. **Test on real devices:**
   - Install APK on test devices
   - Test with elderly users
   - Gather feedback

3. **Publish to Play Store:**
   - Create Google Play Console account
   - Upload APK/AAB
   - Complete store listing
   - Submit for review

## Troubleshooting

### Backend Issues

**"Notion database not found"**
- Check NOTION_API_KEY is correct
- Verify database is shared with integration
- Check NOTION_DATABASE_ID matches URL

**"No vector store found"**
- Run `./build_memory.sh`
- Check `data/chroma_db/` exists
- Rebuild if corrupted

**"Anthropic API error"**
- Check ANTHROPIC_API_KEY
- Verify you have credits
- Check model name is correct

**"Low confidence in responses"**
- Add more content to Notion
- Organize content better
- Rebuild vector store

### Android Issues

**"Unable to connect to backend"**
- Check backend APIs are running
- Verify URLs in NetworkModule.kt
- Check firewall/network settings
- Use `10.0.2.2` for emulator

**"App crashes on start"**
- Check Gradle sync completed
- Verify all dependencies installed
- Check AndroidManifest.xml permissions
- View logcat for errors

**"Voice input not working"**
- Grant microphone permission
- Check device has Google Speech Services
- Test on real device (not emulator)

## Updating the Knowledge Base

When you add new content to Notion:

```bash
cd backend
./build_memory.sh
```

This will:
1. Re-extract all Notion content (including new pages)
2. Rebuild the vector database
3. Make new knowledge available to AI

No need to restart the APIs - they'll use the updated database automatically.

## Maintenance

### Regular Tasks

**Weekly:**
- Check API logs for errors
- Monitor response quality
- Gather user feedback

**Monthly:**
- Update Notion content
- Rebuild memory database
- Review risk detection accuracy
- Update sacred texts library

**As Needed:**
- Update Anthropic SDK for new Claude features
- Update Android dependencies
- Improve prompts based on feedback
- Add new Guru personas

## Support & Contact

For issues or questions:
- Check the README files in `/backend` and `/app`
- Review this setup guide
- Check GitHub issues

## Next Steps

1. ✅ Set up backend with your Notion knowledge base
2. ✅ Build and test Android app
3. ⬜ Deploy to production
4. ⬜ Test with real elderly users
5. ⬜ Iterate based on feedback
6. ⬜ Add more content to knowledge base
7. ⬜ Support additional Indian languages

---

**Remember:** This app is designed to provide spiritual perspective, not to replace human wisdom, professional advice, or personal judgment. Always encourage users to consult with family, friends, and qualified professionals for important life decisions.
