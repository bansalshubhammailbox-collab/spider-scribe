# Spiritual Companion - Android App

A high-guardrail spiritual companion app designed specifically for elderly users in India, providing spiritual guidance through AI-powered conversations, devotional content, and sacred stories.

## Overview

This Android application serves as a spiritual companion, offering:
- **AI-Powered Spiritual Guidance**: Chat with personalized Guru personas (Krishna, Shiva, Rama, Durga, Ganesha, Hanuman)
- **Voice Interface**: Primary input method using speech-to-text for accessibility
- **Devotional Content**: Access to Bhajans (devotional songs) and sacred stories
- **Safety Guardrails**: Advanced risk detection and human-in-the-loop review for sensitive topics
- **Elderly-Friendly Design**: Large text, high-contrast UI, simplified navigation

## Key Features

### 1. Spiritual Guidance Chat
- Choose from 6 different Guru personas
- Voice-first interface with Hindi language support
- RAG (Retrieval-Augmented Generation) system grounded in sacred texts
- Out-of-domain detection for non-spiritual queries
- Risk detection for sensitive topics with mandatory disclaimers

### 2. Devotional Content
- **Bhajans**: Curated collection of devotional songs
- **Sacred Stories**: Text and video content from Hindu mythology
- Direct links to YouTube for video content

### 3. Safety Features
- Mandatory onboarding disclosure about app limitations
- Risk detection for questions about serious life decisions
- Recommendations to consult family, friends, or professionals
- Non-authoritative, empathetic tone in all responses

## Architecture

### Technology Stack
- **Language**: Kotlin
- **UI Framework**: Jetpack Compose with Material 3
- **Architecture**: MVVM (Model-View-ViewModel)
- **Dependency Injection**: Hilt
- **Networking**: Retrofit + OkHttp
- **Async Operations**: Kotlin Coroutines + Flow
- **Local Storage**: DataStore (for preferences)

### Project Structure
```
app/
├── src/main/java/com/spiritualcompanion/
│   ├── data/
│   │   ├── api/          # Retrofit API interfaces
│   │   ├── models/       # Data models
│   │   └── repository/   # Repository pattern implementation
│   ├── di/               # Dependency injection modules
│   ├── ui/
│   │   ├── navigation/   # Navigation setup
│   │   ├── screens/      # Composable screens
│   │   └── theme/        # Theme and typography
│   ├── MainActivity.kt
│   └── SpiritualCompanionApp.kt
└── build.gradle.kts
```

### Backend Integration

The app requires two backend services:

1. **Content Service API**
   - `GET /bhajans` - Fetch devotional songs
   - `GET /stories` - Fetch sacred stories

2. **AI Guru Service API**
   - `POST /chat` - Send spiritual questions and receive guidance
   - `POST /detect-risk` - Detect potentially risky questions

**⚠️ Important**: Update the API URLs in `NetworkModule.kt`:
```kotlin
private const val CONTENT_BASE_URL = "https://your-content-api.example.com/api/"
private const val AI_GURU_BASE_URL = "https://your-ai-guru-api.example.com/api/"
```

## Getting Started

### Prerequisites
- Android Studio Hedgehog (2023.1.1) or later
- JDK 17
- Android SDK with API Level 34
- Minimum Android API Level 24 (Android 7.0)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd spider-scribe
   ```

2. **Configure Backend URLs**
   - Open `app/src/main/java/com/spiritualcompanion/di/NetworkModule.kt`
   - Update `CONTENT_BASE_URL` and `AI_GURU_BASE_URL` with your actual backend endpoints

3. **Build the project**
   ```bash
   ./gradlew build
   ```

4. **Run on device/emulator**
   - Open the project in Android Studio
   - Click "Run" or use `Shift + F10`

### Building APK

```bash
# Debug build
./gradlew assembleDebug

# Release build (requires keystore configuration)
./gradlew assembleRelease
```

## Design Principles

### Elderly-Friendly UX
- **Large Text**: Minimum 18sp font sizes, up to 42sp for headings
- **High Contrast**: Bold colors and clear visual hierarchy
- **Simplified Navigation**: Maximum 3 levels deep
- **Touch Targets**: Minimum 64dp for all interactive elements
- **Voice-First**: Primary input method using speech recognition

### Safety & Ethics
- **Non-Authoritative Tone**: Guidance is presented as perspective, not absolute truth
- **Mandatory Disclaimers**: Cannot be skipped during onboarding
- **Risk Detection**: ML-based classification for sensitive topics
- **Human Support Recommendation**: Encourages consultation with family/professionals
- **Out-of-Domain Handling**: Gracefully deflects non-spiritual questions

### Accessibility
- Voice input for users with limited typing ability
- Indian language support (Hindi speech recognition)
- Large, accessible UI elements
- Screen reader compatible (TalkBack)

## API Response Formats

### Chat Response
```json
{
  "response": "Spiritual guidance text...",
  "is_out_of_domain": false,
  "requires_human_review": false,
  "confidence_score": 0.85,
  "sources": ["Bhagavad Gita 2.47", "..."],
  "warning": "Optional warning message"
}
```

### Content Response
```json
{
  "data": [
    {
      "id": "bhajan_1",
      "title": "Hare Krishna Bhajan",
      "guru": "Krishna",
      "url": "https://youtube.com/...",
      "duration": "5:30",
      "language": "Hindi"
    }
  ],
  "status": "success"
}
```

## Permissions

The app requires the following permissions:
- `INTERNET` - For API communication
- `ACCESS_NETWORK_STATE` - To check network connectivity
- `RECORD_AUDIO` - For voice input (speech-to-text)
- `MODIFY_AUDIO_SETTINGS` - For audio playback
- `WAKE_LOCK` - To keep device awake during content playback

## Contributing

This project is part of a spiritual guidance initiative. When contributing:
1. Maintain the elderly-friendly design principles
2. Ensure safety guardrails are never bypassed
3. Test with users aged 60+ when possible
4. Respect cultural and religious sensitivity

## Documentation References

- [Architectural Blueprint](https://docs.google.com/document/d/14YptrRykNkm4CA12VEvoRHvlJ98pY43mqsPOSOTWI30)
- [Strategic Report](https://docs.google.com/document/d/1WYAKH9gND00i2CYmaSeOhTPhO4niIO0rMN20gy9Ym4Y)

## License

[Specify your license here]

## Support

For questions or issues, please consult the project documentation or contact the development team.
