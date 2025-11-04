from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class GuruType(str, Enum):
    KRISHNA = "KRISHNA"
    SHIVA = "SHIVA"
    RAMA = "RAMA"
    DURGA = "DURGA"
    GANESHA = "GANESHA"
    HANUMAN = "HANUMAN"


class Bhajan(BaseModel):
    id: str
    title: str
    guru: str
    url: str
    duration: Optional[str] = None
    thumbnail: Optional[str] = None
    language: str = "Hindi"


class Story(BaseModel):
    id: str
    title: str
    guru: str
    text: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail: Optional[str] = None
    language: str = "Hindi"


class ContentResponse(BaseModel):
    data: List[Bhajan | Story]
    status: str = "success"
    message: Optional[str] = None


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1)
    guru: str
    language: str = "en"
    user_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    is_out_of_domain: bool = False
    requires_human_review: bool = False
    confidence_score: Optional[float] = None
    sources: Optional[List[str]] = None
    warning: Optional[str] = None


class RiskDetectionResult(BaseModel):
    is_risky: bool
    risk_score: float
    risk_categories: List[str] = []
    recommendation: Optional[str] = None


class MemoryDocument(BaseModel):
    """Document from Notion knowledge base"""
    id: str
    title: str
    content: str
    doc_type: str  # "page", "video", "pdf", etc.
    url: Optional[str] = None
    tags: List[str] = []
    guru_related: Optional[str] = None
    source: str = "notion"
