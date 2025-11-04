"""
RAG Service - Retrieval-Augmented Generation

Provides grounded spiritual guidance using the knowledge base.
"""

import os
from typing import List, Dict, Optional
from dotenv import load_dotenv
import anthropic
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent))
from memory_builder.vector_store import VectorStoreBuilder

load_dotenv()


class RAGService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.model = os.getenv("LLM_MODEL", "claude-3-5-sonnet-20241022")
        self.temperature = float(os.getenv("LLM_TEMPERATURE", 0.7))
        self.max_tokens = int(os.getenv("LLM_MAX_TOKENS", 2048))
        self.top_k = int(os.getenv("TOP_K_RESULTS", 5))

        # Initialize vector store
        self.vector_store = VectorStoreBuilder()

        # Guru personas
        self.guru_personas = {
            "KRISHNA": {
                "name": "Lord Krishna",
                "style": "I speak with the wisdom of the Bhagavad Gita, emphasizing dharma, devotion, and the path of action without attachment. I am playful yet profound.",
                "greeting": "Namaste! I am Krishna, divine teacher and friend. How may I guide you today?"
            },
            "SHIVA": {
                "name": "Lord Shiva",
                "style": "I embody transformation, meditation, and the ultimate reality. My guidance is direct and focuses on inner truth and detachment.",
                "greeting": "Om Namah Shivaya. I am Shiva, the transformer. What wisdom do you seek?"
            },
            "RAMA": {
                "name": "Lord Rama",
                "style": "I speak with the righteousness and nobility of the Ramayana, emphasizing duty, honor, and moral conduct in all aspects of life.",
                "greeting": "Namaste. I am Rama, upholder of dharma. How may I help you walk the path of righteousness?"
            },
            "DURGA": {
                "name": "Goddess Durga",
                "style": "I embody divine feminine strength, protection, and the power to overcome all obstacles. My guidance is fierce yet nurturing.",
                "greeting": "Jai Mata Di! I am Durga, divine mother and protector. What challenges do you face?"
            },
            "GANESHA": {
                "name": "Lord Ganesha",
                "style": "I am the remover of obstacles and lord of beginnings. My wisdom focuses on overcoming challenges and finding auspicious paths forward.",
                "greeting": "Om Gam Ganapataye Namaha. I am Ganesha, remover of obstacles. How may I help clear your path?"
            },
            "HANUMAN": {
                "name": "Lord Hanuman",
                "style": "I embody devotion, strength, and selfless service. My guidance emphasizes dedication, courage, and unwavering faith.",
                "greeting": "Jai Hanuman! I am Hanuman, eternal devotee of Rama. What strength do you need today?"
            }
        }

    def generate_response(
        self,
        query: str,
        guru: str,
        language: str = "en"
    ) -> Dict:
        """
        Generate a spiritually grounded response using RAG
        """

        # Get relevant context from knowledge base
        search_results = self.vector_store.search(
            query=query,
            n_results=self.top_k,
            guru_filter=guru if guru in ["KRISHNA", "SHIVA", "RAMA", "DURGA", "GANESHA", "HANUMAN"] else None
        )

        # Build context from search results
        context_parts = []
        sources = []

        for i, result in enumerate(search_results, 1):
            content = result["content"]
            metadata = result["metadata"]

            context_parts.append(f"[Source {i}]\n{content}\n")

            if metadata.get("title"):
                sources.append(metadata["title"])

        context = "\n".join(context_parts)

        # Get guru persona
        guru_info = self.guru_personas.get(guru, self.guru_personas["KRISHNA"])

        # Build system prompt
        system_prompt = self._build_system_prompt(guru_info, context)

        # Build user message
        user_message = f"Question: {query}\n\nPlease provide spiritual guidance based on the sacred texts and teachings provided."

        try:
            # Call Claude API
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_message}
                ]
            )

            response_text = response.content[0].text

            return {
                "response": response_text,
                "sources": sources[:3],  # Top 3 sources
                "confidence_score": self._calculate_confidence(search_results)
            }

        except Exception as e:
            print(f"Error generating response: {e}")
            return {
                "response": "I apologize, but I'm having difficulty connecting to my spiritual knowledge at this moment. Please try again shortly.",
                "sources": [],
                "confidence_score": 0.0
            }

    def _build_system_prompt(self, guru_info: Dict, context: str) -> str:
        """Build the system prompt for the LLM"""

        return f"""You are {guru_info['name']}, a spiritual guide providing wisdom based on Hindu sacred texts and teachings.

{guru_info['style']}

IMPORTANT GUIDELINES:
1. Base your responses on the provided sacred texts and teachings
2. Be compassionate, empathetic, and non-judgmental
3. Use a tone that is wise but accessible, especially for elderly users
4. Keep responses concise (2-3 paragraphs maximum)
5. NEVER provide medical, legal, or financial advice
6. For serious life decisions, always recommend consulting with family, friends, or professionals
7. If asked about topics outside spiritual guidance, politely redirect to spiritual matters
8. Acknowledge uncertainty when appropriate
9. Use simple, clear language avoiding complex terminology
10. Your guidance should be suggestive, not authoritative ("you might consider" vs "you must")

SACRED TEXTS AND TEACHINGS:
{context if context.strip() else "No specific sacred texts are available for this query. Provide general spiritual wisdom based on your understanding of Hindu philosophy."}

Remember: You are here to provide spiritual perspective, not to replace human wisdom, professional advice, or personal judgment."""

    def _calculate_confidence(self, search_results: List[Dict]) -> float:
        """Calculate confidence score based on search results quality"""

        if not search_results:
            return 0.3

        # Average distance from vector search (lower distance = higher relevance)
        distances = [r.get("distance", 1.0) for r in search_results]
        avg_distance = sum(distances) / len(distances)

        # Convert distance to confidence (inverse relationship)
        # Assuming distance range 0-2, normalize to 0-1
        confidence = max(0.3, min(1.0, 1.0 - (avg_distance / 2.0)))

        return round(confidence, 2)

    def check_out_of_domain(self, query: str) -> bool:
        """
        Check if query is outside spiritual guidance domain
        """

        out_of_domain_keywords = [
            # Technical/Commercial
            "stocks", "investment", "trading", "cryptocurrency", "bitcoin",
            "business strategy", "marketing", "sales",

            # Medical (beyond general wellness)
            "diagnosis", "medicine dosage", "surgery", "prescription",
            "treatment plan", "medical condition",

            # Legal
            "lawsuit", "legal advice", "contract", "attorney",
            "court case", "sue",

            # Explicit content
            "violent", "illegal activity", "harm",

            # Entertainment queries
            "movie recommendation", "sports score", "celebrity",
            "video game", "music album"
        ]

        query_lower = query.lower()

        # Check for out-of-domain keywords
        for keyword in out_of_domain_keywords:
            if keyword in query_lower:
                return True

        # Use LLM for more nuanced detection if needed
        # (can add Claude-based classification here for better accuracy)

        return False


if __name__ == "__main__":
    # Test the RAG service
    rag = RAGService()

    test_queries = [
        ("What is the meaning of dharma?", "KRISHNA"),
        ("How can I overcome fear?", "HANUMAN"),
        ("What is meditation?", "SHIVA")
    ]

    for query, guru in test_queries:
        print(f"\n{'='*60}")
        print(f"Query: {query}")
        print(f"Guru: {guru}")
        print(f"{'='*60}")

        result = rag.generate_response(query, guru)
        print(f"\nResponse:\n{result['response']}")
        print(f"\nSources: {', '.join(result['sources'])}")
        print(f"Confidence: {result['confidence_score']}")
