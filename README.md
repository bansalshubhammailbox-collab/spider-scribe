# Spiritual Companion

A complete spiritual guidance system for elderly users in India, combining an Android app with AI-powered backend services.

## 🚀 Quick Start

**Want to get started quickly?** See [QUICKSTART.md](QUICKSTART.md)

**Need detailed setup instructions?** See [SETUP_GUIDE.md](SETUP_GUIDE.md)

## 📖 Overview

This project provides a high-guardrail spiritual companion system consisting of:

1. **Android App** - Native mobile app with voice-first interface for elderly users
2. **Backend Services** - AI-powered APIs providing spiritual guidance with RAG
3. **Memory Builder** - Extracts and processes spiritual knowledge from Notion database

### Key Features

- ✅ **6 Guru Personas**: Krishna, Shiva, Rama, Durga, Ganesha, Hanuman
- ✅ **Voice-First Interface**: Hindi speech-to-text for accessibility
- ✅ **RAG-Powered Guidance**: Grounded in sacred texts from your Notion knowledge base
- ✅ **Safety Guardrails**: Risk detection for sensitive questions
- ✅ **Devotional Content**: Bhajans (songs) and sacred stories
- ✅ **Elderly-Friendly UI**: Large text (18-42sp), high contrast, simple navigation
- ✅ **Multi-Language Support**: English, Hindi (expandable)

## 🏗️ System Architecture

```
┌─────────────────────┐
│   Android App       │
│  (Jetpack Compose)  │
└──────────┬──────────┘
           │
           ├─────────────────────┬──────────────────────┐
           │                     │                      │
           ▼                     ▼                      ▼
    ┌─────────────┐      ┌─────────────┐      ┌──────────────┐
    │ Content API │      │ AI Guru API │      │ Memory       │
    │ (FastAPI)   │      │ (FastAPI)   │      │ Builder      │
    │             │      │             │      │              │
    │ • Bhajans   │      │ • RAG       │      │ • Notion     │
    │ • Stories   │      │ • Risk Det. │      │ • VectorDB   │
    └─────────────┘      └──────┬──────┘      └──────────────┘
                                │
                                ▼
                         ┌──────────────┐
                         │  Claude API  │
                         │ (Anthropic)  │
                         └──────────────┘
```

## 📁 Project Structure

```
spider-scribe/
├── app/                          # Android app (Kotlin + Compose)
│   ├── src/main/
│   │   ├── java/com/spiritualcompanion/
│   │   │   ├── data/            # Models, APIs, Repositories
│   │   │   ├── ui/              # Screens, ViewModels, Theme
│   │   │   └── di/              # Dependency Injection
│   │   ├── res/                 # Resources (strings, colors, etc.)
│   │   └── AndroidManifest.xml
│   └── build.gradle.kts
│
├── backend/                      # Python backend services
│   ├── api/
│   │   ├── content/             # Content Service API
│   │   └── guru/                # AI Guru Service API
│   ├── services/
│   │   ├── rag_service.py       # RAG implementation
│   │   └── risk_detection.py   # Safety system
│   ├── memory_builder/
│   │   ├── notion_extractor.py # Extract from Notion
│   │   └── vector_store.py     # Vector database builder
│   ├── models/
│   │   └── schemas.py           # Pydantic models
│   └── data/                    # Knowledge base storage
│
├── QUICKSTART.md                 # Get started in 5 minutes
├── SETUP_GUIDE.md                # Detailed setup instructions
└── README.md                     # This file
```

## 🎯 Core Features

### Android App

**Technology Stack:**
- Kotlin
- Jetpack Compose (Material 3)
- MVVM Architecture
- Hilt (Dependency Injection)
- Retrofit (Networking)
- Coroutines + Flow

**Screens:**
1. Onboarding with mandatory disclosure
2. Home with three main options
3. Guru selection (6 personas)
4. Chat with voice input
5. Bhajans library
6. Sacred stories

### Backend Services

**Content Service API (Port 8001):**
- `GET /bhajans` - Get devotional songs
- `GET /stories` - Get sacred stories

**AI Guru Service API (Port 8002):**
- `POST /detect-risk` - Check if question needs human support
- `POST /chat` - Get AI spiritual guidance
- `GET /stats` - Knowledge base statistics

**Memory Builder:**
- Extracts content from Notion database
- Processes videos (YouTube transcripts)
- Scrapes web links
- Builds vector database for RAG
- Supports incremental updates

## 🛡️ Safety Features

### 1. Mandatory Onboarding Disclosure
Users **cannot skip** the disclaimer that explains app limitations and recommends consulting professionals for serious matters.

### 2. Risk Detection System
- **Critical Keywords**: Immediate detection (suicide, violence, etc.)
- **LLM-Based Analysis**: Nuanced classification using Claude
- **Three Levels**: High, medium, low risk
- **Action**: Shows warning dialog, recommends human support

### 3. Out-of-Domain Handling
Detects and politely deflects:
- Medical advice
- Legal matters
- Financial decisions
- Commercial queries
- Explicit content

### 4. RAG Grounding
- All responses grounded in sacred texts
- Sources provided for transparency
- Confidence scores calculated
- Non-authoritative tone ("you might consider" vs "you must")

### 5. Human-in-the-Loop
For risky questions, always recommends:
- Consulting family and friends
- Speaking with qualified professionals
- Emergency services if critical

## 🚀 Getting Started

### Prerequisites

**Backend:**
- Python 3.9+
- Anthropic API key
- Notion API key + database

**Android:**
- Android Studio Hedgehog+
- JDK 17
- Android SDK (API 34)

### Installation

**1. Clone Repository**
```bash
git clone <repo-url>
cd spider-scribe
```

**2. Backend Setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys
```

**3. Build Knowledge Base**
```bash
./build_memory.sh
```

**4. Start Backend Services**
```bash
# Terminal 1
./run_content_api.sh

# Terminal 2
./run_guru_api.sh
```

**5. Android App**
```bash
# Open in Android Studio
# Update URLs in NetworkModule.kt
# Run on emulator or device
```

**Complete instructions**: See [SETUP_GUIDE.md](SETUP_GUIDE.md)

## 🧠 Memory/Knowledge Base

The system uses your **Notion database** as the spiritual knowledge base.

### Notion Setup

1. Create a Notion database with these properties:
   - **Name** (Title) - Document title
   - **Type** (Select) - page, video, link, article
   - **URL** (URL) - Links to external content
   - **Tags** (Multi-select) - Categories
   - **Guru** (Select) - Related deity

2. Add spiritual content:
   - Text pages about Hindu philosophy
   - YouTube video links (transcripts extracted)
   - Articles and PDFs
   - Sacred texts and scriptures

3. Build the memory:
   ```bash
   ./build_memory.sh
   ```

This extracts all content, generates embeddings, and stores in ChromaDB for fast RAG retrieval.

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get up and running in 5 minutes
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Complete setup instructions
- **[backend/README.md](backend/README.md)** - Backend API documentation
- **[Architectural Blueprint](https://docs.google.com/document/d/14YptrRykNkm4CA12VEvoRHvlJ98pY43mqsPOSOTWI30)** - Original design doc
- **[Strategic Report](https://docs.google.com/document/d/1WYAKH9gND00i2CYmaSeOhTPhO4niIO0rMN20gy9Ym4Y)** - Business strategy

## 🧪 Testing

**Test Backend APIs:**
```bash
cd backend
./test_apis.sh
```

**Test Individual Services:**
```bash
python services/rag_service.py
python services/risk_detection.py
python memory_builder/vector_store.py
```

**API Documentation:**
- Content API: http://localhost:8001/docs
- AI Guru API: http://localhost:8002/docs

## 🎨 Design Principles

### Elderly-Friendly UX
- **Large text**: 18-42sp font sizes
- **High contrast**: Bold, clear colors
- **Simple navigation**: Max 3 levels
- **Large touch targets**: 64dp minimum
- **Voice-first**: Primary input method

### Cultural Sensitivity
- Respectful representation of Hindu deities
- Accurate spiritual teachings
- Indian language support
- Culturally appropriate tone

### Safety & Ethics
- Non-authoritative guidance
- Mandatory disclaimers
- Risk detection
- Human support recommendations
- Transparent sourcing

## 🚢 Deployment

### Backend Options
- **Railway.app** - Easiest (one-click deploy)
- **Render.com** - Good for API services
- **DigitalOcean/AWS** - Full control
- **Docker** - Container deployment

### Android Options
- Generate signed APK
- Test with elderly users
- Publish to Google Play Store

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for deployment instructions.

## 🔧 Configuration

### Backend Environment Variables

```env
# AI
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Notion
NOTION_API_KEY=ntn_xxxxx
NOTION_DATABASE_ID=xxxxx

# LLM Config
LLM_MODEL=claude-3-5-sonnet-20241022
LLM_TEMPERATURE=0.7
TOP_K_RESULTS=5

# Risk Detection
RISK_THRESHOLD=0.7
```

### Android Network Config

Update `NetworkModule.kt` with your backend URLs:
```kotlin
private const val CONTENT_BASE_URL = "https://your-domain.com:8001/"
private const val AI_GURU_BASE_URL = "https://your-domain.com:8002/"
```

## 📊 Monitoring & Maintenance

### Regular Tasks
- **Weekly**: Check API logs, monitor response quality
- **Monthly**: Update Notion content, rebuild memory
- **As Needed**: Update dependencies, improve prompts

### Updating Knowledge Base
```bash
cd backend
./build_memory.sh  # Re-extracts from Notion and rebuilds
```

## 🤝 Contributing

When contributing:
1. Maintain elderly-friendly design
2. Never bypass safety guardrails
3. Test with target users (60+ age)
4. Respect cultural/religious sensitivity
5. Add tests for new features

## 📜 License

[Specify your license here]

## 💬 Support

- GitHub Issues for bug reports
- Check documentation for common issues
- Review SETUP_GUIDE.md for troubleshooting

## ⚠️ Important Note

This app provides **spiritual perspective**, not professional advice. It should never replace:
- Medical professionals
- Legal advisors
- Financial counselors
- Mental health support
- Family and friends

Always encourage users to consult appropriate professionals for serious matters.

---

**Built with ❤️ for spiritual seekers and their families**
