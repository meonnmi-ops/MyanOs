---
title: MyanOS Web OS
sdk: docker
emoji: 💻
colorFrom: blue
colorTo: blue
---
# MyanOS Web OS 🇲🇲

<p align="center">
  <strong>Myanmar's First Web Operating System</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Live-myanos.pages.dev-blue" />
  <img src="https://img.shields.io/badge/Version-3.0.0-blue" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" />
  <img src="https://img.shields.io/badge/Python-3.8+-green" />
  <img src="https://img.shields.io/badge/Apps-15-orange" />
  <img src="https://img.shields.io/badge/100%25_Real-Working-brightgreen" />
</p>

<p align="center">
  <b>Try it live:</b> <a href="https://meonnmi-ops.github.io/Myanos/desktop/">meonnmi-ops.github.io/Myanos/desktop</a>
</p>

---

## What is MyanOS?

**MyanOS** is a complete web-based operating system that runs entirely in your browser. No installation, no server required for the desktop experience. It features a realistic boot sequence, window manager, 15 built-in applications, virtual file system, and a full terminal — all built with pure HTML/CSS/JavaScript.

When paired with the Python backend server (`server.py`), it unlocks advanced features like real shell command execution, system monitoring, AI integration, and package management via MyanPM.

> **Key Principle**: Everything in this project is **real and working**. No simulated data, no fake systems, no mock APIs. Features gracefully degrade with clear messaging when backend services are unavailable.

---

## Live Demo

Open in your browser right now — no installation needed:

**🌐 [https://meonnmi-ops.github.io/Myanos/desktop/](https://meonnmi-ops.github.io/Myanos/desktop/)**

### What works in the browser (no server):

- Full boot sequence (BIOS POST → GRUB → Loading)
- Desktop with 15 app icons, right-click context menus, 6 wallpapers
- Window manager (drag, resize, minimize, maximize, close)
- Start menu with app search
- Taskbar with system tray (battery, network, clock)
- Virtual File System (localStorage-based, full CRUD)
- Terminal with 20+ offline commands
- File Manager, Code Editor, Notepad, Myanmar Code Editor
- Settings (font size, accent color, wallpaper)
- Lock Screen with real clock
- Toolbox (color picker, stopwatch, timer)
- Web Browser (iframe-based)
- Keyboard shortcuts & notifications

---

## Quick Start

### Option 1: Just Open It

```bash
# Clone and open in browser
git clone https://github.com/meonnmi-ops/Myanos.git
cd Myanos/desktop
# Open index.html in any browser — it just works
```

### Option 2: With Python Backend (Full Features)

```bash
git clone https://github.com/meonnmi-ops/Myanos.git
cd Myanos

# Start server (default port 8080)
python3 server.py

# Open http://localhost:8080 in your browser
```

### Option 3: CLI Mode (No Browser)

```bash
python3 myanos.py help       # Show all commands
python3 myanos.py terminal   # Interactive terminal
python3 myanos.py neofetch   # System info
python3 myanos.py toolbox    # Professional toolbox
```

---

## Features

### 🖥️ Desktop Environment (v3.0.0)

The desktop is a fully self-contained single-page application:

| Component | Description |
|---|---|
| **Boot Sequence** | 3-phase realistic boot: BIOS POST → GRUB bootloader → Loading bar |
| **Window Manager** | Draggable, resizable windows with minimize/maximize/close |
| **Taskbar** | Start menu, running apps, system tray (battery/network/clock) |
| **Virtual File System** | localStorage-based VFS with full CRUD operations |
| **Context Menus** | Desktop right-click (new file/folder, wallpaper, settings) |
| **Notifications** | Toast notification system (info/success/warning/error) |
| **Lock Screen** | Password lock with real-time clock |
| **Wallpapers** | 6 built-in CSS gradient themes |

### 📱 Built-in Applications (15)

| App | Description | Works Offline? |
|---|---|---|
| ⬛ **Terminal** | Linux-like shell with 20+ commands | ✅ Core commands |
| 📁 **File Manager** | Browse, open, edit, delete VFS files | ✅ Full |
| 📊 **System Monitor** | CPU, RAM, Disk, GPU, Processes | Server required |
| ⚙️ **Settings** | Font size, accent color, wallpaper | ✅ Full |
| ℹ️ **About Myanos** | System info (neofetch-style) | Partial (server = full) |
| 🇲🇲 **Myanmar Code** | Keyword panel, editor, runner | ✅ Full |
| 📦 **MyanPM** | Package manager UI | Server required |
| 💻 **Code Editor** | Syntax-aware with line numbers | ✅ Full |
| 📝 **Notepad** | Plain text editor | ✅ Full |
| 🔧 **Toolbox** | Color picker, stopwatch, timer | ✅ Full |
| 📱 **Android** | APK management via ADB | Server required |
| 🎮 **PS2 Games** | PlayStation 2 game launcher | Server required |
| 🤖 **MyanAi** | AI Agent chat (Ollama-powered) | Server + Ollama |
| 🧠 **AI Training Center** | Code notebook, training pipeline | Server + Ollama |
| 🌐 **Web Browser** | iframe-based web browser | ✅ (needs internet) |

### 📦 MyanPM — Package Manager

Custom `.myan` package format (ZIP-based) with:

- Install, remove, search, list packages
- SHA256 checksum verification
- Dependency tracking system
- Build tool for creating new packages

```bash
python3 myan_pm.py build --name myapp --version 1.0.0 --author "You" --desc "My app" --src ./src --out ./dist
```

### 🇲🇲 Myanmar Code Integration

127-keyword Myanmar programming language:

```bash
python3 myanos.py mmc run 'ပုံနှိပ် "မင်္ဂလာပါ"'
```

### 🔧 Backend API (server.py)

When `server.py` is running, these API endpoints are available:

| Endpoint | Method | Description |
|---|---|---|
| `/api/system-stats` | GET | Real CPU/RAM/Disk/GPU metrics |
| `/api/exec` | POST | Execute shell commands |
| `/api/myan` | POST | Package manager operations |
| `/api/training` | POST | AI training code execution |
| `/api/packages` | GET | List available packages |

---

## Project Structure

```
Myanos/
├── desktop/                    # ★ Web Desktop (works as static site)
│   ├── index.html              # Main desktop HTML
│   ├── css/
│   │   └── style.css           # Tokyo Night theme (1400+ lines)
│   └── js/
│       └── desktop.js          # Full OS logic (3800+ lines)
├── server.py                   # Python HTTP server + API
├── myanos.py                   # Unified CLI command hub
├── shell.py                    # MMR Shell v1.0.0
├── myan_pm.py                  # MyanPM package manager
├── terminal/                   # Standalone terminal
│   ├── terminal.py             # Python CLI terminal
│   └── index.html              # Web terminal UI
├── myanai/
│   └── myanai.py               # Low-code AI agent builder
├── toolbox/
│   └── toolbox.py              # Professional system toolbox
├── display_engine/
│   └── display_engine.py       # noVNC display streaming
├── ps2_layer/
│   └── ps2_layer.py            # PS2 emulation layer
├── android_layer/
│   ├── vnc_server.py           # Android APK manager
│   └── setup_waydroid.sh       # WayDroid automated setup
├── packages/
│   ├── registry.py             # Package registry
│   └── myanmar-code/
│       └── mmc.py              # Myanmar Code CLI
├── setup.sh                    # Installation script
├── LICENSE                     # MIT License
├── README.md                   # English docs
└── README.my.md                # Myanmar docs
```

---

## Tech Stack

- **Desktop**: Pure HTML5, CSS3, Vanilla JavaScript (zero dependencies)
- **Backend**: Python 3.8+ (stdlib only — `http.server`, `json`, `subprocess`)
- **AI**: Ollama local LLMs (optional — deepseek-r1, qwen2.5)
- **Display**: noVNC, VNC (optional)
- **Android**: WayDroid, ADB (optional)

---

## Roadmap

- [x] Phase 1: Package Manager (MyanPM)
- [x] Phase 2: Terminal (Python + Web)
- [x] Phase 3: PS2 Emulation Layer
- [x] Phase 3.5: Display Engine (noVNC)
- [x] Phase 4: Android Layer (WayDroid)
- [x] Phase 5: Professional Toolbox
- [x] Phase 6: Desktop Environment (Web UI)
- [x] Phase 7: MyanAI Agent Builder
- [x] Phase 7.5: AI Training Center
- [ ] Phase 8: App Store (Online Registry)
- [ ] Phase 9: Multi-user Support
- [ ] Phase 10: Cloud Sync

---

## Author & Credits

- **CTO / Lead Developer**: Meonnmi-ops
- **Myanmar Code Language**: Aung MoeOo (MWD)
- **AI Integration**: Z-AI (Super Z)
- **Framework**: MyanOS Web OS Platform

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  🇲🇲 Made in Myanmar with ❤️
</p>