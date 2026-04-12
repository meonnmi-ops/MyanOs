#!/usr/bin/env python3
"""
Myanos Terminal v1.0.0
Interactive Linux-like terminal for Myanos Web OS
"""

import os, sys, platform, subprocess, json, shlex
from pathlib import Path

VERSION = "1.0.0"
MYANOS_DIR = Path(__file__).parent.parent
HISTORY_FILE = MYANOS_DIR / ".terminal_history"

class MyanosTerminal:
    def __init__(self):
        self.cwd = os.getcwd()
        self.history = []
        self.running = True
        self.user = os.environ.get("USER", "meonnmi")
        self.hostname = "myanos"
        self._load_history()

    def _load_history(self):
        if HISTORY_FILE.exists():
            with open(HISTORY_FILE) as f:
                self.history = [l.strip() for l in f if l.strip()]

    def _save_history(self):
        with open(HISTORY_FILE, 'w') as f:
            for cmd in self.history[-100:]:
                f.write(cmd + "\n")

    def prompt(self):
        cwd_short = self.cwd.replace(os.path.expanduser("~"), "~")
        return f"\033[1;32m{self.user}@{self.hostname}\033[0m:\033[1;34m{cwd_short}\033[0m$ "

    def execute(self, cmd_line):
        if not cmd_line.strip():
            return
        parts = cmd_line.strip().split(maxsplit=1)
        cmd = parts[0]
        args = parts[1] if len(parts) > 1 else ""

        self.history.append(cmd_line)
        if cmd in ("exit", "quit"):
            self.running = False
            return
        elif cmd == "help":
            self.show_help()
        elif cmd == "clear":
            os.system("clear 2>/dev/null || cls 2>/dev/null")
        elif cmd == "pwd":
            print(self.cwd)
        elif cmd == "cd":
            self.cmd_cd(args)
        elif cmd == "ls":
            self.cmd_ls(args)
        elif cmd == "mkdir":
            self.cmd_mkdir(args)
        elif cmd == "touch":
            self.cmd_touch(args)
        elif cmd == "rm":
            self.cmd_rm(args)
        elif cmd == "cat":
            self.cmd_cat(args)
        elif cmd == "echo":
            print(args)
        elif cmd == "whoami":
            print(self.user)
        elif cmd == "hostname":
            print(self.hostname)
        elif cmd == "date":
            import datetime
            print(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        elif cmd == "uname":
            print(f"Myanos OS {VERSION} - {platform.system()} {platform.machine()}")
        elif cmd == "neofetch":
            self.cmd_neofetch()
        elif cmd == "myan":
            self.cmd_myan(args)
        elif cmd == "mmc":
            self.cmd_mmc(args)
        elif cmd == "env":
            for k, v in sorted(os.environ.items()):
                print(f"{k}={v}")
        elif cmd == "export":
            if "=" in args:
                k, v = args.split("=", 1)
                os.environ[k.strip()] = v.strip()
            else:
                print("[ERR] Usage: export KEY=VALUE")
        elif cmd == "history":
            for i, h in enumerate(self.history):
                print(f"  {i+1:>4}  {h}")
        elif cmd == "python" or cmd == "python3":
            print("[Myanos] Python interpreter")
            try:
                import code
                code.interact(local=globals())
            except EOFError:
                pass
        else:
            # Try system command
            self.cmd_system(cmd_line)

    def cmd_cd(self, args):
        if not args or args.strip() == "~":
            self.cwd = os.path.expanduser("~")
        else:
            target = args.strip()
            if not os.path.isabs(target):
                target = os.path.join(self.cwd, target)
            target = os.path.expanduser(target)
            if os.path.isdir(target):
                self.cwd = os.path.realpath(target)
            else:
                print(f"[ERR] No such directory: {args}")

    def cmd_ls(self, args):
        target = self.cwd
        if args.strip():
            t = args.strip()
            t = os.path.expanduser(t)
            if not os.path.isabs(t):
                t = os.path.join(self.cwd, t)
            if os.path.isdir(t):
                target = t
            else:
                print(f"[ERR] Not a directory: {args}")
                return
        try:
            entries = sorted(os.listdir(target))
            dirs = []
            files = []
            for e in entries:
                full = os.path.join(target, e)
                if os.path.isdir(full):
                    dirs.append(("\033[1;34m" + e + "/\033[0m", e))
                else:
                    files.append((e, e))
            for display, _ in dirs + files:
                print(display)
        except PermissionError:
            print(f"[ERR] Permission denied: {target}")

    def cmd_mkdir(self, args):
        if not args:
            print("[ERR] Usage: mkdir <name>")
            return
        name = args.strip()
        path = name if os.path.isabs(name) else os.path.join(self.cwd, name)
        try:
            os.makedirs(path, exist_ok=True)
            print(f"[OK] Created: {name}")
        except Exception as e:
            print(f"[ERR] {e}")

    def cmd_touch(self, args):
        if not args:
            print("[ERR] Usage: touch <name>")
            return
        name = args.strip()
        path = name if os.path.isabs(name) else os.path.join(self.cwd, name)
        try:
            Path(path).touch()
            print(f"[OK] Created: {name}")
        except Exception as e:
            print(f"[ERR] {e}")

    def cmd_rm(self, args):
        if not args:
            print("[ERR] Usage: rm <name>")
            return
        name = args.strip()
        path = name if os.path.isabs(name) else os.path.join(self.cwd, name)
        if "-r" in args or "-rf" in args:
            import shutil
            try:
                shutil.rmtree(path)
                print(f"[OK] Removed: {name}")
            except Exception as e:
                print(f"[ERR] {e}")
        else:
            try:
                os.remove(path)
                print(f"[OK] Removed: {name}")
            except Exception as e:
                print(f"[ERR] {e}")

    def cmd_cat(self, args):
        if not args:
            print("[ERR] Usage: cat <file>")
            return
        name = args.strip()
        path = name if os.path.isabs(name) else os.path.join(self.cwd, name)
        try:
            with open(path) as f:
                print(f.read())
        except Exception as e:
            print(f"[ERR] {e}")

    def cmd_neofetch(self):
        print(r"""
       ┌──────────────┐
       │   Myanos OS   │
       │  ████████████  │
       │  █▀▀▀▀▀▀▀▀█  │
       │  █ ▀▀▀▀▀▀ █  │
       │    ▀▀▀▀▀▀    │
       └──────────────┘
""")
        print(f"\033[1;33m{self.user}@{self.hostname}\033[0m")
        print("─" * 45)
        print(f"  OS:        Myanos Web OS v1.0.0")
        print(f"  Shell:     myanos-terminal v{VERSION}")
        print(f"  Python:    {platform.python_version()}")
        print(f"  Platform:  {platform.system()} {platform.machine()}")
        print(f"  CWD:       {self.cwd}")
        print("─" * 45)
        print("  🇲🇲 Myanos Web OS - Made in Myanmar")

    def cmd_myan(self, args):
        """MyanPM integration"""
        if not args:
            print("[ERR] Usage: myan [list|install|remove|search]")
            return
        sys.path.insert(0, str(MYANOS_DIR))
        os.chdir(MYANOS_DIR)
        from myan_pm import MyanPM
        pm = MyanPM()
        parts = args.strip().split(maxsplit=1)
        action = parts[0]
        if action == "list":
            pm.list()
        elif action == "install" and len(parts) > 1:
            pm.install(parts[1])
        elif action == "remove" and len(parts) > 1:
            pm.remove(parts[1])
        else:
            print("[MyanPM] Commands: list, install, remove, search")

    def cmd_mmc(self, args):
        """Myanmar Code execution"""
        if not args:
            print("[ERR] Usage: mmc '<myanmar_code>'")
            return
        code = args.strip()
        print(f"[Myanmar Code] Running...")
        try:
            import myanmar_code
            result = myanmar_code.execute(code)
            if result:
                print(result)
        except ImportError:
            print("[INFO] Install: pip install myanmar-code")

    def cmd_system(self, cmd_line):
        """Execute system command"""
        try:
            result = subprocess.run(
                cmd_line, shell=True, cwd=self.cwd,
                capture_output=True, text=True, timeout=30
            )
            if result.stdout:
                print(result.stdout, end="")
            if result.stderr:
                print(result.stderr, end="")
        except subprocess.TimeoutExpired:
            print("[ERR] Command timed out")
        except Exception as e:
            print(f"[ERR] {e}")

    def show_help(self):
        print("📋 Myanos Terminal Commands:\n")
        print("Navigation:  ls, cd, pwd, mkdir, touch, rm, cat")
        print("System:      help, clear, exit, whoami, hostname, date")
        print("Info:        uname, neofetch, env, history")
        print("Myanos:      myan (package manager), mmc (Myanmar Code)")
        print("Advanced:    echo, export, python3, any system command")

    def run(self):
        print("\n🟢 Myanos Terminal v1.0.0")
        print("Type 'help' for commands, 'exit' to quit\n")
        while self.running:
            try:
                cmd = input(self.prompt()).strip()
                self.execute(cmd)
            except KeyboardInterrupt:
                print("\n(Ctrl+C)")
            except EOFError:
                self.running = False
        self._save_history()
        print("\n👋 Goodbye!")

if __name__ == "__main__":
    term = MyanosTerminal()
    term.run()
