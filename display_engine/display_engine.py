#!/usr/bin/env python3
"""
Myanos Display Engine v1.0.0
noVNC Integration for streaming Android & PS2 displays to browser
"""

import os, sys, json, subprocess, socket, time
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading

VERSION = "1.0.0"
BASE_DIR = Path(__file__).parent.parent

class MyanosDisplayEngine:
    def __init__(self):
        self.vnc_port = 5900
        self.web_port = 6080
        self.ws_port = 6081
        self.services = {}

    def check_port(self, port):
        """Check if port is available"""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('localhost', port))
                return True
            except OSError:
                return False

    def start_vnc(self, display=":1", geometry="1280x720", depth=24):
        """Start VNC server"""
        print(f"[Display] Starting VNC server on display {display}...")

        # Check for available VNC servers
        vnc_servers = {
            "x11vnc": "x11vnc",
            "tigervnc": "Xvnc",
            "tightvnc": "tightvncserver",
        }

        available = None
        for name, binary in vnc_servers.items():
            try:
                subprocess.run(["which", binary], capture_output=True, check=True)
                available = name
                break
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue

        if not available:
            print("[WARN] No VNC server found!")
            print("       Install one of: x11vnc, tigervnc, tightvnc")
            print("       sudo apt install tigervnc-standalone-server")
            return False

        if available == "x11vnc":
            cmd = [
                "x11vnc", f"-display", display,
                "-geometry", geometry, "-depth", str(depth),
                f"-rfbport", str(self.vnc_port),
                "-nopw", "-shared", "-forever",
                "-o", "/tmp/myanos-vnc.log"
            ]
        elif available == "tigervnc":
            cmd = [
                "Xvnc", display,
                "-geometry", geometry, "-depth", str(depth),
                f"-rfbport", str(self.vnc_port),
                "-SecurityTypes", "None",
                "-AlwaysShared"
            ]

        try:
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            self.services['vnc'] = proc
            time.sleep(2)
            print(f"[OK] VNC server started on port {self.vnc_port}")
            return True
        except Exception as e:
            print(f"[ERR] Failed to start VNC: {e}")
            return False

    def start_novnc(self):
        """Start noVNC web client"""
        novnc_dir = Path("/usr/share/novnc")

        if not novnc_dir.exists():
            print("[WARN] noVNC not found!")
            print("       Install: sudo apt install novnc")
            print("       Or clone: git clone https://github.com/novnc/noVNC.git")
            return False

        if not self.check_port(self.web_port):
            print(f"[ERR] Port {self.web_port} already in use")
            return False

        print(f"[Display] Starting noVNC on port {self.web_port}...")
        cmd = [
            sys.executable,
            str(novnc_dir / "utils" / "novnc_proxy"),
            f"--vnc", f"localhost:{self.vnc_port}",
            f"--listen", str(self.web_port)
        ]

        try:
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            self.services['novnc'] = proc
            time.sleep(1)
            print(f"[OK] noVNC web client: http://localhost:{self.web_port}/vnc.html")
            return True
        except Exception as e:
            print(f"[ERR] Failed to start noVNC: {e}")
            return False

    def start_android_display(self):
        """Start Android display via WayDroid + VNC"""
        print("\n[Display] ═══ Android Display Mode ═══\n")

        # Check WayDroid
        try:
            subprocess.run(["which", "waydroid"], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("[WARN] WayDroid not installed!")
            print("       Install: bash android_layer/setup_waydroid.sh")
            return False

        # Start WayDroid
        print("[Display] Starting WayDroid session...")
        try:
            subprocess.Popen(
                ["waydroid", "session", "start"],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            time.sleep(2)

            subprocess.Popen(
                ["waydroid", "show-full-ui"],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            time.sleep(3)
            print("[OK] Waydroid session started")
        except Exception as e:
            print(f"[ERR] WayDroid failed: {e}")
            return False

        # Start VNC
        if self.start_vnc(":0"):
            # Start noVNC
            self.start_novnc()
            print(f"\n[OK] Android display ready!")
            print(f"     Open: http://localhost:{self.web_port}/vnc.html")
            return True
        return False

    def start_ps2_display(self):
        """Start PS2 emulator display via VNC"""
        print("\n[Display] ═══ PS2 Display Mode ═══\n")

        # Check for PS2 emulator
        emulators = ["play", "pcsx2", "pcsx2-qt"]
        emu_path = None
        for emu in emulators:
            try:
                r = subprocess.run(["which", emu], capture_output=True)
                if r.returncode == 0:
                    emu_path = emu
                    break
            except:
                continue

        if not emu_path:
            print("[WARN] No PS2 emulator found!")
            print("       Install Play!: https://github.com/jpd002/Play-")
            print("       Or PCSX2: sudo apt install pcsx2")
            return False

        print(f"[Display] Found emulator: {emu_path}")

        # Start VNC
        if self.start_vnc(":0"):
            self.start_novnc()
            print(f"\n[OK] PS2 display ready!")
            print(f"     Launch games in emulator, view via browser")
            print(f"     Open: http://localhost:{self.web_port}/vnc.html")
            return True
        return False

    def status(self):
        """Show display engine status"""
        print("\n[Display Engine Status]")
        print("─" * 40)
        print(f"  VNC Port:    {self.vnc_port}")
        print(f"  Web Port:    {self.web_port}")
        print(f"  WS Port:     {self.ws_port}")

        # Check services
        for name, proc in self.services.items():
            if proc.poll() is None:
                print(f"  {name}:       ✅ Running (PID {proc.pid})")
            else:
                print(f"  {name}:       ❌ Stopped")

        # Check system tools
        tools = ["x11vnc", "Xvnc", "waydroid", "play"]
        for tool in tools:
            r = subprocess.run(["which", tool], capture_output=True)
            status = "✅" if r.returncode == 0 else "❌"
            print(f"  {tool:<12} {status}")

        if self.check_port(self.web_port):
            print(f"\n  🌐 http://localhost:{self.web_port}/vnc.html")
        print("─" * 40)

    def stop_all(self):
        """Stop all services"""
        for name, proc in self.services.items():
            if proc.poll() is None:
                proc.terminate()
                print(f"[OK] Stopped {name}")
        self.services = {}


def main():
    if len(sys.argv) < 2:
        print("Myanos Display Engine v1.0.0")
        print("Usage: python3 display_engine.py [android|ps2|status|stop]")
        return

    engine = MyanosDisplayEngine()
    cmd = sys.argv[1]

    if cmd == "android":
        engine.start_android_display()
    elif cmd == "ps2":
        engine.start_ps2_display()
    elif cmd == "status":
        engine.status()
    elif cmd == "stop":
        engine.stop_all()
    else:
        print(f"[ERR] Unknown command: {cmd}")
        print("Usage: display_engine.py [android|ps2|status|stop]")

if __name__ == "__main__":
    main()
