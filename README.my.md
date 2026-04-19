# MyanOS Web OS 🇲🇲

<p align="center">
  <strong>မြန်မာ့ ပထမဆုံး Web Operating System</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Live-myanos.pages.dev-blue" />
  <img src="https://img.shields.io/badge/Version-3.0.0-blue" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" />
  <img src="https://img.shields.io/badge/100%25_Real-Working-brightgreen" />
</p>

<p align="center">
  <b>တကယ် run ကြည့်ရမယ်:</b> <a href="https://meonnmi-ops.github.io/Myanos/desktop/">meonnmi-ops.github.io/Myanos/desktop</a>
</p>

---

## MyanOS ဆိုတာဘယ်လို？

**MyanOS** သည် browser ထဲမှာတော့ အလုပ်လုပ်တဲ့ အပြည့်စုံ Web Operating System ဖြစ်ပါသည်। Install လုပ်ရမှဖြစ်၊ Server လိုမဟုတ်လား — Desktop experience အတွက် ဘာမရှိပါ။ Realistic boot sequence၊ window manager၊ App ၁၅ ခု၊ virtual file system၊ terminal တို့ အမြင် Pure HTML/CSS/JavaScript ဖြင့် ရေးသားထားပါသည်။

Python backend server (`server.py`) နဲ့ ချိတ်ဆက်ထားရင် real shell command execution၊ system monitoring၊ AI integration နှင့် MyanPM package management တို့ အသုံးပြုနိုင်ပါသည်။

> **အဓိက ဈေးနှုန်း**: ဤ project တွေး **အကြောင်းတရားအလုပ်လုပ်တဲ့ အရာတွေသာ** ဖြစ်ပါသည်। Simulated data မရှိ၊ fake system မရှိ၊ mock API မရှိပါ။ Backend service မရှိရင် features တို့ gracefully degrade လုပ်ပြီး ကျေးဇူးတင်စွာ message ပြရနိုင်ပါသည်။

---

## Live Demo

Browser ထဲမှာ တိုကျဖွင့်ပြီး ကြည့်နိုင်ပါသည်:

**🌐 [https://meonnmi-ops.github.io/Myanos/desktop/](https://meonnmi-ops.github.io/Myanos/desktop/)**

### Server မလိုဘဲ Browser မှာ အလုပ်လုပ်တဲ့အရာများ:

- Boot sequence အပြည့်စုံ (BIOS POST → GRUB → Loading)
- Desktop (App icon ၁၅ ခု၊ right-click menu၊ wallpaper ၆ မျိုး)
- Window manager (drag, resize, minimize, maximize, close)
- Start menu + App search
- Taskbar (battery, network, clock)
- Virtual File System (localStorage-based, full CRUD)
- Terminal (offline command ၂၀+)
- File Manager, Code Editor, Notepad, Myanmar Code Editor
- Settings (font size, accent color, wallpaper)
- Lock Screen (real clock)
- Toolbox (color picker, stopwatch, timer)
- Web Browser (iframe-based)

---

## စတင်အသုံးပြုခြင်း

### နည်းလမ်း ၁: တိုက်ဖွင့်ပြီး ကြည့်ရန်

```bash
git clone https://github.com/meonnmi-ops/Myanos.git
cd Myanos/desktop
# index.html ကို browser မှာဖွင်းပါ — အလုပ်လုပ်ပါသည်
```

### နည်းလမ်း ၂: Python Backend နဲ့ (အသေးစိတ်အရာအားလုံး)

```bash
git clone https://github.com/meonnmi-ops/Myanos.git
cd Myanos
python3 server.py
# http://localhost:8080 ကို browser မှာဖွင်းပါ
```

### နည်းလမ်း ၃: CLI Mode (Browser မလို)

```bash
python3 myanos.py help       # အကြောင်းပြောပေး
python3 myanos.py terminal   # Terminal
python3 myanos.py neofetch   # System info
python3 myanos.py toolbox    # Toolbox
```

---

## Desktop Environment (v3.0.0)

Desktop သည် ကိုယ်ပိုင် အပြည့်စုံ single-page application ဖြစ်ပါသည်:

| Component | ဖော်ပြချက် |
|---|---|
| **Boot Sequence** | 3-phase: BIOS POST → GRUB bootloader → Loading bar |
| **Window Manager** | Drag, resize, minimize, maximize, close လုပ်နိုင် |
| **Taskbar** | Start menu, running apps, system tray |
| **Virtual File System** | localStorage-based VFS (CRUD အပြည့်စုံ) |
| **Context Menus** | Desktop right-click (new file/folder, wallpaper, settings) |
| **Notifications** | Toast notification system |
| **Lock Screen** | Password lock + real-time clock |
| **Wallpapers** | CSS gradient theme ၆ မျိုး |

---

## Tech Stack

- **Desktop**: Pure HTML5, CSS3, Vanilla JavaScript (zero dependencies)
- **Backend**: Python 3.8+ (stdlib only)
- **AI**: Ollama local LLMs (optional)
- **Display**: noVNC, VNC (optional)

---

## Author & Credits

- **CTO / Lead Developer**: Meonnmi-ops
- **Myanmar Code Language**: Aung MoeOo (MWD)
- **AI Integration**: Z-AI (Super Z)

## License

MIT License — [LICENSE](LICENSE) ကို ကြည့်ပါ။

---

<p align="center">
  🇲🇲 ❤️ ဖြင့် မြန်မာပြည်တွင် ပြုစုပါသည်
</p>
