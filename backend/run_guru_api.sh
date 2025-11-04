#!/bin/bash

# Run AI Guru Service API

echo "🚀 Starting AI Guru Service API..."
echo "===================================="

cd "$(dirname "$0")"

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your actual API keys!"
    exit 1
fi

# Check if vector store exists
if [ ! -d "data/chroma_db" ]; then
    echo "⚠️  Vector store not found!"
    echo "⚠️  Please run build_memory.sh first to build the knowledge base."
    exit 1
fi

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run the API
python api/guru/app.py
