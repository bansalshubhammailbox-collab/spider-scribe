# Spiritual Companion - Backend Services

Backend APIs and memory builder for the Spiritual Companion Android app.

## Architecture

```
backend/
├── api/
│   ├── content/         # Content Service API (bhajans, stories)
│   └── guru/            # AI Guru Service API (chat, risk detection)
├── services/
│   ├── rag_service.py   # RAG for spiritual guidance
│   └── risk_detection.py # Safety guardrails
├── memory_builder/
│   ├── notion_extractor.py  # Extract knowledge from Notion
│   └── vector_store.py      # Build vector database
├── models/
│   └── schemas.py       # Pydantic models
└── data/               # Knowledge base storage
```

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `ANTHROPIC_API_KEY` - Your Claude API key from Anthropic
- `NOTION_API_KEY` - Notion integration token
- `NOTION_DATABASE_ID` - Your Notion database ID

### 3. Build the Memory/Knowledge Base

This is a **critical step** - it extracts content from your Notion database and builds the vector database for RAG.

#### Step 3a: Extract from Notion

```bash
python backend/memory_builder/notion_extractor.py
```

This will:
- Connect to your Notion database
- Extract all pages, documents, videos, and links
- Process and save to `backend/data/notion_knowledge_base.json`

#### Step 3b: Build Vector Store

```bash
python backend/memory_builder/vector_store.py
```

This will:
- Load the extracted Notion content
- Chunk documents for RAG
- Generate embeddings
- Store in ChromaDB at `backend/data/chroma_db/`

**Note:** The vector store only needs to be built once, unless you add new content to Notion.

## Running the Services

### Option 1: Run Individually

**Content API:**
```bash
python backend/api/content/app.py
# Runs on http://localhost:8001
```

**AI Guru API:**
```bash
python backend/api/guru/app.py
# Runs on http://localhost:8002
```

### Option 2: Run with Docker (TODO)

```bash
docker-compose up
```

## API Documentation

### Content Service API (Port 8001)

#### GET /bhajans
Get devotional songs.

**Query Parameters:**
- `guru` (optional): Filter by guru (KRISHNA, SHIVA, RAMA, DURGA, GANESHA, HANUMAN)
- `language` (optional): Filter by language

**Response:**
```json
{
  "data": [
    {
      "id": "bhajan_1",
      "title": "Hare Krishna Hare Rama",
      "guru": "KRISHNA",
      "url": "https://youtube.com/...",
      "duration": "5:30",
      "language": "Hindi"
    }
  ],
  "status": "success"
}
```

#### GET /stories
Get sacred stories.

**Query Parameters:**
- `guru` (optional): Filter by guru
- `language` (optional): Filter by language

**Response:**
```json
{
  "data": [
    {
      "id": "story_1",
      "title": "Krishna and the Butter",
      "guru": "KRISHNA",
      "text": "Story text...",
      "video_url": "https://youtube.com/...",
      "language": "English"
    }
  ],
  "status": "success"
}
```

### AI Guru Service API (Port 8002)

#### POST /detect-risk
Check if a query requires human support.

**Request:**
```json
{
  "query": "I'm feeling very depressed about my situation",
  "guru": "KRISHNA",
  "language": "en"
}
```

**Response:**
```json
{
  "response": "",
  "is_out_of_domain": false,
  "requires_human_review": true,
  "confidence_score": 0.85,
  "warning": "This seems to be a serious matter..."
}
```

#### POST /chat
Get spiritual guidance.

**Request:**
```json
{
  "query": "What is the meaning of dharma?",
  "guru": "KRISHNA",
  "language": "en",
  "user_id": "optional_user_id"
}
```

**Response:**
```json
{
  "response": "Dharma, as I teach in the Bhagavad Gita...",
  "is_out_of_domain": false,
  "requires_human_review": false,
  "confidence_score": 0.92,
  "sources": ["Bhagavad Gita", "Sacred Texts"]
}
```

## Memory Builder

### Notion Database Structure

Your Notion database should have these properties:
- **Name/Title** (title): Document title
- **Type** (select): page, video, link, article, doc
- **URL** (url): Link to external content
- **Tags** (multi-select): Categorization tags
- **Guru** (select): Related deity (optional)

### Adding Content to Knowledge Base

1. Add new pages/documents to your Notion database
2. Run the extractor: `python backend/memory_builder/notion_extractor.py`
3. Rebuild the vector store: `python backend/memory_builder/vector_store.py`

The system will:
- Extract text from Notion pages
- Fetch video transcripts from YouTube links
- Scrape content from web links
- Process and embed everything for RAG

## Testing

### Test RAG Service

```bash
python backend/services/rag_service.py
```

### Test Risk Detection

```bash
python backend/services/risk_detection.py
```

### Test Vector Search

```bash
python backend/memory_builder/vector_store.py
```

### API Testing with curl

```bash
# Test Content API
curl http://localhost:8001/bhajans?guru=KRISHNA

# Test Risk Detection
curl -X POST http://localhost:8002/detect-risk \
  -H "Content-Type: application/json" \
  -d '{"query": "What is dharma?", "guru": "KRISHNA"}'

# Test Chat
curl -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "How can I find inner peace?", "guru": "SHIVA"}'
```

## Safety Features

### 1. Risk Detection
- Keywords-based detection for critical cases (suicide, self-harm, violence)
- LLM-based nuanced detection for medium-risk situations
- Three levels: high, medium, low
- Recommendations for human support

### 2. Out-of-Domain Detection
- Identifies non-spiritual queries (medical, legal, financial)
- Politely redirects users to appropriate resources

### 3. RAG Grounding
- All responses are grounded in sacred texts from the knowledge base
- Confidence scores based on retrieval quality
- Sources provided for transparency

### 4. Non-Authoritative Tone
- Responses use suggestive language ("you might consider")
- Acknowledge uncertainty when appropriate
- Always recommend consulting family/professionals for major decisions

## Deployment

### Update Android App URLs

After deploying, update these URLs in the Android app:

`app/src/main/java/com/spiritualcompanion/di/NetworkModule.kt`:
```kotlin
private const val CONTENT_BASE_URL = "https://your-domain.com:8001/api/"
private const val AI_GURU_BASE_URL = "https://your-domain.com:8002/api/"
```

### Environment Variables for Production

- Set `LLM_TEMPERATURE` lower (0.5-0.6) for more consistent responses
- Enable Redis caching for better performance
- Set up monitoring and logging
- Configure rate limiting
- Use HTTPS with proper certificates

## Troubleshooting

### "Notion database not found"
- Check your `NOTION_API_KEY` is valid
- Verify `NOTION_DATABASE_ID` is correct
- Ensure Notion integration has access to the database

### "No vector store found"
- Run `python backend/memory_builder/vector_store.py` to build it
- Check `CHROMA_PERSIST_DIRECTORY` path is correct

### "Anthropic API error"
- Verify your `ANTHROPIC_API_KEY` is valid
- Check you have sufficient credits/quota
- Ensure you're using the correct model name

### Low confidence scores
- Add more content to your Notion knowledge base
- Ensure content is well-organized and tagged
- Rebuild the vector store after adding content

## License

[Specify your license]
