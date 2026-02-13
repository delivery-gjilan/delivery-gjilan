#!/usr/bin/env bash
# ngrok Management Script for Delivery Gjilan Project (macOS/Linux)
# Usage: ./scripts/ngrok-start.sh [api|all|customer|driver]

MODE=${1:-api}
KILL_EXISTING=${2:-}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 ngrok Tunnel Manager${NC}\n"

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}✗ ngrok not found. Install it first:${NC}"
    echo "  https://ngrok.com/download"
    exit 1
fi

NGROK_VERSION=$(ngrok version 2>&1)
echo -e "${GREEN}✓ ngrok found: $NGROK_VERSION${NC}"

# Kill existing if requested
if [ "$KILL_EXISTING" = "-k" ]; then
    echo -e "${YELLOW}Stopping existing ngrok sessions...${NC}"
    ngrok kill 2>/dev/null || true
    sleep 2
    echo -e "${GREEN}✓ Previous sessions stopped${NC}\n"
fi

echo -e "${YELLOW}Starting mode: $MODE${NC}\n"

case $MODE in
    api)
        echo "Tunnel: API (4000)"
        echo -e "${GREEN}→ Dashboard: http://localhost:4040${NC}\n"
        ngrok start api
        ;;
    all)
        echo "Tunnels: API (4000) + Metro Customer (8082) + Metro Driver (8083)"
        echo -e "${GREEN}→ Dashboard: http://localhost:4040${NC}\n"
        ngrok start --all
        ;;
    customer)
        echo "Tunnel: Metro Customer (8082)"
        echo -e "${GREEN}→ Dashboard: http://localhost:4040${NC}\n"
        ngrok start metro-customer
        ;;
    driver)
        echo "Tunnel: Metro Driver (8083)"
        echo -e "${GREEN}→ Dashboard: http://localhost:4040${NC}\n"
        ngrok start metro-driver
        ;;
    *)
        echo -e "${RED}Invalid mode: $MODE${NC}"
        echo "Valid options: api, all, customer, driver"
        exit 1
        ;;
esac

echo -e "\n${GREEN}Tunnel running!${NC}"
echo "Press Ctrl+C to stop"
