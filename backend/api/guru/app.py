"""
AI Guru Service API

Provides AI-powered spiritual guidance with RAG and risk detection.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import os
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent.parent))
from models.schemas import ChatRequest, ChatResponse
from services.rag_service import RAGService
from services.risk_detection import RiskDetectionService

app = FastAPI(
    title="Spiritual Companion - AI Guru Service",
    description="AI-powered spiritual guidance with safety guardrails",
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

# Initialize services
print("🔄 Initializing AI Guru services...")
rag_service = RAGService()
risk_detector = RiskDetectionService()
print("✅ AI Guru services ready!")


@app.get("/")
def root():
    return {
        "service": "AI Guru API",
        "status": "running",
        "endpoints": ["/chat", "/detect-risk"],
        "version": "1.0.0"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "rag_service": "ready",
        "risk_detector": "ready"
    }


@app.post("/detect-risk", response_model=ChatResponse)
async def detect_risk(request: ChatRequest):
    """
    Detect if a query contains risky content that requires human support

    This endpoint is called BEFORE the main chat to check if the user's
    question indicates a serious situation requiring professional help.
    """

    try:
        # Detect risk
        risk_result = risk_detector.detect_risk(request.query)

        if risk_result["is_risky"] and risk_result["risk_score"] >= 0.7:
            # High risk - recommend human support
            return ChatResponse(
                response="",  # Empty response - will show warning dialog instead
                is_out_of_domain=False,
                requires_human_review=True,
                confidence_score=risk_result["risk_score"],
                warning=risk_result["recommendation"]
            )
        else:
            # Not risky enough to block - allow to proceed to chat
            return ChatResponse(
                response="",
                is_out_of_domain=False,
                requires_human_review=False,
                confidence_score=risk_result["risk_score"]
            )

    except Exception as e:
        print(f"Error in risk detection: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main spiritual guidance chat endpoint

    Provides AI-powered spiritual guidance using RAG (Retrieval-Augmented Generation)
    grounded in sacred texts and teachings.
    """

    try:
        # Check if query is out of domain
        is_out_of_domain = rag_service.check_out_of_domain(request.query)

        if is_out_of_domain:
            return ChatResponse(
                response="I appreciate your question, but this seems to be outside my area of spiritual guidance. "
                         "I'm here to provide wisdom based on sacred scriptures and spiritual teachings. "
                         "For this matter, I recommend consulting with appropriate experts or professionals.",
                is_out_of_domain=True,
                requires_human_review=False,
                confidence_score=0.0
            )

        # Generate spiritual guidance using RAG
        result = rag_service.generate_response(
            query=request.query,
            guru=request.guru,
            language=request.language
        )

        return ChatResponse(
            response=result["response"],
            is_out_of_domain=False,
            requires_human_review=False,
            confidence_score=result.get("confidence_score"),
            sources=result.get("sources")
        )

    except Exception as e:
        print(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats")
def get_stats():
    """Get vector store statistics"""
    try:
        stats = rag_service.vector_store.get_stats()
        return {
            "status": "operational",
            "knowledge_base": stats
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("GURU_API_PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)
