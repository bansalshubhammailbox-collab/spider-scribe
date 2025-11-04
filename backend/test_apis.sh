#!/bin/bash

# Test Backend APIs

echo "🧪 Testing Spiritual Companion APIs"
echo "===================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

test_endpoint() {
    local name=$1
    local url=$2
    local method=${3:-GET}
    local data=$4

    echo ""
    echo "Testing: $name"
    echo "URL: $url"

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ SUCCESS${NC} (HTTP $http_code)"
        echo "$body" | python -m json.tool 2>/dev/null || echo "$body"
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code)"
        echo "$body"
    fi
}

# Check if APIs are running
echo ""
echo "Checking if APIs are running..."

if ! curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo -e "${RED}✗ Content API not running${NC}"
    echo "  Start it with: ./run_content_api.sh"
    exit 1
else
    echo -e "${GREEN}✓ Content API is running${NC}"
fi

if ! curl -s http://localhost:8002/health > /dev/null 2>&1; then
    echo -e "${RED}✗ AI Guru API not running${NC}"
    echo "  Start it with: ./run_guru_api.sh"
    exit 1
else
    echo -e "${GREEN}✓ AI Guru API is running${NC}"
fi

echo ""
echo "======================================"
echo "CONTENT API TESTS"
echo "======================================"

test_endpoint "Health Check" "http://localhost:8001/health"
test_endpoint "Get All Bhajans" "http://localhost:8001/bhajans"
test_endpoint "Get Krishna Bhajans" "http://localhost:8001/bhajans?guru=KRISHNA"
test_endpoint "Get All Stories" "http://localhost:8001/stories"
test_endpoint "Get Shiva Stories" "http://localhost:8001/stories?guru=SHIVA"

echo ""
echo "======================================"
echo "AI GURU API TESTS"
echo "======================================"

test_endpoint "Health Check" "http://localhost:8002/health"

test_endpoint "Chat - Dharma Question" "http://localhost:8002/chat" "POST" \
    '{"query": "What is dharma?", "guru": "KRISHNA", "language": "en"}'

test_endpoint "Chat - Peace Question" "http://localhost:8002/chat" "POST" \
    '{"query": "How can I find inner peace?", "guru": "SHIVA", "language": "en"}'

test_endpoint "Risk Detection - Low Risk" "http://localhost:8002/detect-risk" "POST" \
    '{"query": "What is meditation?", "guru": "KRISHNA", "language": "en"}'

test_endpoint "Risk Detection - Medium Risk" "http://localhost:8002/detect-risk" "POST" \
    '{"query": "Should I sell my house?", "guru": "KRISHNA", "language": "en"}'

test_endpoint "Stats" "http://localhost:8002/stats"

echo ""
echo "======================================"
echo "✅ TESTING COMPLETE"
echo "======================================"
