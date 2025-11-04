"""
Risk Detection Service

Detects potentially risky questions that require human support
instead of AI spiritual guidance.
"""

import os
from typing import Dict, List
from dotenv import load_dotenv
import anthropic
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent))

load_dotenv()


class RiskDetectionService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.model = "claude-3-5-sonnet-20241022"
        self.risk_threshold = float(os.getenv("RISK_THRESHOLD", 0.7))

        # High-risk keywords
        self.critical_keywords = [
            # Suicide/Self-harm
            "suicide", "kill myself", "end my life", "want to die",
            "self harm", "hurt myself", "no reason to live",

            # Violence
            "want to hurt", "want to kill", "revenge", "violent thoughts",

            # Severe mental health
            "severe depression", "can't cope", "unbearable pain",

            # Medical emergencies
            "chest pain", "can't breathe", "overdose", "poisoning",

            # Abuse
            "being abused", "domestic violence", "sexual assault"
        ]

    def detect_risk(self, query: str, context: Dict = None) -> Dict:
        """
        Detect if a query is potentially risky and requires human support

        Returns:
            {
                "is_risky": bool,
                "risk_score": float (0-1),
                "risk_categories": List[str],
                "recommendation": str
            }
        """

        # Quick keyword check for critical cases
        query_lower = query.lower()
        critical_detected = []

        for keyword in self.critical_keywords:
            if keyword in query_lower:
                critical_detected.append(keyword)

        # If critical keywords found, immediately flag as high risk
        if critical_detected:
            return {
                "is_risky": True,
                "risk_score": 1.0,
                "risk_categories": ["critical", "requires_immediate_human_support"],
                "recommendation": "This appears to be a serious matter requiring immediate support. Please speak with family, friends, or contact a professional helpline. If this is an emergency, please contact emergency services."
            }

        # Use LLM for nuanced risk detection
        try:
            risk_analysis = self._llm_risk_detection(query)
            return risk_analysis

        except Exception as e:
            print(f"Error in risk detection: {e}")
            # Fail safe - if can't determine, be cautious
            return {
                "is_risky": False,
                "risk_score": 0.3,
                "risk_categories": [],
                "recommendation": None
            }

    def _llm_risk_detection(self, query: str) -> Dict:
        """Use LLM to detect nuanced risk signals"""

        system_prompt = """You are a safety classifier for a spiritual guidance app designed for elderly users in India.

Your task is to identify if a user's question indicates they are facing a serious life situation that requires human support rather than AI spiritual guidance.

HIGH RISK situations include:
- Suicidal thoughts or self-harm
- Thoughts of violence toward others
- Severe mental health crises
- Medical emergencies
- Abuse or exploitation
- Major life decisions (marriage, divorce, property, finances)
- Legal matters
- Serious family conflicts

MEDIUM RISK situations include:
- Significant grief or loss
- Health concerns
- Relationship problems
- Work/career stress
- Financial worries

LOW RISK situations include:
- General spiritual questions
- Philosophy and meaning
- Daily life challenges
- Seeking peace and comfort

Respond ONLY with a JSON object in this exact format:
{
    "risk_level": "high" | "medium" | "low",
    "risk_score": 0.0 to 1.0,
    "categories": ["category1", "category2"],
    "reasoning": "brief explanation"
}"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                temperature=0.3,  # Lower temperature for consistent classification
                system=system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": f"Classify this query:\n\n{query}"
                    }
                ]
            )

            # Parse response
            response_text = response.content[0].text.strip()

            # Extract JSON (handle markdown code blocks)
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()

            import json
            analysis = json.loads(response_text)

            risk_level = analysis.get("risk_level", "low")
            risk_score = float(analysis.get("risk_score", 0.0))
            categories = analysis.get("categories", [])

            is_risky = risk_level in ["high", "medium"] or risk_score >= self.risk_threshold

            recommendation = None
            if risk_level == "high":
                recommendation = "This seems to be a serious matter. We strongly recommend speaking with family members, close friends, or qualified professionals who can provide personal support and guidance."
            elif risk_level == "medium":
                recommendation = "For important decisions like this, it's wise to also consult with family, friends, or professionals who know your situation personally."

            return {
                "is_risky": is_risky,
                "risk_score": risk_score,
                "risk_categories": categories,
                "recommendation": recommendation
            }

        except Exception as e:
            print(f"Error in LLM risk detection: {e}")
            # Fail-safe: err on the side of caution
            return {
                "is_risky": False,
                "risk_score": 0.3,
                "risk_categories": [],
                "recommendation": None
            }


if __name__ == "__main__":
    # Test risk detection
    detector = RiskDetectionService()

    test_cases = [
        "What is the meaning of life?",  # Low risk
        "I'm feeling very sad about my father's death",  # Medium risk
        "Should I sell my property or keep it?",  # Medium-High risk
        "I don't want to live anymore",  # High risk - critical
        "How can I find peace in meditation?",  # Low risk
    ]

    for query in test_cases:
        print(f"\n{'='*60}")
        print(f"Query: {query}")
        print(f"{'='*60}")

        result = detector.detect_risk(query)
        print(f"Risky: {result['is_risky']}")
        print(f"Score: {result['risk_score']}")
        print(f"Categories: {result['risk_categories']}")
        if result['recommendation']:
            print(f"Recommendation: {result['recommendation']}")
