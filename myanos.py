#!/usr/bin/env python3
"""
Myanos Web OS v2.1.0 - Unified Command Hub
CTO: Meonnmi-ops | Myanmar Advanced Web Operating System

Integrates: Package Manager, Terminal, Desktop, Display Engine, PS2 Layer,
           Android Layer, Toolbox, MyanAi, Myanmar Code, App Store

v2.1.0 Changes:
  - App Store integration (search, install, browse, categories)
  - Enhanced pkg command (remote install, search, update)
  - Repository management commands
"""

import os
import sys
import subprocess
import platform
import json
import time
import argparse
from pathlib import Path

VERSION = "2.1.0"
BASE_DIR = Path(__file__).parent

BANNER = r"""
       ┌──────────────────┐
       │   Myanos OS v2.1 │
       │  ██████████████   │
       │  █▀▀▀▀▀▀▀▀▀█    │
       │  █ ▀▀▀▀▀▀▀ █    │
       │  █ APP STORE █    │
       │    ▀▀▀▀▀▀▀▀     │
       └──────────────────┘
"""

HELP_TEXT = """
Myanos Web OS v{version} - Unified Command Hub
CTO: Meonnmi-ops | Myanmar Advanced Web Operating System

Commands:
  myanos help              Show this help message
  myanos version           Show version info
  myanos neofetch          Display system info

  Package Manager:
  myanos pkg list          List installed packages
  myanos pkg install PATH  Install .myan package (local)
  myanos pkg remote NAME   Install package from registry
  myanos pkg search QUERY  Search installed packages
  myanos pkg rsearch QUERY Search remote registry
  myanos pkg update        Check for updates
  myanos pkg info NAME     Package details
  myanos pkg remove NAME   Remove package
  myanos pkg build         Build .myan package

  App Store:
  myanos appstore search QUERY    Search App Store
  myanos appstore list            List all packages
  myanos appstore info NAME       Package details
  myanos appstore install NAME    Download & install
  myanos appstore featured        Featured packages
  myanos appstore popular         Popular packages
  myanos appstore recent          Recent updates
  myanos appstore categories      List categories
  myanos appstore stats           Registry statistics

  Repository:
  myanos repo list          List configured repos
  myanos repo add URL       Add remote repo
  myanos repo remove URL    Remove repo

  Other:
  myanos terminal          Interactive terminal
  myanos desktop           Launch web desktop
  myanos display android|ps2  Display engine
  myanos android STATUS    Android layer
  myanos ps2 list          PS2 games
  myanos toolbox           Professional toolbox
  myanos ai [run|create]   MyanAi agent
  myanos mmc run 'CODE'    Myanmar Code

Examples:
  myanos appstore search tool
  myanos appstore install myanmar-code
  myanos pkg remote myanos-toolbox
  myanos repo list
"""


def cmd_neofetch():
    """Display system information"""
    uname = platform.uname()
    print(f"""
    OS:        Myanos Web OS v{VERSION}
    Host:      {uname.node}
    Kernel:    {uname.system} {uname.release}
    Arch:      {uname.machine}
    Python:    {platform.python_version()}
    Terminal:  {os.environ.get('TERM', 'unknown')}
    Shell:     {os.environ.get('SHELL', 'unknown')}
    PWD:       {os.getcwd()}
    Packages:  {len(get_installed_count())} installed
    """)


def get_installed_count():
    """Get count of installed packages"""
    db_file = BASE_DIR / ".myan_db.json"
    if db_file.exists():
        with open(db_file, 'r') as f:
            db = json.load(f)
        return db.get("packages", {})
    return {}


def cmd_pkg(args):
    """Package Manager commands"""
    pm_path = BASE_DIR / "myan_pm.py"
    if not pm_path.exists():
        print(f"[ERR] MyanPM not found: {pm_path}")
        return

    if not args:
        print("Usage: myanos pkg [list|install|remote|search|rsearch|update|info|remove|build]")
        return

    subcmd = args[0]

    if subcmd == "list":
        run_pm(["list"])
    elif subcmd == "install" and len(args) > 1:
        run_pm(["install", args[1]])
    elif subcmd == "remote" and len(args) > 1:
        run_pm(["install-remote", args[1]])
    elif subcmd == "search" and len(args) > 1:
        run_pm(["search", " ".join(args[1:])])
    elif subcmd == "rsearch" and len(args) > 1:
        category = None
        query_parts = []
        for a in args[1:]:
            if a.startswith("--category=") or a.startswith("-c="):
                category = a.split("=", 1)[1]
            else:
                query_parts.append(a)
        cmd = ["search-remote", " ".join(query_parts)]
        if category:
            cmd.extend(["--category", category])
        run_pm(cmd)
    elif subcmd == "update":
        name = args[1] if len(args) > 1 else None
        cmd = ["update"]
        if name:
            cmd.append(name)
        run_pm(cmd)
    elif subcmd == "info" and len(args) > 1:
        run_pm(["info", args[1]])
    elif subcmd == "remove" and len(args) > 1:
        run_pm(["remove", args[1]])
    elif subcmd == "build":
        run_pm(["build"] + args[1:])
    elif subcmd == "repo-add" and len(args) > 1:
        run_pm(["repo-add", args[1]])
    elif subcmd == "repo-remove" and len(args) > 1:
        run_pm(["repo-remove", args[1]])
    elif subcmd == "repo-list":
        run_pm(["repo-list"])
    else:
        print("Usage: myanos pkg [list|install|remote|search|rsearch|update|info|remove|build|repo-add|repo-remove|repo-list]")


def run_pm(pm_args):
    """Run MyanPM with arguments"""
    pm_path = BASE_DIR / "myan_pm.py"
    try:
        result = subprocess.run(
            [sys.executable, str(pm_path)] + pm_args,
            capture_output=True, text=True, timeout=30
        )
        if result.stdout:
            print(result.stdout.rstrip())
        if result.stderr:
            print(result.stderr.rstrip(), file=sys.stderr)
    except subprocess.TimeoutExpired:
        print("[ERR] Command timed out")
    except Exception as e:
        print(f"[ERR] {e}")


def cmd_appstore(args):
    """App Store commands"""
    client_path = BASE_DIR / "appstore" / "client.py"
    if not client_path.exists():
        print(f"[ERR] App Store client not found: {client_path}")
        print("       Run: python3 appstore/registry_server.py --init")
        return

    if not args:
        # Default: show featured packages
        run_appstore_client(["featured"])
        return

    subcmd = args[0]

    if subcmd == "search" and len(args) > 1:
        run_appstore_client(["search", " ".join(args[1:])])
    elif subcmd == "list":
        extra = []
        for a in args[1:]:
            extra.append(a)
        run_appstore_client(["list"] + extra)
    elif subcmd == "info" and len(args) > 1:
        run_appstore_client(["info", args[1]])
    elif subcmd == "install" and len(args) > 1:
        run_appstore_client(["install", args[1]])
    elif subcmd == "featured":
        run_appstore_client(["featured"])
    elif subcmd == "popular":
        run_appstore_client(["popular"] + args[1:])
    elif subcmd == "recent":
        run_appstore_client(["recent"] + args[1:])
    elif subcmd == "categories":
        run_appstore_client(["categories"])
    elif subcmd == "stats":
        run_appstore_client(["stats"])
    elif subcmd == "publish" and len(args) > 1:
        run_appstore_client(["publish", args[1]])
    else:
        print("Usage: myanos appstore [search|list|info|install|featured|popular|recent|categories|stats|publish]")


def run_appstore_client(client_args):
    """Run App Store client"""
    client_path = BASE_DIR / "appstore" / "client.py"
    try:
        result = subprocess.run(
            [sys.executable, str(client_path)] + client_args,
            capture_output=True, text=True, timeout=30
        )
        if result.stdout:
            print(result.stdout.rstrip())
        if result.stderr:
            print(result.stderr.rstrip(), file=sys.stderr)
    except subprocess.TimeoutExpired:
        print("[ERR] Request timed out")
    except Exception as e:
        print(f"[ERR] {e}")


def cmd_repo(args):
    """Repository management commands"""
    pm_path = BASE_DIR / "myan_pm.py"
    if not args:
        run_pm(["repo-list"])
        return

    subcmd = args[0]
    if subcmd == "list":
        run_pm(["repo-list"])
    elif subcmd == "add" and len(args) > 1:
        run_pm(["repo-add", args[1]])
    elif subcmd == "remove" and len(args) > 1:
        run_pm(["repo-remove", args[1]])
    else:
        print("Usage: myanos repo [list|add URL|remove URL]")


def cmd_terminal():
    """Launch interactive terminal"""
    term_path = BASE_DIR / "terminal" / "terminal.py"
    if term_path.exists():
        os.system(f"{sys.executable} {term_path}")
    else:
        print("[ERR] Terminal not found")


def cmd_desktop():
    """Launch web desktop"""
    desktop_path = BASE_DIR / "desktop" / "index.html"
    if desktop_path.exists():
        print(f"[INFO] Opening desktop...")
        import webbrowser
        webbrowser.open(f"file://{desktop_path}")
    else:
        print("[ERR] Desktop not found")


def cmd_display(args):
    """Display engine commands"""
    disp_path = BASE_DIR / "display_engine" / "display_engine.py"
    if disp_path.exists():
        run_py(disp_path, args)
    else:
        print("[ERR] Display engine not found")


def cmd_android(args):
    """Android layer commands"""
    vnc_path = BASE_DIR / "android_layer" / "vnc_server.py"
    if vnc_path.exists():
        run_py(vnc_path, args)
    else:
        print("[ERR] Android layer not found")


def cmd_ps2(args):
    """PS2 layer commands"""
    ps2_path = BASE_DIR / "ps2_layer" / "ps2_layer.py"
    if ps2_path.exists():
        run_py(ps2_path, args)
    else:
        print("[ERR] PS2 layer not found")


def cmd_toolbox(args):
    """Professional toolbox"""
    tb_path = BASE_DIR / "toolbox" / "toolbox.py"
    if tb_path.exists():
        run_py(tb_path, args)
    else:
        print("[ERR] Toolbox not found")


def cmd_ai(args):
    """MyanAi agent"""
    ai_path = BASE_DIR / "myanai" / "myanai.py"
    if ai_path.exists():
        run_py(ai_path, args)
    else:
        print("[ERR] MyanAi not found")


def cmd_mmc(args):
    """Myanmar Code interpreter"""
    mmc_path = BASE_DIR / "packages" / "myanmar-code" / "mmc.py"
    if mmc_path.exists():
        run_py(mmc_path, args)
    else:
        print("[ERR] Myanmar Code not found")


def cmd_server(args):
    """Start App Store registry server"""
    server_path = BASE_DIR / "appstore" / "registry_server.py"
    if server_path.exists():
        run_py(server_path, args)
    else:
        print("[ERR] Registry server not found")


def run_py(script_path, args):
    """Run a Python script with arguments"""
    try:
        result = subprocess.run(
            [sys.executable, str(script_path)] + (args or []),
            capture_output=True, text=True, timeout=120
        )
        if result.stdout:
            print(result.stdout.rstrip())
        if result.stderr:
            print(result.stderr.rstrip(), file=sys.stderr)
    except subprocess.TimeoutExpired:
        print("[ERR] Command timed out")
    except Exception as e:
        print(f"[ERR] {e}")


def main():
    parser = argparse.ArgumentParser(
        prog="myanos",
        description="Myanos Web OS v2.1.0 - Unified Command Hub",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=HELP_TEXT.format(version=VERSION),
    )
    parser.add_argument("command", nargs="?", help="Command to run")
    parser.add_argument("args", nargs="*", help="Command arguments")
    parser.add_argument("--version", "-v", action="version", version=f"Myanos OS v{VERSION}")

    args = parser.parse_args()

    if not args.command or args.command == "help":
        print(BANNER)
        print(HELP_TEXT.format(version=VERSION))
        return

    if args.command == "version":
        print(f"Myanos Web OS v{VERSION}")
        return

    if args.command == "neofetch":
        cmd_neofetch()
    elif args.command == "pkg":
        cmd_pkg(args.args)
    elif args.command == "appstore":
        cmd_appstore(args.args)
    elif args.command == "repo":
        cmd_repo(args.args)
    elif args.command == "terminal":
        cmd_terminal()
    elif args.command == "desktop":
        cmd_desktop()
    elif args.command == "display":
        cmd_display(args.args)
    elif args.command == "android":
        cmd_android(args.args)
    elif args.command == "ps2":
        cmd_ps2(args.args)
    elif args.command == "toolbox":
        cmd_toolbox(args.args)
    elif args.command == "ai":
        cmd_ai(args.args)
    elif args.command == "mmc":
        cmd_mmc(args.args)
    elif args.command == "server":
        cmd_server(args.args)
    else:
        print(f"[ERR] Unknown command: {args.command}")
        print("Run 'myanos help' for available commands")


if __name__ == "__main__":
    main()
