"""
Content Service API

Provides bhajans and sacred stories to the Android app.
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import json
import os
from pathlib import Path

# Import models
import sys
sys.path.append(str(Path(__file__).parent.parent.parent))
from models.schemas import Bhajan, Story, ContentResponse

app = FastAPI(
    title="Spiritual Companion - Content Service",
    description="API for devotional content (bhajans and stories)",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Sample data (in production, this would come from a database)
BHAJANS_DATA = [
    {
        "id": "bhajan_1",
        "title": "Hare Krishna Hare Rama",
        "guru": "KRISHNA",
        "url": "https://www.youtube.com/watch?v=VZHzRa7NG_o",
        "duration": "5:30",
        "language": "Hindi"
    },
    {
        "id": "bhajan_2",
        "title": "Om Namah Shivaya",
        "guru": "SHIVA",
        "url": "https://www.youtube.com/watch?v=TzFVd0JJx9I",
        "duration": "4:45",
        "language": "Sanskrit"
    },
    {
        "id": "bhajan_3",
        "title": "Raghupati Raghav Raja Ram",
        "guru": "RAMA",
        "url": "https://www.youtube.com/watch?v=6zZX8lO4WwY",
        "duration": "6:20",
        "language": "Hindi"
    },
    {
        "id": "bhajan_4",
        "title": "Ya Devi Sarva Bhuteshu",
        "guru": "DURGA",
        "url": "https://www.youtube.com/watch?v=VqFqcKFvRq4",
        "duration": "7:15",
        "language": "Sanskrit"
    },
    {
        "id": "bhajan_5",
        "title": "Shri Ganesh Stuti",
        "guru": "GANESHA",
        "url": "https://www.youtube.com/watch?v=pYEfQIatuPY",
        "duration": "5:00",
        "language": "Sanskrit"
    },
    {
        "id": "bhajan_6",
        "title": "Hanuman Chalisa",
        "guru": "HANUMAN",
        "url": "https://www.youtube.com/watch?v=_J35B9kP3Cc",
        "duration": "8:30",
        "language": "Hindi"
    }
]

STORIES_DATA = [
    {
        "id": "story_1",
        "title": "Krishna and the Butter",
        "guru": "KRISHNA",
        "text": "Once, young Krishna was very fond of butter. His mother Yashoda would churn butter and store it in earthen pots hung from the ceiling. Krishna, being mischievous, would form a human pyramid with his friends to reach these pots and steal the butter. When Yashoda caught him, she tried to tie him with a rope as punishment. But no matter how much rope she used, it was always two fingers short. Finally, when Krishna saw his mother's exhaustion and love, he allowed himself to be bound. This story teaches us that God can only be bound by pure love and devotion, not by any material means.",
        "video_url": "https://www.youtube.com/watch?v=example1",
        "language": "English"
    },
    {
        "id": "story_2",
        "title": "Shiva and the Ocean of Poison",
        "guru": "SHIVA",
        "text": "During the churning of the cosmic ocean (Samudra Manthan), a deadly poison (Halahala) emerged that threatened to destroy all of creation. The gods and demons were terrified. Lord Shiva, in his compassion, consumed the poison to save the universe. Goddess Parvati, worried for her husband, held his throat to prevent the poison from going down. The poison remained in Shiva's throat, turning it blue, which is why he is called Neelkanth (the blue-throated one). This story illustrates Shiva's role as the ultimate protector and his willingness to sacrifice for the welfare of all beings.",
        "video_url": "https://www.youtube.com/watch?v=example2",
        "language": "English"
    },
    {
        "id": "story_3",
        "title": "Rama and the Golden Deer",
        "guru": "RAMA",
        "text": "During their exile in the forest, Sita saw a beautiful golden deer and asked Rama to catch it for her. Rama, suspecting it might be a demon in disguise, asked Lakshmana to protect Sita while he went after it. The deer was indeed the demon Maricha, who, when struck by Rama's arrow, cried out in Rama's voice for help. Hearing this, Sita urged Lakshmana to go help Rama, leaving her alone. This was Ravana's plan, and he kidnapped Sita in Lakshmana's absence. This story teaches us about the consequences of desire and the importance of wisdom over temptation.",
        "video_url": "https://www.youtube.com/watch?v=example3",
        "language": "English"
    },
    {
        "id": "story_4",
        "title": "Durga Slays Mahishasura",
        "guru": "DURGA",
        "text": "The demon king Mahishasura, through severe penance, obtained a boon that no man or god could kill him. Drunk with power, he attacked the heavens and defeated all the gods. In their desperation, the gods combined their energies and created Goddess Durga, who rode a lion into battle. The war raged for nine days and nights, during which Durga fought the demon who kept changing forms. Finally, on the tenth day (Vijayadashami), she slew him with her trident. This story celebrates the victory of good over evil and the power of Shakti (divine feminine energy).",
        "video_url": "https://www.youtube.com/watch?v=example4",
        "language": "English"
    },
    {
        "id": "story_5",
        "title": "Ganesha Writes the Mahabharata",
        "guru": "GANESHA",
        "text": "Sage Vyasa wanted to compose the great epic Mahabharata but needed someone who could write as fast as he could narrate. Lord Brahma suggested Ganesha for this task. Ganesha agreed but set a condition: Vyasa must narrate without pause. Vyasa accepted but added his own condition: Ganesha must understand each verse before writing it down. This gave Vyasa time to think of the next verse. During the writing, Ganesha's pen broke, so he broke off his own tusk and used it to continue writing without interruption. This is why Ganesha is often depicted with one tusk, symbolizing sacrifice for knowledge.",
        "video_url": "https://www.youtube.com/watch?v=example5",
        "language": "English"
    },
    {
        "id": "story_6",
        "title": "Hanuman Brings the Sanjeevani",
        "guru": "HANUMAN",
        "text": "During the battle with Ravana, Lakshmana was struck by a deadly weapon and lay unconscious. The physician said only the Sanjeevani herb from the Himalayas could save him, and it had to be brought before dawn. Hanuman flew to the Himalayas, but unable to identify the specific herb in the dark, he lifted the entire mountain and brought it back to Lanka. The herb was found, Lakshmana was revived, and Hanuman returned the mountain to its place. This story exemplifies Hanuman's devotion, strength, humility, and determination in serving Lord Rama.",
        "video_url": "https://www.youtube.com/watch?v=example6",
        "language": "English"
    }
]


@app.get("/")
def root():
    return {
        "service": "Content API",
        "status": "running",
        "endpoints": ["/bhajans", "/stories"]
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/bhajans", response_model=ContentResponse)
def get_bhajans(
    guru: Optional[str] = Query(None, description="Filter by guru (e.g., KRISHNA, SHIVA)"),
    language: Optional[str] = Query(None, description="Filter by language")
):
    """Get list of bhajans (devotional songs)"""

    filtered_bhajans = BHAJANS_DATA.copy()

    if guru:
        filtered_bhajans = [b for b in filtered_bhajans if b["guru"].upper() == guru.upper()]

    if language:
        filtered_bhajans = [b for b in filtered_bhajans if b["language"].lower() == language.lower()]

    return ContentResponse(
        data=[Bhajan(**b) for b in filtered_bhajans],
        status="success",
        message=f"Retrieved {len(filtered_bhajans)} bhajans"
    )


@app.get("/stories", response_model=ContentResponse)
def get_stories(
    guru: Optional[str] = Query(None, description="Filter by guru (e.g., KRISHNA, SHIVA)"),
    language: Optional[str] = Query(None, description="Filter by language")
):
    """Get list of sacred stories"""

    filtered_stories = STORIES_DATA.copy()

    if guru:
        filtered_stories = [s for s in filtered_stories if s["guru"].upper() == guru.upper()]

    if language:
        filtered_stories = [s for s in filtered_stories if s["language"].lower() == language.lower()]

    return ContentResponse(
        data=[Story(**s) for s in filtered_stories],
        status="success",
        message=f"Retrieved {len(filtered_stories)} stories"
    )


@app.get("/stories/{story_id}", response_model=Story)
def get_story(story_id: str):
    """Get a specific story by ID"""

    for story in STORIES_DATA:
        if story["id"] == story_id:
            return Story(**story)

    raise HTTPException(status_code=404, detail="Story not found")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("CONTENT_API_PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
