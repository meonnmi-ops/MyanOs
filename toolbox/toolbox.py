#!/usr/bin/env python3
"""
Myanos Professional Toolbox v1.0.0
Firmware, Bypass, Storage, Network & System Tools for Myanos Web OS
"""

import os, sys, subprocess, json, time, socket, platform
from pathlib import Path

VERSION = "1.0.0"
BASE_DIR = Path(__file__).parent.parent

class MyanosToolbox:
    def __init__(self):
        self.tools = self._detect_tools()

    def _detect_tools(self):
        """Detect available system tools"""
        detected = {}
        check_list = [
            "dd", "fdisk", "lsblk", "mkfs.ext4", "mkfs.vfat",
            "nmap", "ping", "traceroute", "curl", "wget",
            "lshw", "dmidecode", "hwinfo",
            "htop", "iotop", "ncdu", "df", "du",
            "openssl", "sha256sum", "md5sum",
            "tar", "gzip", "xz", "zip", "unzip", "7z",
            "git", "python3", "pip3", "node", "npm",
            "adb", "fastboot", "heimdall",
        ]
        for tool in check_list:
            try:
                subprocess.run(["which", tool], capture_output=True, check=True)
                detected[tool] = True
            except:
                detected[tool] = False
        return detected

    def _run(self, cmd, capture=True):
        try:
            if capture:
                r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                return r.stdout.strip(), r.returncode
            else:
                subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                return "", 0
        except Exception as e:
            return str(e), 1

    def show_menu(self):
        """Display toolbox menu"""
        print(f"\n{'='*52}")
        print(f"  🔧 Myanos Professional Toolbox v{VERSION}")
        print(f"  Firmware • Bypass • Storage • Network • System")
        print(f"{'='*52}\n")

        categories = [
            ("💾 Storage Tools", [
                ("1", "Disk Info", "lsblk - List block devices"),
                ("2", "Partition Manager", "fdisk - Manage partitions"),
                ("3", "Disk Usage", "df - Show disk space"),
                ("4", "File Size Analyzer", "du - Directory sizes"),
            ]),
            ("🌐 Network Tools", [
                ("5", "Network Interfaces", "ip addr - Show network config"),
                ("6", "Ping Test", "ping - Test connectivity"),
                ("7", "Port Scanner", "Port scan with available tools"),
                ("8", "DNS Lookup", "nslookup/dig DNS queries"),
                ("9", "Download Manager", "curl/wget file downloads"),
            ]),
            ("🔧 System Tools", [
                ("10", "Hardware Info", "lshw/dmidecode hardware details"),
                ("11", "Process Monitor", "ps - List processes"),
                ("12", "System Benchmark", "CPU/Memory/Disk benchmarks"),
                ("13", "Log Viewer", "dmesg/syslog system logs"),
            ]),
            ("📱 Flash/Android Tools", [
                ("14", "Flash Tool (dd)", "Write images to USB/disk"),
                ("15", "ADB Status", "Android Debug Bridge"),
                ("16", "Fastboot Status", "Android bootloader"),
                ("17", "Firmware Info", "Device firmware details"),
            ]),
            ("🔐 Security/Hash Tools", [
                ("18", "SHA256 Hash", "File integrity check"),
                ("19", "MD5 Hash", "File checksum"),
                ("20", "OpenSSL Toolkit", "Encryption/certificates"),
            ]),
        ]

        for cat_name, items in categories:
            print(f"  {cat_name}")
            for num, name, desc in items:
                print(f"    [{num:>2}] {name:<22} {desc}")
            print()

        print("  [00] Exit")
        print(f"{'='*52}")

    def run_tool(self, choice):
        """Execute selected tool"""
        tools_map = {
            "1": self._disk_info,
            "2": self._partition_manager,
            "3": self._disk_usage,
            "4": self._file_sizes,
            "5": self._network_interfaces,
            "6": self._ping_test,
            "7": self._port_scan,
            "8": self._dns_lookup,
            "9": self._download_manager,
            "10": self._hardware_info,
            "11": self._process_monitor,
            "12": self._benchmark,
            "13": self._log_viewer,
            "14": self._flash_tool,
            "15": self._adb_status,
            "16": self._fastboot_status,
            "17": self._firmware_info,
            "18": lambda: self._hash_file("sha256"),
            "19": lambda: self._hash_file("md5"),
            "20": self._openssl_tool,
        }

        handler = tools_map.get(choice)
        if handler:
            handler()
        else:
            print("[ERR] Invalid choice")

    def _disk_info(self):
        print("\n💾 Disk Information")
        print("─" * 40)
        out, _ = self._run(["lsblk", "-o", "NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,MODEL"])
        print(out if out else "[INFO] lsblk not available")

    def _partition_manager(self):
        print("\n💾 Partition Manager")
        print("─" * 40)
        print("WARNING: fdisk is destructive! Use with caution.")
        print("Available: fdisk, parted, gdisk")
        print("Usage: sudo fdisk /dev/sdX")

    def _disk_usage(self):
        print("\n💾 Disk Usage")
        print("─" * 40)
        out, _ = self._run(["df", "-h", "-x", "tmpfs", "-x", "devtmpfs"])
        print(out if out else "[INFO] df not available")

    def _file_sizes(self):
        print("\n📁 File Size Analyzer")
        print("─" * 40)
        print("Scanning current directory...")
        out, _ = self._run(["du", "-sh", os.getcwd()])
        print(out)

    def _network_interfaces(self):
        print("\n🌐 Network Interfaces")
        print("─" * 40)
        if self.tools.get("ip"):
            out, _ = self._run(["ip", "addr"])
            print(out)
        else:
            out, _ = self._run(["ifconfig"])
            print(out if out else "[INFO] No network tools found")

    def _ping_test(self):
        print("\n🌐 Ping Test")
        host = input("  Host (default: 8.8.8.8): ").strip() or "8.8.8.8"
        print(f"  Pinging {host}...")
        out, _ = self._run(["ping", "-c", "4", host])
        print(out)

    def _port_scan(self):
        print("\n🌐 Port Scanner")
        host = input("  Host (default: localhost): ").strip() or "localhost"
        start = input("  Start port (default: 1): ").strip() or "1"
        end = input("  End port (default: 1000): ").strip() or "1000"
        print(f"  Scanning {host}:{start}-{end}...")
        for port in range(int(start), min(int(end), int(start)+101)):
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(0.5)
                result = s.connect_ex((host, port))
                if result == 0:
                    print(f"  ✅ Port {port}: OPEN")
                s.close()
            except:
                pass

    def _dns_lookup(self):
        print("\n🌐 DNS Lookup")
        domain = input("  Domain: ").strip()
        if not domain:
            return
        try:
            ips = socket.gethostbyname_ex(domain)
            print(f"  Domain: {domain}")
            print(f"  IPs:    {ips[2]}")
            print(f"  Alias:  {ips[1]}")
        except Exception as e:
            print(f"  Error: {e}")

    def _download_manager(self):
        print("\n🌐 Download Manager")
        url = input("  URL: ").strip()
        if not url:
            return
        output = input("  Output (default: downloaded_file): ").strip() or "downloaded_file"
        print(f"  Downloading {url}...")
        if self.tools.get("curl"):
            self._run(["curl", "-L", "-o", output, url], capture=False)
            print(f"  [OK] Saved to: {output}")
        elif self.tools.get("wget"):
            self._run(["wget", "-O", output, url], capture=False)
            print(f"  [OK] Saved to: {output}")
        else:
            print("[ERR] No download tool available")

    def _hardware_info(self):
        print("\n🔧 Hardware Information")
        print("─" * 40)
        print(f"  Platform: {platform.system()} {platform.release()}")
        print(f"  Machine:  {platform.machine()}")
        print(f"  Processor: {platform.processor()}")
        print(f"  Python:   {platform.python_version()}")
        if self.tools.get("lshw"):
            out, _ = self._run(["lshw", "-short"])
            print(out)

    def _process_monitor(self):
        print("\n🔧 Process Monitor (Top 15)")
        print("─" * 40)
        out, _ = self._run(["ps", "aux", "--sort=-%mem"])
        lines = out.split('\n')[:16]
        for line in lines:
            print(line)

    def _benchmark(self):
        print("\n🔧 System Benchmark")
        print("─" * 40)
        # CPU benchmark
        start = time.time()
        _ = [i*i for i in range(500000)]
        cpu_time = time.time() - start
        print(f"  CPU:  {cpu_time:.3f}s (500K integer ops)")

        # Memory benchmark
        start = time.time()
        _ = list(range(1000000))
        mem_time = time.time() - start
        print(f"  MEM:  {mem_time:.3f}s (1M list creation)")

        # Disk benchmark (read)
        start = time.time()
        try:
            with open("/proc/cpuinfo", "r") as f:
                _ = f.read()
            disk_time = time.time() - start
            print(f"  DISK: {disk_time:.3f}s (file read)")
        except:
            print("  DISK: N/A")

        print(f"\n  Score: {1000/(cpu_time+mem_time+0.001):.0f} points")

    def _log_viewer(self):
        print("\n🔧 System Logs")
        print("─" * 40)
        out, _ = self._run(["dmesg"])
        if out:
            for line in out.split('\n')[-20:]:
                print(f"  {line}")
        else:
            print("  [INFO] No dmesg access")

    def _flash_tool(self):
        print("\n📱 Flash Tool (dd)")
        print("─" * 40)
        print("⚠️  WARNING: This can DESTROY data!")
        print("    Double-check the target device!")
        print()
        print("  Usage:")
        print("  sudo dd if=image.iso of=/dev/sdX bs=4M status=progress && sync")
        print()
        print("  Verify:")
        print("  sudo dd if=/dev/sdX bs=4M count=1 | hexdump -C")

    def _adb_status(self):
        print("\n📱 ADB Status")
        print("─" * 40)
        if self.tools.get("adb"):
            out, _ = self._run(["adb", "devices"])
            print(out if out else "  No devices connected")
        else:
            print("  ❌ ADB not installed")
            print("  Install: sudo apt install adb")
            print("  Or:      pkg install android-tools")

    def _fastboot_status(self):
        print("\n📱 Fastboot Status")
        print("─" * 40)
        if self.tools.get("fastboot"):
            out, _ = self._run(["fastboot", "devices"])
            print(out if out else "  No devices in fastboot mode")
        else:
            print("  ❌ Fastboot not installed")

    def _firmware_info(self):
        print("\n📱 Firmware Information")
        print("─" * 40)
        paths = [
            "/proc/cpuinfo", "/sys/class/dmi/id/product_name",
            "/sys/class/dmi/id/bios_version",
        ]
        for p in paths:
            try:
                with open(p) as f:
                    print(f"  {p}:")
                    for line in f.read().split('\n')[:5]:
                        if line.strip():
                            print(f"    {line}")
            except:
                pass

    def _hash_file(self, method="sha256"):
        print(f"\n🔐 {method.upper()} Hash")
        print("─" * 40)
        filepath = input("  File path: ").strip()
        if not filepath or not os.path.exists(filepath):
            print("[ERR] File not found")
            return
        cmd = ["sha256sum", filepath] if method == "sha256" else ["md5sum", filepath]
        out, _ = self._run(cmd)
        print(f"  {out}")

    def _openssl_tool(self):
        print("\n🔐 OpenSSL Toolkit")
        print("─" * 40)
        print("  Available commands:")
        print("  1. Generate self-signed cert")
        print("  2. Generate RSA key")
        print("  3. Hash a file")
        print("  4. Check certificate")
        choice = input("  Choice: ").strip()
        if choice == "1":
            self._run(["openssl", "req", "-x509", "-newkey", "rsa:2048",
                       "-keyout", "key.pem", "-out", "cert.pem", "-days", "365",
                       "-nodes"], capture=False)
            print("  [OK] Generated key.pem + cert.pem")
        elif choice == "2":
            self._run(["openssl", "genrsa", "-out", "private.key", "2048"], capture=False)
            print("  [OK] Generated private.key")
        else:
            print("  Use: openssl <command> [options]")


def main():
    print("╔══════════════════════════════════════════════╗")
    print("║  🔧 Myanos Professional Toolbox v1.0.0      ║")
    print("║  Firmware • Bypass • Storage • Network      ║")
    print("╚══════════════════════════════════════════════╝")

    toolbox = MyanosToolbox()

    while True:
        toolbox.show_menu()
        choice = input("\nMyanos Toolbox $> ").strip()

        if choice in ("0", "00", "exit", "quit"):
            print("👋 Bye!")
            break
        toolbox.run_tool(choice)
        input("\n  [Enter] to continue...")

if __name__ == "__main__":
    main()
