# Myanos Web OS 🇲🇲

<p align="center">
  <strong>မြန်မာ့ ပထမဆုံး Advanced Web Operating System</strong>
</p>

---

## အကြောင်းရည်ရွယ်ချက်

**Myanos** (မဲနမ်း) သည် မြန်မာနိုင်ငံ၏ ပထမဆုံး Advanced Web Operating System ဖြစ်ပြီး ကိုယ်ပိုင် Package Manager၊ Linux-like Terminal၊ PS2 Game Emulation၊ Android APK Management နှင့် Professional Toolbox တွေ ပါဝင်ပါသည်။ Python ဖြင့် ရေးသားပြီး Termux/Linux စနစ်တွင် အလုပ်လုပ်ပါသည်။

> **Project Vision**: ကိုယ်ပိုင် package format (`.myan`)၊ ပရိုဂရမ်းဘာသာစကား (Myanmar Code — 127 keywords) နှင့် cross-platform capability တွေ ပါဝင်တဲ့ အပြည့်အစုံ Web OS တစ်ခု ဖန်တီးဖို့။

## အရေးကြီးသော လက်ရှိများ

### 📦 MyanPM — Package Manager
- ကိုယ်ပိုင် `.myan` package format (ZIP-based)
- Package တွေ install/remove/search/list လုပ်နိုင်ပါသည်
- SHA256 checksum verification
- Dependency tracking system
- Package အသစ် ဖန်တီးတဲ့ build tool

### 🖥️ Terminal
- Interactive Linux-like terminal (Python CLI)
- Web-based terminal UI (HTML/JS)
- File navigation: `ls`, `cd`, `pwd`, `mkdir`, `rm`
- System commands: `neofetch`, `uname`, `env`, `history`
- Myanmar Code ဖြစ်စီပြီး execute လုပ်နိုင် (`mmc`)
- Package manager ထက်ခံပါ (`myan`)

### 🎮 PS2 Emulation Layer
- Play! emulator ချိတ်ဆက်ခြင်း
- PCSX2 ထက်ခံခြင်း
- VNC streaming ဖြင့် browser မှာ display ပြမည်
- Game library management
- noVNC ဖြင့် web-based display

### 📱 Android Layer
- WayDroid container ချိတ်ဆက်ခြင်း
- ADB (Android Debug Bridge) ထက်ခံခြင်း
- APK install/uninstall/launch လုပ်နိုင်ပါသည်
- VNC streaming ဖြင့် Android UI ကို browser မှာ ပြနိုင်
- Automated installation setup script

### 🔧 Professional Toolbox
- **Storage**: Disk info, partition manager, disk usage, file analyzer
- **Network**: Port scanner, ping, DNS lookup, download manager
- **System**: Hardware info, process monitor, benchmark, log viewer
- **Flash**: dd-based flash tool, ADB/Fastboot management
- **Security**: SHA256/MD5 hashing, OpenSSL toolkit

### 🇲🇲 Myanmar Code Integration
- Keyword ၁၂၇ ခန့်တင်ထားသော မြန်မာ ပရိုဂရမ်းဘာသာစကား
- Terminal မှာ တိုကျ အသုံးပြုနိုင်
- PyPI package: `myanmar-code`
- Myanos command hub ထဲ ကိုင်တည်ငြိမ်ထား

## စနစ်တည်ဆောက်ပုံ

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
├── setup.sh                # Installation script
├── LICENSE                 # MIT License
├── README.md               # English documentation
└── README.my.md            # Myanmar documentation
```

## စတင်အသုံးပြုခြင်း

### လိုအပ်ချက်များ
- Python 3.8+
- Termux (Android) သို့မဟုတ် Linux
- ညကတည ၁၀MB နေရာ

### တည်ဆောက်ခြင်း

```bash
# Repository ကို clone လုပ်ပါ
git clone https://github.com/meonnmi-ops/Myanos.git
cd Myanos

# Setup လုပ်ပါ
bash setup.sh

# သို့မဟုတ် တိုကျ စတင်အသုံးပြုပါ
python3 myanos.py help
```

### အသုံးပြုပုံ

```bash
# စနစ်အချက်အလက်
python3 myanos.py neofetch

# Package ထိန်းချုပ်မှု
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

### Package အသစ် ဖန်တီးခြင်း

```bash
python3 myan_pm.py build \
  --name myapp \
  --version 1.0.0 \
  --author "Your Name" \
  --desc "My awesome app" \
  --src ./myapp-src \
  --out ./dist
```

## ပါဝင်ပေါ်တွေသော Packages

| Package | Version | Author | အကြောင်းရည်ရွယ်ချက် |
|---------|---------|--------|-------------|
| myanmar-code | 2.0.1 | Aung MoeOo (MWD) | မြန်မာ ပရိုဂရမ်းဘာသာစကား (127 keywords) |
| myanos-terminal | 1.0.0 | Meonnmi-ops | Interactive Linux-like terminal |
| myanos-display-engine | 1.0.0 | Meonnmi-ops | noVNC display streaming |
| myanos-ps2-layer | 1.0.0 | Meonnmi-ops | PlayStation 2 emulation |
| myanos-android-layer | 1.0.0 | Meonnmi-ops | Android APK management |
| myanos-toolbox | 1.0.0 | Meonnmi-ops | Professional system tools |

## အနောက်ဆက်တိုးတက်မှုများ

- [x] Phase 1: Package Manager (MyanPM)
- [x] Phase 2: Terminal (Python + Web)
- [x] Phase 3: PS2 Emulation Layer
- [x] Phase 3.5: Display Engine (noVNC)
- [x] Phase 4: Android Layer (WayDroid)
- [x] Phase 5: Professional Toolbox
- [ ] Phase 6: Desktop Environment (Web UI)
- [ ] Phase 7: MyanAi (Low-Code AI Agent Builder)
- [ ] Phase 8: App Store (Online Registry)

## အသုံးပြုတဲ့ ကိရိယာများ

- **Language**: Python 3.8+
- **Web Terminal**: HTML5, JavaScript, CSS3
- **Display**: noVNC, VNC
- **Android**: WayDroid, ADB
- **Emulation**: Play!, PCSX2
- **Networking**: WebSocket, HTTP

## ရေးသားသူနှင့် ကျေးဇူးတင်စွာများ

- **CTO / Lead Developer**: Meonnmi-ops
- **Myanmar Code Language**: Aung MoeOo (MWD)
- **AI Integration**: Z-AI (Super Z)
- **Framework**: Myanos Web OS Platform

## License

ဤ Project သည် MIT License အောက်တွင် ရှိပါသည် — [LICENSE](LICENSE) ဖိုင်ကို ကြည့်ပါ။

---

<p align="center">
  🇲🇲 ❤️ ဖြင့် မြန်မာပြည်တွင် ပြုစုပါသည်
</p>
