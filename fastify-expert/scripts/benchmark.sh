#!/bin/bash

# Fastify Application Benchmarking Script
# Uses autocannon to benchmark HTTP endpoints

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
URL="${URL:-http://localhost:3000}"
CONNECTIONS="${CONNECTIONS:-100}"
DURATION="${DURATION:-30}"
PIPELINING="${PIPELINING:-10}"
WORKERS="${WORKERS:-4}"
ENDPOINT="${1:-/health/live}"

echo -e "${GREEN}=== Fastify Benchmarking Tool ===${NC}"
echo ""
echo "Configuration:"
echo "  URL: $URL$ENDPOINT"
echo "  Connections: $CONNECTIONS"
echo "  Duration: ${DURATION}s"
echo "  Pipelining: $PIPELINING"
echo "  Workers: $WORKERS"
echo ""

# Check if autocannon is installed
if ! command -v autocannon &> /dev/null; then
    echo -e "${RED}Error: autocannon is not installed${NC}"
    echo "Install with: npm install -g autocannon"
    exit 1
fi

# Check if server is running
if ! curl -s "$URL/health/live" > /dev/null 2>&1; then
    echo -e "${YELLOW}Warning: Server doesn't seem to be running at $URL${NC}"
    echo "Start your server first!"
    exit 1
fi

echo -e "${GREEN}Running benchmark...${NC}"
echo ""

# Run autocannon
autocannon \
  -c "$CONNECTIONS" \
  -d "$DURATION" \
  -p "$PIPELINING" \
  -w "$WORKERS" \
  "$URL$ENDPOINT"

echo ""
echo -e "${GREEN}Benchmark complete!${NC}"
echo ""
echo "Tips for optimization:"
echo "  - Check response schemas are defined (fast-json-stringify)"
echo "  - Profile with clinic.js to find bottlenecks"
echo "  - Monitor database connection pool usage"
echo "  - Consider caching for frequently accessed data"
