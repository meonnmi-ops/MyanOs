#!/usr/bin/env python3
"""
Myanos Web OS v2.0.0 - Unified Command Hub
CTO: Meonnmi-ops | Myanmar Advanced Web Operating System

Integrates: Package Manager, Terminal, Desktop, Display Engine, PS2 Layer,
           Android Layer, Toolbox, MyanAi, Myanmar Code
"""

import os, sys, subprocess, platform, json, time
from pathlib import Path

VERSION = "2.0.0"
BANNER = r"""
       ┌──────────────┐
       │   Myanos OS   │
       │  ████████████  │
       │  █▀▀▀▀▀▀▀▀█  │
       │  █ ▀▀▀▀▀▀ █  │
       │    ▀▀▀▀▀▀    │
       └──────────────┘
"""
BASE_DIR = Path(__file__).parent

def show_banner():
    print(f"\033[0;32m{BANNER}\033[0m")
    print(f"  \033[1;36mMyanos Web OS v{VERSION}\033[0m")
    print(f"  Myanmar Programming Language & Web OS")
    print(f"  CTO: Meonnmi-ops")
    print()

def show_neofetch():
    show_banner()
    user = os.environ.get("USER", "meonnmi")
    hostname = "myanos"
    print(f"\033[1;33m{user}@{hostname}\033[0m")
    print("─" * 45)
    print(f"  OS:        Myanos Web OS v{VERSION}")
    print(f"  Shell:     myanos-terminal v1.0.0")
    print(f"  Language:  Myanmar Code (127 keywords)")
    print(f"  Python:    {platform.python_version()}")
    print(f"  Platform:  {platform.system()} {platform.machine()}")
    print(f"  Packages:  .myan (MyanPM)")
    # Count installed packages
    db_path = BASE_DIR / ".myan_db.json"
    if db_path.exists():
        with open(db_path) as f:
            db = json.load(f)
        count = len(db.get("packages", {}))
        print(f"  Installed: {count} packages")
    print("─" * 45)
    print("  🇲🇲 Myanos Web OS - Made in Myanmar")

def show_help():
    show_banner()
    print("📋 Myanos Commands:\n")
    print("System:")
    print("  myanos terminal          Start interactive terminal")
    print("  myanos neofetch          Show system info")
    print("  myanos help              Show this help\n")
    print("Package Manager:")
    print("  myanos pkg list          List installed packages")
    print("  myanos pkg install <file>  Install .myan package")
    print("  myanos pkg remove <name>   Remove package")
    print("  myanos pkg search <q>      Search packages")
    print("  myanos pkg info <name>     Package details\n")
    print("Myanmar Code:")
    print("  myanos mmc run '<code>'  Execute Myanmar Code\n")
    print("Display Engine:")
    print("  myanos display android   Start Android display (noVNC)")
    print("  myanos display ps2       Start PS2 display\n")
    print("Android Layer:")
    print("  myanos android status    Show Android status")
    print("  myanos android install   Install APK file")
    print("  myanos android list      List Android apps\n")
    print("PS2 Layer:")
    print("  myanos ps2 list          List PS2 games")
    print("  myanos ps2 launch        Launch PS2 game\n")
    print("Toolbox:")
    print("  myanos toolbox           Open professional toolbox\n")
    print("Desktop:")
    print("  myanos desktop            Launch web desktop\n")
    print("MyanAi:")
    print("  myanos ai                 MyanAi agent builder\n")
    print("  myanos ai run             Run AI agent\n")
    print("  myanos ai create          Create new agent\n\n")
    print("Examples:")
    print("  myanos neofetch")
    print("  myanos pkg install ./dist/myanmar-code-2.0.1.myan")
    print("  myanos mmc run 'ပုံနှိပ် \"မင်္ဂလာပါ\"'")
    print("  myanos display android")
    print("  myanos toolbox")

def cmd_terminal():
    """Start Myanos interactive terminal"""
    term_script = BASE_DIR / "terminal" / "terminal.py"
    if term_script.exists():
        os.system(f"{sys.executable} {term_script}")
    else:
        print("[WARN] Terminal module not found")
        print("       Install: myanos pkg install ./dist/myanos-terminal-1.0.0.myan")

def cmd_pkg(args):
    """Package manager commands"""
    sys.path.insert(0, str(BASE_DIR))
    from myan_pm import MyanPM
    pm = MyanPM()
    if len(args) < 2:
        pm.list()
        return
    action = args[1]
    if action == "list":
        pm.list()
    elif action == "install" and len(args) > 2:
        pm.install(args[2])
    elif action == "remove" and len(args) > 2:
        pm.remove(args[2])
    elif action == "search" and len(args) > 2:
        pm.search(args[2])
    elif action == "info" and len(args) > 2:
        pm.info(args[2])
    else:
        print("[ERR] Usage: myanos pkg [list|install|remove|search|info]")

def cmd_mmc(args):
    """Myanmar Code execution"""
    if len(args) < 3 or args[1] != "run":
        print("[ERR] Usage: myanos mmc run '<myanmar_code>'")
        return
    code = " ".join(args[2:])
    print(f"[Myanmar Code] Executing...")
    # Try to use myanmar-code package
    try:
        import myanmar_code
        result = myanmar_code.execute(code)
        if result:
            print(result)
    except ImportError:
        print("[INFO] myanmar-code not installed")
        print("       Install: pip install myanmar-code")
        print("       Or:      myanos pkg install ./dist/myanmar-code-2.0.1.myan")

def cmd_display(args):
    """Display engine commands"""
    if len(args) < 2:
        print("[ERR] Usage: myanos display [android|ps2]")
        return
    target = args[1]
    engine_script = BASE_DIR / "display_engine" / "display_engine.py"
    if engine_script.exists():
        os.system(f"{sys.executable} {engine_script} {target}")
    else:
        print(f"[WARN] Display Engine not installed")
        print("       Install: myanos pkg install ./dist/myanos-display-engine-1.0.0.myan")

def cmd_android(args):
    """Android layer commands"""
    if len(args) < 2:
        print("[ERR] Usage: myanos android [status|install|list]")
        return
    action = args[1]
    android_dir = BASE_DIR / "android_layer"
    if not android_dir.exists():
        print("[WARN] Android Layer not installed")
        return
    if action == "status":
        print("[Android Layer Status]")
        print("  WayDroid: Checking...")
        r = os.system("which waydroid > /dev/null 2>&1")
        if r == 0:
            print("  WayDroid: ✅ Installed")
        else:
            print("  WayDroid: ❌ Not installed")
            print("  Install: bash android_layer/setup_waydroid.sh")
        r2 = os.system("which adb > /dev/null 2>&1")
        if r2 == 0:
            print("  ADB: ✅ Available")
        else:
            print("  ADB: ❌ Not available (pkg install android-tools)")
    elif action == "install" and len(args) > 2:
        apk = args[2]
        if os.path.exists(apk):
            print(f"[Android] Installing {apk}...")
            os.system(f"adb install {apk} 2>/dev/null || waydroid app install {apk} 2>/dev/null")
        else:
            print(f"[ERR] APK not found: {apk}")
    elif action == "list":
        print("[Android] Listing apps...")
        os.system("adb shell pm list packages 2>/dev/null || waydroid app list 2>/dev/null")
    else:
        print("[ERR] Usage: myanos android [status|install|list]")

def cmd_ps2(args):
    """PS2 layer commands"""
    if len(args) < 2:
        print("[ERR] Usage: myanos ps2 [list|launch]")
        return
    action = args[1]
    ps2_dir = BASE_DIR / "ps2_layer"
    if not ps2_dir.exists():
        print("[WARN] PS2 Layer not installed")
        return
    if action == "list":
        print("[PS2] Scanning game images...")
        game_dirs = ["~/PS2", "~/games/ps2", "./games"]
        for d in game_dirs:
            expanded = os.path.expanduser(d)
            if os.path.exists(expanded):
                for f in os.listdir(expanded):
                    if f.endswith(('.iso', '.bin', '.img')):
                        print(f"  🎮 {f}")
    elif action == "launch" and len(args) > 2:
        game = args[2]
        print(f"[PS2] Launching {game}...")
        ps2_script = ps2_dir / "ps2_layer.py"
        if ps2_script.exists():
            os.system(f"{sys.executable} {ps2_script} {game}")
        else:
            print("[WARN] PS2 runner not found")
    else:
        print("[ERR] Usage: myanos ps2 [list|launch <game>]")

def cmd_toolbox():
    """Open professional toolbox"""
    tb_dir = BASE_DIR / "toolbox"
    if tb_dir.exists():
        tb_script = tb_dir / "toolbox.py"
        if tb_script.exists():
            os.system(f"{sys.executable} {tb_script}")
            return
    print("╔══════════════════════════════════════════════╗")
    print("║  🔧 Myanos Professional Toolbox v1.0.0      ║")
    print("║  Firmware • Bypass • Storage • Network      ║")
    print("╚══════════════════════════════════════════════╝")
    print()
    tools = [
        ("1", "Firmware Info", "lshw, dmidecode"),
        ("2", "Storage Manager", "lsblk, fdisk, df"),
        ("3", "Network Scanner", "nmap, ss, ip"),
        ("4", "Flash Tool", "dd, etcher-like"),
        ("5", "System Benchmark", "CPU, RAM, Disk speed"),
        ("6", "Process Manager", "htop-like monitor"),
        ("7", "Log Viewer", "syslog, dmesg, journalctl"),
        ("8", "Package Manager", "apt/pkg operations"),
    ]
    print("Available Tools:")
    for num, name, desc in tools:
        print(f"  [{num}] {name:<22} ({desc})")
    print("\n  [0] Exit")
    print()
    choice = input("Myanos $> ").strip()
    if choice == "0":
        print("Bye!")
    elif choice == "1":
        os.system("lshw -short 2>/dev/null || echo 'lshw not available'")
    elif choice == "2":
        os.system("lsblk && echo '---' && df -h")
    elif choice == "3":
        os.system("ip addr 2>/dev/null || ifconfig 2>/dev/null")
    elif choice == "4":
        print("Flash Tool: sudo dd if=image.iso of=/dev/sdX bs=4M status=progress")
    elif choice == "5":
        os.system("python3 -c \"import time; print('Benchmarking...'); t=time.time(); a=list(range(1000000)); print(f'List creation: {time.time()-t:.3f}s')\"")
    elif choice == "6":
        os.system("ps aux --sort=-%mem | head -15 2>/dev/null || ps aux | head -15")
    elif choice == "7":
        os.system("dmesg | tail -20 2>/dev/null || echo 'No dmesg access'")
    elif choice == "8":
        cmd_pkg(["myanos", "pkg", "list"])

def cmd_desktop():
    """Launch Myanos Desktop Environment"""
    desktop_index = BASE_DIR / "desktop" / "index.html"
    if desktop_index.exists():
        import webbrowser
        webbrowser.open(f"file://{desktop_index}")
        print("[OK] Desktop launched in browser!")
        print("     Open: file://" + str(desktop_index))
    else:
        print("[WARN] Desktop not found")
        print("       Install: myanos pkg install ./dist/myanos-desktop-1.0.0.myan")

def cmd_ai(args):
    """MyanAi agent builder"""
    myanai_script = BASE_DIR / "myanai" / "myanai.py"
    if not myanai_script.exists():
        print("[WARN] MyanAi not found")
        print("       Install: myanos pkg install ./dist/myanai-1.0.0.myan")
        return
    sys.path.insert(0, str(BASE_DIR / "myanai"))
 os.chdir(str(BASE_DIR / "myanai"))
 os.system(f"{sys.executable} {myanai_script} {' '.join(args[1:])}")

def main():
    args = sys.argv[1:]
    if not args or args[0] in ("help", "-h", "--help"):
        show_help()
    elif args[0] == "neofetch":
        show_neofetch()
    elif args[0] == "terminal":
        cmd_terminal()
    elif args[0] == "pkg":
        cmd_pkg(args)
    elif args[0] == "mmc":
        cmd_mmc(args)
    elif args[0] == "display":
        cmd_display(args)
    elif args[0] == "android":
        cmd_android(args)
    elif args[0] == "ps2":
        cmd_ps2(args)
    elif args[0] == "toolbox":
        cmd_toolbox()
    elif args[0] == "desktop":
        cmd_desktop()
    elif args[0] == "ai":
        cmd_ai(args)
    elif args[0] == "version" or args[0] == "-v":
        print(f"Myanos Web OS v{VERSION}")
    else:
        print(f"[ERR] Unknown command: {args[0]}")
        print("       Run 'myanos help' for available commands")

if __name__ == "__main__":
    main()
