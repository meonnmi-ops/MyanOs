#!/usr/bin/env python3
"""
Myanos Android Layer v1.0.0
Android APK management via WayDroid/ADB for Myanos Web OS
"""

import os, sys, subprocess, json, time
from pathlib import Path

VERSION = "1.0.0"
BASE_DIR = Path(__file__).parent.parent

class MyanosAndroidLayer:
    def __init__(self):
        self.waydroid = self._check_cmd("waydroid")
        self.adb = self._check_cmd("adb")

    def _check_cmd(self, cmd):
        """Check if command is available"""
        try:
            subprocess.run(["which", cmd], capture_output=True, check=True)
            return True
        except:
            return False

    def _run(self, cmd, capture=True):
        """Run command and return output"""
        try:
            if capture:
                r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
                return r.stdout.strip(), r.stderr.strip(), r.returncode
            else:
                subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                return "", "", 0
        except Exception as e:
            return "", str(e), 1

    def status(self):
        """Show Android layer status"""
        print("\n📱 Myanos Android Layer v" + VERSION)
        print("═" * 45)

        print(f"  WayDroid: {'✅ Installed' if self.waydroid else '❌ Not installed'}")
        print(f"  ADB:      {'✅ Available' if self.adb else '❌ Not available'}")
        print()

        if self.waydroid:
            out, err, code = self._run(["waydroid", "status"])
            if out:
                for line in out.split('\n'):
                    print(f"  {line}")
            if self.adb:
                out2, _, _ = self._run(["adb", "devices"])
                print(f"\n  Connected devices:")
                for line in out2.split('\n')[1:]:
                    if line.strip():
                        print(f"    {line}")

        if not self.waydroid and not self.adb:
            print("  ⚠️  No Android runtime available!")
            print("  Install WayDroid: bash android_layer/setup_waydroid.sh")
            print("  Install ADB:      pkg install android-tools")
            print("                    sudo apt install adb")

        print("═" * 45)

    def install_apk(self, apk_path):
        """Install an APK file"""
        if not os.path.exists(apk_path):
            print(f"[ERR] APK not found: {apk_path}")
            return False

        print(f"[Android] Installing {apk_path}...")
        size_mb = os.path.getsize(apk_path) / (1024*1024)
        print(f"          Size: {size_mb:.1f} MB")

        # Try WayDroid first
        if self.waydroid:
            out, err, code = self._run(["waydroid", "app", "install", apk_path])
            if code == 0:
                print("[OK] APK installed via WayDroid!")
                return True

        # Try ADB
        if self.adb:
            out, err, code = self._run(["adb", "install", apk_path])
            if code == 0:
                print("[OK] APK installed via ADB!")
                return True

        print("[ERR] Failed to install APK")
        print("      Make sure WayDroid or ADB is available")
        return False

    def list_apps(self):
        """List installed Android apps"""
        print("\n📱 Installed Android Apps\n")

        if self.waydroid:
            out, _, _ = self._run(["waydroid", "app", "list"])
            if out:
                for line in out.split('\n'):
                    if line.strip():
                        pkg = line.strip()
                        name = pkg.split('.')[-1]
                        print(f"  📦 {name} ({pkg})")

        if self.adb:
            out, _, _ = self._run(["adb", "shell", "pm", "list", "packages", "-3"])
            if out:
                for line in out.split('\n'):
                    if line.strip() and 'package:' in line:
                        pkg = line.split(':')[-1].strip()
                        name = pkg.split('.')[-1]
                        print(f"  📦 {name} ({pkg})")

        if not self.waydroid and not self.adb:
            print("  No Android runtime available")

    def uninstall(self, package_name):
        """Uninstall an Android app"""
        if self.waydroid:
            out, err, code = self._run(["waydroid", "app", "remove", package_name])
            if code == 0:
                print(f"[OK] Uninstalled: {package_name}")
                return True
        if self.adb:
            out, err, code = self._run(["adb", "uninstall", package_name])
            if code == 0:
                print(f"[OK] Uninstalled: {package_name}")
                return True
        print(f"[ERR] Failed to uninstall: {package_name}")
        return False

    def launch_app(self, package_name):
        """Launch an Android app"""
        if self.waydroid:
            self._run(["waydroid", "app", "launch", package_name], capture=False)
            print(f"[OK] Launched: {package_name}")
            return True
        elif self.adb:
            self._run(["adb", "shell", "monkey", "-p", package_name, "-c", "android.intent.category.LAUNCHER", "1"], capture=False)
            print(f"[OK] Launched: {package_name}")
            return True
        print("[ERR] No runtime available")
        return False


def main():
    if len(sys.argv) < 2:
        print("Myanos Android Layer v1.0.0")
        print("Usage: vnc_server.py [status|install|list|uninstall|launch]")
        return

    layer = MyanosAndroidLayer()
    cmd = sys.argv[1]

    if cmd == "status":
        layer.status()
    elif cmd == "install" and len(sys.argv) > 2:
        layer.install_apk(sys.argv[2])
    elif cmd == "list":
        layer.list_apps()
    elif cmd == "uninstall" and len(sys.argv) > 2:
        layer.uninstall(sys.argv[2])
    elif cmd == "launch" and len(sys.argv) > 2:
        layer.launch_app(sys.argv[2])
    else:
        print(f"[ERR] Unknown: {cmd}")

if __name__ == "__main__":
    main()
