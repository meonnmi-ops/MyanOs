#!/usr/bin/env python3
"""
Myanos PS2 Layer v1.0.0
PlayStation 2 Emulation integration for Myanos Web OS
Supports: Play!, PCSX2 via VNC streaming to browser
"""

import os, sys, subprocess, json, time
from pathlib import Path

VERSION = "1.0.0"
BASE_DIR = Path(__file__).parent.parent
GAME_DIRS = ["~/PS2", "~/games/ps2", "~/ROMs/PS2", "./games"]

class MyanosPS2Layer:
    def __init__(self):
        self.emulators = self._detect_emulators()
        self.games = self._scan_games()

    def _detect_emulators(self):
        """Detect available PS2 emulators"""
        emus = {}
        checks = [
            ("play", "Play!"),
            ("pcsx2", "PCSX2"),
            ("pcsx2-qt", "PCSX2-Qt"),
        ]
        for cmd, name in checks:
            try:
                subprocess.run(["which", cmd], capture_output=True, check=True)
                emus[cmd] = name
            except:
                pass
        return emus

    def _scan_games(self):
        """Scan for PS2 game images"""
        games = []
        extensions = ('.iso', '.bin', '.img', '.mdf', '.nrg')

        for d in GAME_DIRS:
            expanded = os.path.expanduser(d)
            if os.path.exists(expanded):
                for f in os.listdir(expanded):
                    if f.lower().endswith(extensions):
                        games.append({
                            "name": os.path.splitext(f)[0],
                            "file": f,
                            "path": os.path.join(expanded, f),
                            "size": os.path.getsize(os.path.join(expanded, f))
                        })
        return games

    def list_games(self):
        """List available PS2 games"""
        print("\n🎮 Myanos PS2 Layer v" + VERSION)
        print("═" * 50)

        if not self.emulators:
            print("⚠️  No PS2 emulator detected!")
            print("   Install Play!: https://github.com/jpd002/Play-")
            print("   Or PCSX2:      sudo apt install pcsx2")
            print()
        else:
            print("Available Emulators:")
            for cmd, name in self.emulators.items():
                print(f"  ✅ {name} ({cmd})")
            print()

        if not self.games:
            print("📂 No PS2 games found!")
            print(f"   Place .iso/.bin/.img files in:")
            for d in GAME_DIRS:
                print(f"   - {d}")
        else:
            print(f"Found {len(self.games)} game(s):\n")
            for i, game in enumerate(self.games, 1):
                size_mb = game['size'] / (1024 * 1024)
                print(f"  [{i}] {game['name']}")
                print(f"      File: {game['file']} ({size_mb:.1f} MB)")
                print(f"      Path: {game['path']}")
                print()

        print("═" * 50)
        print("Commands: ps2 list | ps2 launch <game_number>")
        print("          ps2 rescan | ps2 status")

    def launch_game(self, game_idx):
        """Launch a PS2 game"""
        idx = int(game_idx) - 1
        if idx < 0 or idx >= len(self.games):
            print(f"[ERR] Invalid game number. Use 1-{len(self.games)}")
            return

        game = self.games[idx]
        print(f"\n🎮 Launching: {game['name']}")
        print(f"   File: {game['file']}")

        if not self.emulators:
            print("[ERR] No PS2 emulator available!")
            return

        # Use first available emulator
        emu_cmd = list(self.emulators.keys())[0]
        emu_name = self.emulators[emu_cmd]

        print(f"   Emulator: {emu_name}")
        print(f"   Starting... (display via noVNC)")

        try:
            if emu_cmd == "play":
                subprocess.Popen([emu_cmd, "--game", game['path']])
            elif emu_cmd in ("pcsx2", "pcsx2-qt"):
                subprocess.Popen([emu_cmd, game['path']])
            else:
                subprocess.Popen([emu_cmd, game['path']])
            print(f"\n[OK] Game launched! View via Display Engine:")
            print(f"     python3 myanos.py display ps2")
        except Exception as e:
            print(f"[ERR] Failed to launch: {e}")

    def status(self):
        """Show PS2 layer status"""
        print("\n🎮 PS2 Layer Status")
        print("─" * 35)
        print(f"  Emulators found: {len(self.emulators)}")
        for cmd, name in self.emulators.items():
            print(f"    ✅ {name}")
        print(f"  Games found:     {len(self.games)}")
        for g in self.games:
            print(f"    🎮 {g['name']}")
        if not self.emulators:
            print("\n  ⚠️  Install a PS2 emulator to use this feature")
        print("─" * 35)

    def rescan(self):
        """Rescan for games"""
        self.games = self._scan_games()
        print(f"[OK] Rescan complete: {len(self.games)} games found")


def main():
    if len(sys.argv) < 2:
        print("Myanos PS2 Layer v1.0.0")
        print("Usage: ps2_layer.py [list|launch|status|rescan]")
        return

    layer = MyanosPS2Layer()
    cmd = sys.argv[1]

    if cmd == "list":
        layer.list_games()
    elif cmd == "launch" and len(sys.argv) > 2:
        layer.launch_game(sys.argv[2])
    elif cmd == "status":
        layer.status()
    elif cmd == "rescan":
        layer.rescan()
    else:
        print(f"[ERR] Unknown: {cmd}")

if __name__ == "__main__":
    main()
