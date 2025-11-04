#!/bin/bash

# Build Memory/Knowledge Base from Notion

echo "🧠 Building Spiritual Companion Memory"
echo "========================================"

cd "$(dirname "$0")"

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your actual API keys!"
    exit 1
fi

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

echo ""
echo "Step 1: Extracting knowledge from Notion..."
echo "============================================"
python memory_builder/notion_extractor.py

if [ $? -ne 0 ]; then
    echo "❌ Failed to extract from Notion"
    exit 1
fi

echo ""
echo "Step 2: Building vector store..."
echo "================================"
python memory_builder/vector_store.py

if [ $? -ne 0 ]; then
    echo "❌ Failed to build vector store"
    exit 1
fi

echo ""
echo "✅ Memory build complete!"
echo "========================"
echo "You can now run the AI Guru API with: ./run_guru_api.sh"
