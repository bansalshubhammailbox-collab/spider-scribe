"""
Vector Store Builder

Builds and manages the vector database for RAG (Retrieval-Augmented Generation)
from the Notion knowledge base.
"""

import os
from typing import List, Dict, Any
from dotenv import load_dotenv
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from langchain.text_splitter import RecursiveCharacterTextSplitter
import json

load_dotenv()


class VectorStoreBuilder:
    def __init__(self):
        self.persist_directory = os.getenv("CHROMA_PERSIST_DIRECTORY", "./backend/data/chroma_db")
        self.embedding_model_name = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

        # Initialize ChromaDB
        self.client = chromadb.PersistentClient(path=self.persist_directory)

        # Initialize embedding model
        print(f"🔄 Loading embedding model: {self.embedding_model_name}")
        self.embedding_model = SentenceTransformer(self.embedding_model_name)

        # Text splitter for chunking
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=int(os.getenv("CHUNK_SIZE", 1000)),
            chunk_overlap=int(os.getenv("CHUNK_OVERLAP", 200)),
            length_function=len,
        )

        # Create or get collection
        self.collection = self.client.get_or_create_collection(
            name="spiritual_knowledge",
            metadata={"description": "Spiritual guidance knowledge base from Notion"}
        )

        print(f"✅ Vector store initialized at {self.persist_directory}")

    def build_from_documents(self, documents: List[Dict[str, Any]]):
        """Build vector store from extracted Notion documents"""
        print(f"\n🔨 Building vector store from {len(documents)} documents...")

        all_chunks = []
        all_embeddings = []
        all_metadatas = []
        all_ids = []

        chunk_counter = 0

        for doc in documents:
            # Split document into chunks
            chunks = self._chunk_document(doc)

            for i, chunk in enumerate(chunks):
                chunk_id = f"{doc['id']}_chunk_{i}"

                # Create metadata
                metadata = {
                    "doc_id": doc["id"],
                    "title": doc["title"],
                    "doc_type": doc["doc_type"],
                    "source": doc["source"],
                    "chunk_index": i,
                    "total_chunks": len(chunks)
                }

                if doc.get("url"):
                    metadata["url"] = doc["url"]

                if doc.get("guru_related"):
                    metadata["guru"] = doc["guru_related"]

                if doc.get("tags"):
                    metadata["tags"] = ",".join(doc["tags"])

                all_chunks.append(chunk)
                all_metadatas.append(metadata)
                all_ids.append(chunk_id)
                chunk_counter += 1

        # Generate embeddings in batches
        print(f"🧮 Generating embeddings for {len(all_chunks)} chunks...")
        batch_size = 100

        for i in range(0, len(all_chunks), batch_size):
            batch_chunks = all_chunks[i:i+batch_size]
            batch_embeddings = self.embedding_model.encode(
                batch_chunks,
                show_progress_bar=False,
                convert_to_numpy=True
            )
            all_embeddings.extend(batch_embeddings.tolist())

            if (i // batch_size + 1) % 10 == 0:
                print(f"  Processed {i + len(batch_chunks)}/{len(all_chunks)} chunks...")

        # Add to ChromaDB
        print(f"💾 Storing {len(all_chunks)} chunks in vector database...")
        batch_size = 500

        for i in range(0, len(all_chunks), batch_size):
            self.collection.add(
                documents=all_chunks[i:i+batch_size],
                embeddings=all_embeddings[i:i+batch_size],
                metadatas=all_metadatas[i:i+batch_size],
                ids=all_ids[i:i+batch_size]
            )

        print(f"✅ Vector store built successfully with {len(all_chunks)} chunks!")
        return len(all_chunks)

    def _chunk_document(self, doc: Dict[str, Any]) -> List[str]:
        """Chunk a document into smaller pieces"""
        content = doc.get("content", "")

        if not content or len(content.strip()) == 0:
            return []

        # Add title as context to each chunk
        title = doc.get("title", "")
        full_text = f"Document: {title}\n\n{content}"

        # Split into chunks
        chunks = self.text_splitter.split_text(full_text)

        return chunks

    def search(self, query: str, n_results: int = 5, guru_filter: str = None) -> List[Dict]:
        """Search the vector store"""
        # Generate query embedding
        query_embedding = self.embedding_model.encode([query])[0].tolist()

        # Build where clause for filtering
        where_clause = None
        if guru_filter:
            where_clause = {"guru": guru_filter}

        # Search
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where_clause
        )

        # Format results
        formatted_results = []
        if results["documents"] and len(results["documents"]) > 0:
            for i in range(len(results["documents"][0])):
                formatted_results.append({
                    "content": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": results["distances"][0][i] if results["distances"] else None
                })

        return formatted_results

    def get_stats(self) -> Dict:
        """Get vector store statistics"""
        count = self.collection.count()
        return {
            "total_chunks": count,
            "collection_name": self.collection.name,
            "persist_directory": self.persist_directory
        }


def build_memory_from_notion(notion_json_path: str = "backend/data/notion_knowledge_base.json"):
    """Main function to build memory from Notion data"""
    print("=" * 60)
    print("🧠 SPIRITUAL COMPANION - MEMORY BUILDER")
    print("=" * 60)

    # Load documents from JSON
    if not os.path.exists(notion_json_path):
        print(f"❌ Notion data file not found: {notion_json_path}")
        print("   Run notion_extractor.py first to extract data from Notion")
        return

    with open(notion_json_path, 'r', encoding='utf-8') as f:
        documents = json.load(f)

    print(f"📚 Loaded {len(documents)} documents from {notion_json_path}")

    # Build vector store
    vector_store = VectorStoreBuilder()
    chunk_count = vector_store.build_from_documents(documents)

    # Show stats
    stats = vector_store.get_stats()
    print("\n" + "=" * 60)
    print("📊 MEMORY BUILD COMPLETE")
    print("=" * 60)
    print(f"Total documents: {len(documents)}")
    print(f"Total chunks: {stats['total_chunks']}")
    print(f"Storage location: {stats['persist_directory']}")
    print("=" * 60)

    # Test search
    print("\n🧪 Testing vector search...")
    test_query = "What is the meaning of dharma?"
    results = vector_store.search(test_query, n_results=3)

    print(f"\nQuery: '{test_query}'")
    print(f"Found {len(results)} results:\n")

    for i, result in enumerate(results, 1):
        print(f"{i}. {result['metadata'].get('title', 'Unknown')}")
        print(f"   Type: {result['metadata'].get('doc_type', 'Unknown')}")
        print(f"   Preview: {result['content'][:150]}...")
        print()


if __name__ == "__main__":
    build_memory_from_notion()
