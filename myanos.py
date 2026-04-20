#!/usr/bin/env python3
"""
Myanos Web OS v2.0.0 - Unified Command Hub
CTO: Meonnmi-ops | Myanmar Advanced Web Operating System

Integrates: Package Manager, Terminal, Desktop,
           Toolbox, MyanAi, Myanmar Code
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
    print("  Myanos Web OS - Made in Myanmar")

def show_help():
    show_banner()
    print("Myanos Commands:\n")
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
    print("Toolbox:")
    print("  myanos toolbox           Open professional toolbox\n")
    print("Desktop:")
    print("  myanos desktop            Launch web desktop\n")
    print("MyanAi:")
    print("  myanos ai                 MyanAi agent builder")
    print("  myanos ai run             Run AI agent")
    print("  myanos ai create          Create new agent\n")
    print("Examples:")
    print("  myanos neofetch")
    print("  myanos pkg install ./dist/myanmar-code-2.0.1.myan")
    print("  myanos mmc run '<myanmar_code>'")
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

def cmd_toolbox():
    """Open professional toolbox"""
    tb_dir = BASE_DIR / "toolbox"
    if tb_dir.exists():
        tb_script = tb_dir / "toolbox.py"
        if tb_script.exists():
            os.system(f"{sys.executable} {tb_script}")
            return
    print("  Myanos Professional Toolbox v1.0.0")
    print("  Firmware / Storage / Network / Benchmark")
    print()
    tools = [
        ("1", "Firmware Info", "lshw, dmidecode"),
        ("2", "Storage Manager", "lsblk, fdisk, df"),
        ("3", "Network Scanner", "nmap, ss, ip"),
        ("4", "System Benchmark", "CPU, RAM, Disk speed"),
        ("5", "Process Manager", "htop-like monitor"),
        ("6", "Log Viewer", "syslog, dmesg"),
        ("7", "Package Manager", "apt/pkg operations"),
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
        os.system("python3 -c \"import time; print('Benchmarking...'); t=time.time(); a=list(range(1000000)); print(f'List creation: {time.time()-t:.3f}s')\"")
    elif choice == "5":
        os.system("ps aux --sort=-%mem | head -15 2>/dev/null || ps aux | head -15")
    elif choice == "6":
        os.system("dmesg | tail -20 2>/dev/null || echo 'No dmesg access'")
    elif choice == "7":
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
    elif args[0] == "toolbox":
        cmd_toolbox()
    elif args[0] == "desktop":
        cmd_desktop()
    elif args[0] == "ai":
        cmd_ai(args)
    elif args[0] == "version" or args[0] == "-v":
        print(f"Myanos Web OS v{VERSION}")
    elif args[0] in ("display", "android", "ps2"):
        print(f"[INFO] '{args[0]}' commands are disabled on this platform.")
        print("       These features require local display access (not available on cloud hosting).")
    else:
        print(f"[ERR] Unknown command: {args[0]}")
        print("       Run 'myanos help' for available commands")

if __name__ == "__main__":
    main()
