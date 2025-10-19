#!/bin/bash

# Fastify Application Profiling Script
# Uses clinic.js to profile Node.js applications

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if clinic is installed
if ! command -v clinic &> /dev/null; then
    echo -e "${RED}Error: clinic is not installed${NC}"
    echo "Install with: npm install -g clinic"
    exit 1
fi

# Profile type from argument
PROFILE_TYPE="${1:-doctor}"
APP_SCRIPT="${2:-src/server.js}"

case $PROFILE_TYPE in
    doctor)
        TITLE="Doctor - General Health Check"
        DESCRIPTION="Detects event loop delays, CPU bottlenecks, I/O issues, and memory problems"
        ;;
    flame)
        TITLE="Flame - CPU Profiling"
        DESCRIPTION="Shows CPU usage with flamegraphs to identify hot functions"
        ;;
    bubble|bubbleprof)
        TITLE="Bubbleprof - Async Operations"
        DESCRIPTION="Visualizes async operations to find database and I/O bottlenecks"
        PROFILE_TYPE="bubbleprof"
        ;;
    heap)
        TITLE="Heap Profiler - Memory Analysis"
        DESCRIPTION="Analyzes memory usage and detects memory leaks"
        ;;
    *)
        echo -e "${RED}Error: Unknown profile type '$PROFILE_TYPE'${NC}"
        echo ""
        echo "Usage: $0 [doctor|flame|bubble|heap] [app-script]"
        echo ""
        echo "Profile types:"
        echo "  doctor      - General health check (event loop, CPU, I/O, memory)"
        echo "  flame       - CPU profiling with flamegraphs"
        echo "  bubble      - Async operations and I/O analysis"
        echo "  heap        - Memory profiling and leak detection"
        echo ""
        echo "Example:"
        echo "  $0 doctor src/server.js"
        exit 1
        ;;
esac

echo -e "${GREEN}=== Clinic.js Profiling Tool ===${NC}"
echo ""
echo -e "${BLUE}Profile Type:${NC} $TITLE"
echo -e "${BLUE}Description:${NC} $DESCRIPTION"
echo -e "${BLUE}App Script:${NC} $APP_SCRIPT"
echo ""

if [ "$PROFILE_TYPE" = "heap" ]; then
    echo -e "${YELLOW}Starting heap profiler...${NC}"
    echo "The application will start. Generate some load, then stop it (Ctrl+C)"
    echo ""
    clinic heapprofiler -- node "$APP_SCRIPT"
else
    echo -e "${YELLOW}Starting $PROFILE_TYPE profiler...${NC}"
    echo "The application will start. You should:"
    echo "  1. Wait for the app to be ready"
    echo "  2. Run a benchmark or generate load"
    echo "  3. Stop the app (Ctrl+C)"
    echo ""
    echo "Example load generation:"
    echo "  autocannon -c 100 -d 30 http://localhost:3000"
    echo ""

    clinic "$PROFILE_TYPE" -- node "$APP_SCRIPT"
fi

echo ""
echo -e "${GREEN}Profiling complete! Report should open automatically.${NC}"
echo ""
echo "Next steps:"
case $PROFILE_TYPE in
    doctor)
        echo "  - Look for warnings about event loop, I/O, or memory"
        echo "  - Red or orange indicators suggest problems"
        echo "  - Use flame or bubbleprof for deeper analysis"
        ;;
    flame)
        echo "  - Wide bars = CPU-intensive functions"
        echo "  - Look for JSON.parse/stringify (use schemas!)"
        echo "  - Deep stacks might indicate excessive function calls"
        ;;
    bubbleprof)
        echo "  - Large bubbles = slow async operations"
        echo "  - Check database queries and external API calls"
        echo "  - Consider caching or optimizing slow operations"
        ;;
    heap)
        echo "  - Compare snapshots to find memory leaks"
        echo "  - Look for growing object counts"
        echo "  - Check for unclosed connections or listeners"
        ;;
esac
