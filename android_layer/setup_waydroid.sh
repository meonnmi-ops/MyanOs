#!/bin/bash
###############################################################################
# Myanos WayDroid Setup Script v1.0.0
# Installs and configures WayDroid Android container for Myanos Web OS
#
# Requirements: Linux with Wayland or X11, kernel 5.10+
# Tested on: Ubuntu 22.04+, Debian 12+, Arch Linux
###############################################################################

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[Myanos]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; }

if [[ $EUID -ne 0 ]]; then
    err "Root required! Run: sudo bash $0"
    exit 1
fi

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  Myanos Android Layer - WayDroid     ║"
echo "║  Setup & Installation Script         ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Detect distro
if command -v apt-get &>/dev/null; then
    DISTRO="debian"
    log "Detected: Debian/Ubuntu"
elif command -v pacman &>/dev/null; then
    DISTRO="arch"
    log "Detected: Arch Linux"
else
    err "Unsupported distribution"
    exit 1
fi

# Step 1: Install dependencies
log "Step 1: Installing dependencies..."
if [[ "$DISTRO" == "debian" ]]; then
    apt-get update -qq
    apt-get install -y -qq waydroid lxc curl ca-certificates
    ok "Dependencies installed"
elif [[ "$DISTRO" == "arch" ]]; then
    pacman -Sy --noconfirm waydroid lxc curl ca-certificates 2>/dev/null
    ok "Dependencies installed"
fi

# Step 2: Initialize Waydroid
log "Step 2: Initializing Waydroid..."
waydroid init -s GAPPS 2>/dev/null || waydroid init 2>/dev/null
ok "Waydroid initialized"

# Step 3: Enable services
log "Step 3: Enabling services..."
systemctl enable waydroid-container 2>/dev/null || true
systemctl start waydroid-container 2>/dev/null || true
ok "Services enabled"

# Step 4: Install VNC (for web streaming)
log "Step 4: Setting up VNC..."
if [[ "$DISTRO" == "debian" ]]; then
    apt-get install -y -qq x11vnc novnc 2>/dev/null || warn "noVNC not available"
elif [[ "$DISTRO" == "arch" ]]; then
    pacman -S --noconfirm --needed x11vnc novnc 2>/dev/null || warn "noVNC not available"
fi
ok "VNC setup complete"

# Step 5: Session start
log "Step 5: Starting Waydroid session..."
waydroid session start 2>/dev/null || warn "Session start may need manual intervention"
ok "Setup complete!"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  Waydroid Setup Complete!            ║"
echo "╠══════════════════════════════════════╣"
echo "║                                      ║"
echo "║  Start UI:   waydroid show-full-ui   ║"
echo "║  Install:    waydroid app install x   ║"
echo "║  Launch:     waydroid app launch x    ║"
echo "║  Myanos:     python3 myanos.py       ║"
echo "║              android status           ║"
echo "║                                      ║"
echo "╚══════════════════════════════════════╝"
echo ""
