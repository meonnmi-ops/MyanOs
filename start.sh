#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  MyanOS Web OS — Universal Start Script v4.3.0
#  One command to run everything (desktop, terminal, backend)
#  Works on: Termux / Linux / WSL / macOS
# ═══════════════════════════════════════════════════════════════
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Project directory (where this script lives)
MYANOS_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$MYANOS_DIR"

PORT="${1:-8080}"
PID_FILE=".myanos.pid"
LOG_FILE=".myanos.log"

# ── Functions ──────────────────────────────────────────────────
print_banner() {
    echo ""
    echo -e "${CYAN}  ╔══════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}  ║   MyanOS Web OS v4.3.0                  ║${NC}"
    echo -e "${CYAN}  ║   Universal Backend Starter              ║${NC}"
    echo -e "${CYAN}  ╚══════════════════════════════════════════╝${NC}"
    echo ""
}

check_python() {
    if command -v python3 &>/dev/null; then
        PYTHON="python3"
    elif command -v python &>/dev/null; then
        PYTHON="python"
    else
        echo -e "${RED}  [ERR] Python not found. Install Python 3.6+${NC}"
        exit 1
    fi
    PY_VER=$($PYTHON -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
    echo -e "${GREEN}  [OK] Python $PY_VER found${NC}"
}

check_deps() {
    # Try to install psutil for better system stats
    $PYTHON -c "import psutil" 2>/dev/null || {
        echo -e "${YELLOW}  [INFO] psutil not installed (optional — for better system stats)${NC}"
        echo -e "        Run: pip3 install psutil"
    }
}

is_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            return 0
        else
            rm -f "$PID_FILE"
        fi
    fi
    return 1
}

start_server() {
    if is_running; then
        PID=$(cat "$PID_FILE")
        echo -e "${YELLOW}  [INFO] Server already running (PID $PID)${NC}"
        echo -e "        Access: http://localhost:$PORT"
        echo -e "        Stop:   ./start.sh stop"
        return
    fi

    echo -e "${BLUE}  [..] Starting Myanos server on port $PORT...${NC}"
    echo ""

    # Start server in background
    if [ "$1" = "--fg" ]; then
        # Foreground mode
        $PYTHON server.py "$PORT"
    else
        # Background mode (detached)
        nohup $PYTHON -u server.py "$PORT" >> "$LOG_FILE" 2>&1 &
        SERVER_PID=$!
        echo $SERVER_PID > "$PID_FILE"

        # Wait for server to start
        sleep 2

        if is_running; then
            echo -e "${GREEN}  [OK] Server started successfully!${NC}"
            echo ""
            echo -e "  ${CYAN}Desktop:${NC}   http://localhost:$PORT"
            echo -e "  ${CYAN}API:${NC}       http://localhost:$PORT/api/exec"
            echo -e "  ${CYAN}Health:${NC}    http://localhost:$PORT/api/health"
            echo -e "  ${CYAN}Stats:${NC}     http://localhost:$PORT/api/system-stats"
            echo ""
            echo -e "  ${GREEN}Password:${NC}  myanos2024  ${YELLOW}(change in Settings > Security)${NC}"
            echo ""
            echo -e "  Commands:"
            echo -e "    ./start.sh status    — check server status"
            echo -e "    ./start.sh stop      — stop server"
            echo -e "    ./start.sh restart   — restart server"
            echo -e "    ./start.sh log       — show log"
            echo -e "    ./start.sh fg        — run in foreground"
            echo ""
            echo -e "  ${YELLOW}Server running in BACKGROUND. Logs: $LOG_FILE${NC}"
        else
            echo -e "${RED}  [ERR] Server failed to start. Check log:${NC}"
            echo -e "        cat $LOG_FILE"
            rm -f "$PID_FILE"
            exit 1
        fi
    fi
}

stop_server() {
    if ! is_running; then
        echo -e "${YELLOW}  [INFO] Server is not running${NC}"
        rm -f "$PID_FILE"
        return
    fi
    PID=$(cat "$PID_FILE")
    echo -e "${BLUE}  [..] Stopping server (PID $PID)...${NC}"
    kill "$PID" 2>/dev/null
    sleep 2
    # Force kill if still running
    if kill -0 "$PID" 2>/dev/null; then
        kill -9 "$PID" 2>/dev/null
    fi
    rm -f "$PID_FILE"
    echo -e "${GREEN}  [OK] Server stopped${NC}"
}

show_status() {
    if is_running; then
        PID=$(cat "$PID_FILE")
        echo -e "${GREEN}  [OK] Server is RUNNING (PID $PID)${NC}"
        echo -e "        Port:    $PORT"
        echo -e "        Desktop: http://localhost:$PORT"
        echo -e "        Health:  http://localhost:$PORT/api/health"
        # Try to get uptime from health endpoint
        HEALTH=$(curl -s --max-time 3 "http://localhost:$PORT/api/health" 2>/dev/null || echo "{}")
        UPTIME=$(echo "$HEALTH" | $PYTHON -c "import sys,json; d=json.load(sys.stdin); print(f'{int(d.get(\"uptime\",0)//3600)}h {int(d.get(\"uptime\",0)%3600//60)}m {int(d.get(\"uptime\",0)%60)}s')" 2>/dev/null || echo "N/A")
        echo -e "        Uptime:  $UPTIME"
    else
        echo -e "${YELLOW}  [INFO] Server is NOT running${NC}"
    fi
}

show_log() {
    if [ -f "$LOG_FILE" ]; then
        echo -e "${CYAN}  --- Log (last 30 lines) ---${NC}"
        tail -30 "$LOG_FILE"
    else
        echo -e "${YELLOW}  [INFO] No log file found${NC}"
    fi
}

restart_server() {
    stop_server
    sleep 1
    start_server
}

# ── Main ───────────────────────────────────────────────────────
print_banner

case "${1:-start}" in
    start)
        check_python
        check_deps
        start_server "${2:-}"
        ;;
    stop)
        stop_server
        ;;
    status)
        show_status
        ;;
    restart)
        check_python
        restart_server
        ;;
    log)
        show_log
        ;;
    fg|foreground)
        check_python
        check_deps
        PORT="${2:-8080}"
        echo -e "${YELLOW}  Running in FOREGROUND mode (Ctrl+C to stop)${NC}"
        echo ""
        $PYTHON -u server.py "$PORT"
        ;;
    *)
        echo "  Usage: ./start.sh [command] [port]"
        echo ""
        echo "  Commands:"
        echo "    start     Start server in background (default)"
        echo "    stop      Stop running server"
        echo "    status    Check server status"
        echo "    restart   Restart server"
        echo "    log       Show server log"
        echo "    fg        Run in foreground (Ctrl+C to stop)"
        echo ""
        echo "  Examples:"
        echo "    ./start.sh            # Start on port 8080"
        echo "    ./start.sh start 3000 # Start on port 3000"
        echo "    ./start.sh fg 8080    # Foreground on port 8080"
        echo "    ./start.sh stop       # Stop server"
        echo "    ./start.sh status     # Check status"
        echo ""
        ;;
esac
