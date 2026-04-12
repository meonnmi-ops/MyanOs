# Myanos Web OS 🇲🇲

<p align="center">
  <strong>Myanmar's First Advanced Web Operating System</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue" />
  <img src="https://img.shields.io/badge/Python-3.8+-green" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" />
  <img src="https://img.shields.io/badge/Packages-6-orange" />
</p>

---

## Overview

**Myanos** (မြန်နိုစ့်) is Myanmar's first advanced Web Operating System, featuring a custom package manager, Linux-like terminal, PS2 game emulation, Android APK management, and a professional toolbox — all built with Python and designed to run on Termux/Linux systems.

> **Project Vision**: A complete web-based OS with its own package format (`.myan`), programming language integration (Myanmar Code with 127 keywords), and cross-platform capabilities.

## Features

### 📦 MyanPM — Package Manager
- Custom `.myan` package format (ZIP-based)
- Install, remove, search, list packages
- SHA256 checksum verification
- Dependency tracking system
- Build tool for creating new packages

### 🖥️ Terminal
- Interactive Linux-like terminal (Python CLI)
- Web-based terminal UI (HTML/JS)
- File navigation: `ls`, `cd`, `pwd`, `mkdir`, `rm`
- System commands: `neofetch`, `uname`, `env`, `history`
- Built-in Myanmar Code execution (`mmc`)
- Built-in package manager (`myan`)

### 🎮 PS2 Emulation Layer
- Play! emulator integration
- PCSX2 support
- VNC streaming to web browser
- Game library management
- Web-based display via noVNC

### 📱 Android Layer
- WayDroid container integration
- ADB (Android Debug Bridge) support
- APK install/uninstall/launch
- VNC streaming of Android UI to browser
- Setup script for automated installation

### 🔧 Professional Toolbox
- **Storage**: Disk info, partition manager, disk usage, file analyzer
- **Network**: Port scanner, ping, DNS lookup, download manager
- **System**: Hardware info, process monitor, benchmark, log viewer
- **Flash**: dd-based flash tool, ADB/Fastboot management
- **Security**: SHA256/MD5 hashing, OpenSSL toolkit

### 🇲🇲 Myanmar Code Integration
- 127 keywords Myanmar programming language
- Direct execution from terminal
- PyPI package: `myanmar-code`
- Integrated into Myanos command hub

## Project Structure

```
myanos/
├── myanos.py               # Unified Command Hub (main entry)
├── myan_pm.py              # MyanPM Package Manager
├── terminal/
│   ├── terminal.py         # Python CLI terminal
│   └── index.html          # Web-based terminal UI
├── display_engine/
│   └── display_engine.py   # noVNC Display Engine
├── ps2_layer/
│   └── ps2_layer.py        # PS2 Emulation Layer
├── android_layer/
│   ├── vnc_server.py       # Android APK Manager
│   └── setup_waydroid.sh   # WayDroid Setup Script
├── toolbox/
│   └── toolbox.py          # Professional Toolbox
├── packages/
│   ├── registry.py         # Package Registry
│   └── myanmar-code/
│       └── mmc.py          # Myanmar Code CLI
├── dist/                   # Built .myan packages
│   ├── myanmar-code-2.0.1.myan
│   ├── myanos-terminal-1.0.0.myan
│   ├── myanos-display-engine-1.0.0.myan
│   ├── myanos-ps2-layer-1.0.0.myan
│   ├── myanos-android-layer-1.0.0.myan
│   └── myanos-toolbox-1.0.0.myan
├── setup.sh                # Installation script
├── LICENSE                 # MIT License
├── .gitignore
├── README.md               # English documentation
└── README.my.md            # Myanmar documentation
```

## Quick Start

### Requirements
- Python 3.8+
- Termux (Android) or Linux
- 10MB disk space

### Installation

```bash
# Clone the repository
git clone https://github.com/meonnmi-ops/Myanos.git
cd Myanos

# Run setup
bash setup.sh

# Or just start using it
python3 myanos.py help
```

### Usage

```bash
# System info
python3 myanos.py neofetch

# Package management
python3 myanos.py pkg list
python3 myanos.py pkg install ./dist/myanmar-code-2.0.1.myan
python3 myanos.py pkg remove myanmar-code

# Terminal
python3 myanos.py terminal

# Myanmar Code
python3 myanos.py mmc run 'ပုံနှိပ် "မင်္ဂလာပါ"'

# Display Engine (noVNC)
python3 myanos.py display android
python3 myanos.py display ps2

# Android Layer
python3 myanos.py android status
python3 myanos.py android install app.apk

# PS2 Layer
python3 myanos.py ps2 list
python3 myanos.py ps2 launch 1

# Toolbox
python3 myanos.py toolbox
```

## .myan Package Format

```
myapp-1.0.0.myan (ZIP archive)
├── MANIFEST.json       # Package metadata
├── CHECKSUM.sha256     # File integrity hashes
└── data/               # Package files
    ├── main.py
    ├── config.json
    └── assets/
```

### Building a Package

```bash
python3 myan_pm.py build \
  --name myapp \
  --version 1.0.0 \
  --author "Your Name" \
  --desc "My awesome app" \
  --src ./myapp-src \
  --out ./dist
```

## Built-in Packages

| Package | Version | Author | Description |
|---------|---------|--------|-------------|
| myanmar-code | 2.0.1 | Aung MoeOo (MWD) | Myanmar programming language (127 keywords) |
| myanos-terminal | 1.0.0 | Meonnmi-ops | Interactive Linux-like terminal |
| myanos-display-engine | 1.0.0 | Meonnmi-ops | noVNC display streaming |
| myanos-ps2-layer | 1.0.0 | Meonnmi-ops | PlayStation 2 emulation |
| myanos-android-layer | 1.0.0 | Meonnmi-ops | Android APK management |
| myanos-toolbox | 1.0.0 | Meonnmi-ops | Professional system tools |

## Roadmap

- [x] Phase 1: Package Manager (MyanPM)
- [x] Phase 2: Terminal (Python + Web)
- [x] Phase 3: PS2 Emulation Layer
- [x] Phase 3.5: Display Engine (noVNC)
- [x] Phase 4: Android Layer (WayDroid)
- [x] Phase 5: Professional Toolbox
- [ ] Phase 6: Desktop Environment (Web UI)
- [ ] Phase 7: MyanAi (Low-Code AI Agent Builder)
- [ ] Phase 8: App Store (Online Registry)

## Tech Stack

- **Language**: Python 3.8+
- **Web Terminal**: HTML5, JavaScript, CSS3
- **Display**: noVNC, VNC
- **Android**: WayDroid, ADB
- **Emulation**: Play!, PCSX2
- **Networking**: WebSocket, HTTP

## Author & Credits

- **CTO / Lead Developer**: Meonnmi-ops
- **Myanmar Code Language**: Aung MoeOo (MWD)
- **AI Integration**: Z-AI (Super Z)
- **Framework**: Myanos Web OS Platform

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  🇲🇲 Made in Myanmar with ❤️
</p>
