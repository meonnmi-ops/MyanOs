#!/bin/bash
###############################################################################
#  Myanos OS — ISO Builder v1.0
#  Builds a bootable live ISO with Myanos pre-installed
#
#  Requirements:
#    - Debian/antiX Linux (your laptop)
#    - ~5GB free disk space
#    - Internet connection
#    - USB stick (4GB+) for final ISO
#
#  Usage:
#    bash build-iso.sh
#
#  Output:
#    myanos-live.iso  (~400MB bootable ISO)
#
#  Then: Rufus (Windows) or dd (Linux) -> write to USB -> boot from USB
###############################################################################

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${BLUE}[BUILD]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; }

BUILD_DIR="$HOME/myanos-iso-build"
ISO_NAME="myanos-live.iso"
MYANOS_SRC="$BUILD_DIR/myanos-source"

echo ""
echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}  Myanos OS  ISO Builder v1.0           ${NC}"
echo -e "${CYAN}  Bootable Live USB with Myanos Web OS  ${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""

# --- Step 0: Check free disk space ---
log "Step 0: Checking disk space..."
FREE_SPACE=$(df -BG "$HOME" | awk 'NR==2 {print $4}' | tr -d 'G')
if [ "$FREE_SPACE" -lt 5 ]; then
    err "Need at least 5GB free space. You have ${FREE_SPACE}GB."
    echo "  Free up space and try again."
    exit 1
fi
ok "Disk space OK: ${FREE_SPACE}GB free"

# --- Step 1: Install build tools ---
log "Step 1: Installing build tools..."
if command -v apt-get &>/dev/null; then
    sudo apt-get update
    sudo apt-get install -y \
        live-build \
        debootstrap \
        squashfs-tools \
        xorriso \
        isolinux \
        syslinux-common \
        grub-pc-bin \
        grub-efi-amd64-bin \
        mtools \
        dosfstools \
        git \
        wget \
        2>/dev/null
    ok "Build tools installed"
elif command -v pacman &>/dev/null; then
    sudo pacman -Sy --noconfirm \
        debootstrap \
        squashfs-tools \
        libisoburn \
        syslinux \
        git \
        wget \
        2>/dev/null
    ok "Build tools installed (Arch)"
else
    err "Only Debian/Ubuntu or Arch Linux supported for building."
    exit 1
fi

# --- Step 2: Clone Myanos source ---
log "Step 2: Getting Myanos source..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

if [ -d "$HOME/Downloads/Myanos" ]; then
    log "Using local Myanos from ~/Downloads/Myanos..."
    cp -r "$HOME/Downloads/Myanos" "$MYANOS_SRC"
elif [ -d "$HOME/Myanos" ]; then
    log "Using local Myanos from ~/Myanos..."
    cp -r "$HOME/Myanos" "$MYANOS_SRC"
else
    log "Cloning Myanos from GitHub..."
    git clone --depth 1 https://github.com/meonnmi-ops/Myanos.git "$MYANOS_SRC"
fi

if [ ! -f "$MYANOS_SRC/server.py" ]; then
    err "Myanos source not found!"
    exit 1
fi
ok "Myanos source ready ($(du -sh "$MYANOS_SRC" | cut -f1))"

# --- Step 3: Configure live-build ---
log "Step 3: Configuring live system..."
cd "$BUILD_DIR"
lb clean 2>/dev/null || true

lb config \
    --distribution bookworm \
    --architectures amd64 \
    --archive-areas "main contrib non-free non-free-firmware" \
    --debian-installer false \
    --bootloader syslinux \
    --iso-application "Myanos Web OS" \
    --iso-publisher "meonnmi-ops" \
    --iso-volume "Myanos OS" \
    --memtest none \
    --binary-images iso-hybrid \
    2>&1 | tail -5

ok "Live config created"

# --- Step 4: Add packages ---
log "Step 4: Selecting packages..."

cat > config/package-lists/myanos.list.chroot << 'PKGLIST'
linux-image-amd64
live-boot
systemd-sysv
python3
python3-pip
firefox-esr
xserver-xorg
xserver-xorg-video-all
xserver-xorg-input-all
xinit
x11-xserver-utils
lightdm
lightdm-gtk-greeter
openbox
obconf
tint2
pcmanfm
lxterminal
galculator
geany
network-manager
wpasupplicant
wireless-tools
fonts-dejavu-core
fonts-liberation
fonts-noto-core
sudo
policykit-1
bash-completion
curl
wget
git
nano
htop
PKGLIST

ok "Package list ready"

# --- Step 5: Copy Myanos into chroot ---
log "Step 5: Copying Myanos into live system..."
mkdir -p config/includes.chroot/opt/myanos-source
cp -r "$MYANOS_SRC"/* config/includes.chroot/opt/myanos-source/
ok "Myanos copied to chroot"

# --- Step 6: Create install hooks ---
log "Step 6: Creating install hooks..."

mkdir -p config/hooks/live/chroot

# Hook 1: Install Myanos from copied source
cat > config/hooks/live/chroot/10-install-myanos.hook << 'HOOK1'
#!/bin/bash
set -e
echo "[Myanos] Installing Myanos Web OS..."

mkdir -p /opt/myanos
cp -r /opt/myanos-source/* /opt/myanos/
rm -rf /opt/myanos-source
chown -R root:root /opt/myanos
chmod -R 755 /opt/myanos

pip3 install --break-system-packages psutil 2>/dev/null || \
pip3 install psutil 2>/dev/null || true

echo "[Myanos] Installed to /opt/myanos"
HOOK1
chmod +x config/hooks/live/chroot/10-install-myanos.hook

# Hook 2: Create user + configure auto-start
cat > config/hooks/live/chroot/20-setup-user.hook << 'HOOK2'
#!/bin/bash
set -e
echo "[Myanos] Setting up user and auto-start..."

# Create user
id myanos &>/dev/null || useradd -m -s /bin/bash myanos
echo "myanos:myanos" | chpasswd
usermod -aG sudo,netdev,audio,video,plugdev myanos

# Systemd service: start Myanos server
cat > /etc/systemd/system/myanos.service << 'SVC'
[Unit]
Description=Myanos Web OS Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/myanos
ExecStart=/usr/bin/python3 /opt/myanos/server.py 8080
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SVC

systemctl enable myanos

# LightDM auto-login
cat > /etc/lightdm/lightdm.conf << 'LDM'
[SeatDefaults]
autologin-user=myanos
autologin-user-timeout=0
user-session=openbox
greeter-session=lightdm-greeter
LDM

# Firefox kiosk autostart
mkdir -p /home/myanos/.config/autostart
cat > /home/myanos/.config/autostart/myanos-browser.desktop << 'DSK'
[Desktop Entry]
Type=Application
Name=Myanos OS
Exec=sh -c "sleep 3 && firefox-esr --kiosk http://localhost:8080"
X-GNOME-Autostart-enabled=true
DSK

# Openbox autostart backup
mkdir -p /home/myanos/.config/openbox
cat > /home/myanos/.config/openbox/autostart << 'OB'
(sleep 3 && firefox-esr --kiosk http://localhost:8080) &
OB

# Desktop icon (for non-kiosk use)
mkdir -p /home/myanos/Desktop
cat > /home/myanos/Desktop/myanos.desktop << 'ICO'
[Desktop Entry]
Type=Application
Name=Myanos OS
Exec=firefox-esr http://localhost:8080
Icon=web-browser
Categories=Network;WebBrowser;
ICO

chown -R myanos:myanos /home/myanos
echo "[Myanos] User and auto-start configured"
HOOK2
chmod +x config/hooks/live/chroot/20-setup-user.hook

# Hook 3: Clean up + set hostname
cat > config/hooks/live/chroot/30-finalize.hook << 'HOOK3'
#!/bin/bash
set -e
echo "[Myanos] Finalizing..."

# Set hostname
echo "myanos" > /etc/hostname
echo "127.0.1.1 myanos" >> /etc/hosts

# Clean apt cache to reduce ISO size
apt-get clean
rm -rf /var/lib/apt/lists/*

echo "[Myanos] Finalized"
HOOK3
chmod +x config/hooks/live/chroot/30-finalize.hook

ok "Hooks created"

# --- Step 7: Boot menu ---
log "Step 7: Configuring boot menu..."

mkdir -p config/binary_syslinux
cat > config/binary_syslinux/syslinux.cfg << 'SYS'
DEFAULT myanos
PROMPT 0
TIMEOUT 10

LABEL myanos
    MENU LABEL Myanos OS (Boot to Desktop)
    KERNEL /vmlinuz
    APPEND initrd=/initrd.img boot=live quiet splash
    MENU DEFAULT

LABEL safe
    MENU LABEL Myanos OS (Safe Graphics)
    KERNEL /vmlinuz
    APPEND initrd=/initrd.img boot=live quiet splash nomodeset

LABEL text
    MENU LABEL Myanos OS (Terminal Only)
    KERNEL /vmlinuz
    APPEND initrd=/initrd.img boot=live quiet text
SYS

mkdir -p config/includes.binary/boot/grub
cat > config/includes.binary/boot/grub/grub.cfg << 'GRB'
set timeout=5
set default=0

menuentry "Myanos OS" {
    linux /vmlinuz boot=live quiet splash
    initrd /initrd.img
}

menuentry "Myanos OS (Safe Graphics)" {
    linux /vmlinuz boot=live quiet splash nomodeset
    initrd /initrd.img
}

menuentry "Myanos OS (Terminal)" {
    linux /vmlinuz boot=live quiet splash text
    initrd /initrd.img
}
GRB

ok "Boot menu configured"

# --- Step 8: BUILD ---
log "Step 8: Building ISO..."
echo -e "${YELLOW}  This takes 10-30 minutes. Do NOT close terminal! ${NC}"
echo ""

START_TIME=$(date +%s)

cd "$BUILD_DIR"
sudo lb build 2>&1 | while IFS= read -r line; do
    echo "  $line"
done

END_TIME=$(date +%s)
DURATION=$(( (END_TIME - START_TIME) / 60 ))

# --- Step 9: Verify ---
log "Step 9: Verifying ISO..."
if [ -f "$BUILD_DIR/$ISO_NAME" ]; then
    ISO_SIZE=$(du -sh "$BUILD_DIR/$ISO_NAME" | cut -f1)
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}  Myanos OS ISO Built Successfully!     ${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}  File: ${ISO_NAME}${NC}"
    echo -e "${GREEN}  Size: ${ISO_SIZE}${NC}"
    echo -e "${GREEN}  Path: ${BUILD_DIR}/${ISO_NAME}${NC}"
    echo -e "${GREEN}  Time: ${DURATION} minutes${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo -e "${CYAN}=== Write ISO to USB ===${NC}"
    echo ""
    echo -e "${YELLOW}Option A: Linux dd (fastest)${NC}"
    echo "  lsblk"
    echo "  sudo dd if=${BUILD_DIR}/${ISO_NAME} of=/dev/sdX bs=4M status=progress && sync"
    echo ""
    echo -e "${YELLOW}Option B: BalenaEtcher (safe)${NC}"
    echo "  Download: https://balena.io/etcher/"
    echo "  Open Etcher > Select ISO > Select USB > Flash"
    echo ""
    echo -e "${YELLOW}Option C: Rufus on Windows${NC}"
    echo "  1. Copy ISO to USB/Windows PC"
    echo "  2. Download Rufus: https://rufus.ie/"
    echo "  3. Open Rufus > Select ISO > Select USB > START"
    echo "  4. Choose DD mode if prompted"
    echo ""
    echo -e "${CYAN}=== Boot from USB ===${NC}"
    echo "  1. Insert USB into laptop"
    echo "  2. Turn on laptop, press F12/F2/ESC"
    echo "  3. Select USB from boot menu"
    echo "  4. Myanos starts in 30 seconds!"
    echo ""
else
    err "ISO build failed!"
    echo "  Common fixes:"
    echo "  1. Check internet connection"
    echo "  2. Retry: cd $BUILD_DIR && sudo lb build"
    echo "  3. Clean build: sudo lb clean && lb config && sudo lb build"
    exit 1
fi
