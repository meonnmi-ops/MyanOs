#!/bin/bash
###############################################################################
# Myanos Web OS - Setup Script v1.0.0
# Author: Meonnmi-ops (CTO, Myanos Project)
#
# Usage: bash setup.sh
# Compatible: Termux (Android), Linux (Debian/Ubuntu/Arch)
###############################################################################

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${BLUE}[Myanos]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; }

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  Myanos Web OS v1.0.0 — Setup                  ║"
echo "║  Myanmar's First Advanced Web Operating System  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Detect environment
if command -v pkg &>/dev/null; then
    ENV="termux"
    log "Detected: Termux (Android)"
elif command -v apt-get &>/dev/null; then
    ENV="debian"
    log "Detected: Debian/Ubuntu"
elif command -v pacman &>/dev/null; then
    ENV="arch"
    log "Detected: Arch Linux"
else
    ENV="unknown"
    warn "Unknown environment"
fi

# Step 1: Check Python
log "Step 1: Checking Python..."
if command -v python3 &>/dev/null; then
    PY_VER=$(python3 --version 2>&1)
    ok "Python found: $PY_VER"
else
    err "Python3 not found!"
    if [[ "$ENV" == "termux" ]]; then
        echo "  Install: pkg install python"
    else
        echo "  Install: sudo apt install python3"
    fi
    exit 1
fi

# Step 2: Install dependencies
log "Step 2: Installing dependencies..."
if [[ "$ENV" == "termux" ]]; then
    pkg install -y python git 2>/dev/null || true
elif [[ "$ENV" == "debian" ]]; then
    sudo apt-get install -y python3 git python3-pip 2>/dev/null || true
elif [[ "$ENV" == "arch" ]]; then
    sudo pacman -S --noconfirm python git 2>/dev/null || true
fi
ok "Dependencies ready"

# Step 3: Install Myanmar Code
log "Step 3: Installing Myanmar Code..."
pip install myanmar-code 2>/dev/null && ok "myanmar-code installed" || warn "myanmar-code install failed (optional)"

# Step 4: Install all .myan packages
log "Step 4: Installing Myanos packages..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

for pkg in dist/*.myan; do
    if [[ -f "$pkg" ]]; then
        python3 myan_pm.py install "$pkg" 2>/dev/null && ok "Installed: $(basename $pkg)" || warn "Failed: $(basename $pkg)"
    fi
done

# Step 5: Make scripts executable
log "Step 5: Setting permissions..."
chmod +x myanos.py myan_pm.py 2>/dev/null || true
chmod +x terminal/terminal.py 2>/dev/null || true
chmod +x android_layer/setup_waydroid.sh 2>/dev/null || true
ok "Permissions set"

# Step 6: Verify
log "Step 6: Verifying installation..."
echo ""
python3 myanos.py neofetch
echo ""

echo "╔══════════════════════════════════════════════════╗"
echo "║  Myanos Web OS — Setup Complete!               ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║                                                  ║"
echo "║  Quick Start:                                    ║"
echo "║  python3 myanos.py help                          ║"
echo "║  python3 myanos.py neofetch                      ║"
echo "║  python3 myanos.py terminal                      ║"
echo "║  python3 myanos.py toolbox                       ║"
echo "║                                                  ║"
echo "║  GitHub: https://github.com/meonnmi-ops/Myanos   ║"
echo "║                                                  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
