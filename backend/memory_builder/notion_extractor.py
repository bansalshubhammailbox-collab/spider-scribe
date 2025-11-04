"""
Notion Knowledge Base Extractor

This module extracts all content from the Notion database to build
the spiritual guidance memory/knowledge base.
"""

import os
from typing import List, Dict, Any
from notion_client import Client
from dotenv import load_dotenv
import requests
from bs4 import BeautifulSoup
from youtube_transcript_api import YouTubeTranscriptApi
import re
import json

load_dotenv()


class NotionExtractor:
    def __init__(self):
        self.notion = Client(auth=os.getenv("NOTION_API_KEY"))
        self.database_id = os.getenv("NOTION_DATABASE_ID")

    def extract_all_content(self) -> List[Dict[str, Any]]:
        """Extract all content from Notion database"""
        print("🔍 Starting Notion knowledge base extraction...")

        try:
            # Query the database
            results = self.notion.databases.query(
                database_id=self.database_id
            )

            documents = []
            for page in results.get("results", []):
                doc = self._extract_page_content(page)
                if doc:
                    documents.append(doc)
                    print(f"✓ Extracted: {doc['title']}")

            print(f"\n✅ Extracted {len(documents)} documents from Notion")
            return documents

        except Exception as e:
            print(f"❌ Error extracting from Notion: {e}")
            print("⚠️  Make sure NOTION_API_KEY and NOTION_DATABASE_ID are set correctly")
            return []

    def _extract_page_content(self, page: Dict) -> Dict[str, Any]:
        """Extract content from a single Notion page"""
        try:
            page_id = page["id"]

            # Extract properties
            properties = page.get("properties", {})

            # Get title
            title = self._extract_title(properties)
            if not title:
                title = f"Document {page_id[:8]}"

            # Get page content blocks
            blocks = self.notion.blocks.children.list(block_id=page_id)
            content = self._blocks_to_text(blocks.get("results", []))

            # Extract metadata
            doc_type = self._get_property_value(properties, "Type", "page")
            url = self._get_property_value(properties, "URL")
            tags = self._get_property_value(properties, "Tags", [])
            guru = self._get_property_value(properties, "Guru")

            # If it's a video, try to get transcript
            if doc_type == "video" and url:
                video_content = self._extract_video_content(url)
                if video_content:
                    content += f"\n\n[Video Transcript]\n{video_content}"

            # If it's a web link, try to fetch content
            if url and doc_type in ["link", "article", "doc"]:
                web_content = self._extract_web_content(url)
                if web_content:
                    content += f"\n\n[Web Content]\n{web_content}"

            return {
                "id": page_id,
                "title": title,
                "content": content,
                "doc_type": doc_type,
                "url": url,
                "tags": tags if isinstance(tags, list) else [tags] if tags else [],
                "guru_related": guru,
                "source": "notion"
            }

        except Exception as e:
            print(f"⚠️  Error extracting page {page.get('id', 'unknown')}: {e}")
            return None

    def _extract_title(self, properties: Dict) -> str:
        """Extract title from Notion properties"""
        for key, value in properties.items():
            if value.get("type") == "title":
                title_array = value.get("title", [])
                if title_array:
                    return "".join([t.get("plain_text", "") for t in title_array])
        return ""

    def _get_property_value(self, properties: Dict, prop_name: str, default=None):
        """Get value from Notion property"""
        for key, value in properties.items():
            if key.lower() == prop_name.lower():
                prop_type = value.get("type")

                if prop_type == "rich_text":
                    texts = value.get("rich_text", [])
                    return "".join([t.get("plain_text", "") for t in texts]) or default

                elif prop_type == "select":
                    select = value.get("select")
                    return select.get("name") if select else default

                elif prop_type == "multi_select":
                    items = value.get("multi_select", [])
                    return [item.get("name") for item in items] or default

                elif prop_type == "url":
                    return value.get("url") or default

                elif prop_type == "number":
                    return value.get("number") or default

        return default

    def _blocks_to_text(self, blocks: List[Dict]) -> str:
        """Convert Notion blocks to plain text"""
        text_parts = []

        for block in blocks:
            block_type = block.get("type")

            if block_type == "paragraph":
                text = self._extract_rich_text(block["paragraph"].get("rich_text", []))
                text_parts.append(text)

            elif block_type == "heading_1":
                text = self._extract_rich_text(block["heading_1"].get("rich_text", []))
                text_parts.append(f"\n# {text}\n")

            elif block_type == "heading_2":
                text = self._extract_rich_text(block["heading_2"].get("rich_text", []))
                text_parts.append(f"\n## {text}\n")

            elif block_type == "heading_3":
                text = self._extract_rich_text(block["heading_3"].get("rich_text", []))
                text_parts.append(f"\n### {text}\n")

            elif block_type == "bulleted_list_item":
                text = self._extract_rich_text(block["bulleted_list_item"].get("rich_text", []))
                text_parts.append(f"• {text}")

            elif block_type == "numbered_list_item":
                text = self._extract_rich_text(block["numbered_list_item"].get("rich_text", []))
                text_parts.append(f"- {text}")

            elif block_type == "quote":
                text = self._extract_rich_text(block["quote"].get("rich_text", []))
                text_parts.append(f"> {text}")

            elif block_type == "code":
                text = self._extract_rich_text(block["code"].get("rich_text", []))
                text_parts.append(f"```\n{text}\n```")

        return "\n".join(text_parts)

    def _extract_rich_text(self, rich_text: List[Dict]) -> str:
        """Extract plain text from Notion rich text"""
        return "".join([t.get("plain_text", "") for t in rich_text])

    def _extract_video_content(self, url: str) -> str:
        """Extract transcript from YouTube video"""
        try:
            # Extract video ID from URL
            video_id = None
            patterns = [
                r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?]+)',
                r'youtube\.com\/embed\/([^&\n?]+)'
            ]

            for pattern in patterns:
                match = re.search(pattern, url)
                if match:
                    video_id = match.group(1)
                    break

            if not video_id:
                return ""

            # Get transcript
            transcript = YouTubeTranscriptApi.get_transcript(video_id)
            text = " ".join([entry['text'] for entry in transcript])
            return text

        except Exception as e:
            print(f"⚠️  Could not extract transcript from {url}: {e}")
            return ""

    def _extract_web_content(self, url: str) -> str:
        """Extract content from web page"""
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()

            # Get text
            text = soup.get_text()

            # Clean up whitespace
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = '\n'.join(chunk for chunk in chunks if chunk)

            # Limit to reasonable length
            return text[:10000]

        except Exception as e:
            print(f"⚠️  Could not extract content from {url}: {e}")
            return ""

    def save_to_json(self, documents: List[Dict], output_path: str = "data/notion_knowledge_base.json"):
        """Save extracted documents to JSON file"""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(documents, f, indent=2, ensure_ascii=False)

        print(f"💾 Saved {len(documents)} documents to {output_path}")


if __name__ == "__main__":
    extractor = NotionExtractor()
    documents = extractor.extract_all_content()

    if documents:
        extractor.save_to_json(documents, "backend/data/notion_knowledge_base.json")
    else:
        print("\n⚠️  No documents extracted. Check your Notion credentials and database ID.")
