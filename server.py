#!/usr/bin/env python3
"""
Myanos Web OS — Server v2.1.0
HTTP Server + Terminal API + WebSocket (optional)
Serves desktop UI and handles real shell commands via /api/exec

Usage: python3 server.py [port]
Default port: 8080
"""

import os
import sys
import json
import signal
import socket
import platform
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

# ─── Config ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
DESKTOP_DIR = BASE_DIR / "desktop"
VERSION = "2.1.0"
DEFAULT_PORT = 8080

# ─── Shell Integration ────────────────────────────────────────────────────────
sys.path.insert(0, str(BASE_DIR))

# ─── HTTP Handler ─────────────────────────────────────────────────────────────
class MyanosHandler(SimpleHTTPRequestHandler):
    """Custom handler: serves desktop/ + API endpoints"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DESKTOP_DIR), **kwargs)

    def do_POST(self):
        """Handle API requests"""
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8', errors='replace')

        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            data = {}

        if self.path == '/api/exec':
            self.handle_exec(data)
        elif self.path == '/api/myan':
            self.handle_myan(data)
        elif self.path == '/api/system':
            self.handle_system(data)
        elif self.path == '/api/training':
            self.handle_training(data)
        else:
            self.send_json({'error': 'Unknown endpoint'}, 404)

    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/api/system':
            self.handle_system({})
        elif self.path == '/api/packages':
            self.handle_packages()
        elif self.path == '/api/training':
            self.handle_training_status()
        else:
            super().do_GET()

    # ─── API: Execute Shell Command ───────────────────────────────────────
    def handle_exec(self, data):
        """Execute a terminal command via MMR Shell"""
        cmd = data.get('cmd', '').strip()
        session = data.get('session', '')

        if not cmd:
            self.send_json({'output': '', 'status': 0})
            return

        try:
            from shell import MMRShell
            shell = MMRShell(session=session)
            output, status = shell.execute(cmd)
            self.send_json({'output': output, 'status': status})
        except Exception as e:
            self.send_json({'output': f'[ERR] Shell error: {e}', 'status': 1})

    # ─── API: Myan Package Manager ─────────────────────────────────────────
    def handle_myan(self, data):
        """Direct myan package manager API"""
        action = data.get('action', '')
        pkg_name = data.get('package', '')

        try:
            from myan_pm import MyanPM
            pm = MyanPM()

            if action == 'list':
                pm.list()
                result = '[OK] Listed packages'
            elif action == 'install' and pkg_name:
                # Check dist/ first, then try as path
                dist_path = BASE_DIR / "dist" / pkg_name
                if dist_path.exists():
                    pm.install(str(dist_path))
                    result = f'[OK] Installed: {pkg_name}'
                else:
                    result = f'[ERR] Package not found: {pkg_name}'
            elif action == 'remove' and pkg_name:
                pm.remove(pkg_name)
                result = f'[OK] Removed: {pkg_name}'
            elif action == 'search' and pkg_name:
                pm.search(pkg_name)
                result = '[OK] Search complete'
            elif action == 'info' and pkg_name:
                pm.info(pkg_name)
                result = '[OK] Info shown'
            elif action == 'update':
                result = '[OK] Package list updated'
            else:
                result = '[ERR] Usage: myan [list|install|remove|search|info|update]'

            self.send_json({'output': result, 'status': 0})
        except Exception as e:
            self.send_json({'output': f'[ERR] {e}', 'status': 1})

    # ─── API: System Info ──────────────────────────────────────────────────
    def handle_system(self, data):
        """Return system information"""
        info = {
            'os': f'Myanos Web OS v{VERSION}',
            'hostname': 'myanos',
            'platform': f'{platform.system()} {platform.machine()}',
            'python': platform.python_version(),
            'shell': 'mmr v1.0.0 (Myanmar Shell)',
            'user': os.environ.get('USER', 'meonnmi'),
            'cwd': str(BASE_DIR),
            'packages': self._count_packages(),
        }
        self.send_json(info)

    # ─── API: Package List ─────────────────────────────────────────────────
    def handle_packages(self):
        """Return JSON list of available/installed packages"""
        packages = []
        dist_dir = BASE_DIR / "dist"
        db_path = BASE_DIR / ".myan_db.json"

        installed = {}
        if db_path.exists():
            try:
                with open(db_path) as f:
                    db = json.load(f)
                installed = db.get('packages', {})
            except:
                pass

        # Scan dist/ for available packages
        if dist_dir.exists():
            for f in sorted(dist_dir.iterdir()):
                if f.suffix == '.myan':
                    name = f.stem
                    # Try to extract version from filename
                    parts = name.rsplit('-', 1)
                    pkg_name = parts[0] if len(parts) > 1 else name
                    version = parts[1] if len(parts) > 1 else '0.0.0'

                    # Get installed status
                    is_installed = pkg_name in installed or name in installed
                    inst_ver = installed.get(pkg_name, {}).get('version', '') or installed.get(name, {}).get('version', '')

                    packages.append({
                        'name': pkg_name,
                        'version': version,
                        'file': f.name,
                        'installed': is_installed,
                        'installed_version': inst_ver,
                        'icon': self._get_pkg_icon(pkg_name),
                        'size': f.stat().st_size,
                    })

        # Also add installed packages not in dist/
        for name, info in installed.items():
            if not any(p['name'] == name for p in packages):
                packages.append({
                    'name': name,
                    'version': info.get('version', '?'),
                    'file': '',
                    'installed': True,
                    'installed_version': info.get('version', ''),
                    'icon': self._get_pkg_icon(name),
                    'size': 0,
                })

        self.send_json({'packages': packages})

    # ─── API: AI Training Center ───────────────────────────────────────
    def handle_training(self, data):
        """Handle AI Training Center requests"""
        action = data.get('action', '')
        
        if action == 'execute_cell':
            code = data.get('code', '').strip()
            if not code:
                self.send_json({'output': '', 'status': 0})
                return
            try:
                import subprocess
                # Training cells may need more time — 120s timeout
                timeout = 120 if 'TRAINING_PIPELINE' in code or 'for epoch' in code else 60
                result = subprocess.run(
                    [sys.executable, '-c', code],
                    capture_output=True, text=True, timeout=timeout,
                    cwd=str(BASE_DIR)
                )
                output = result.stdout
                if result.stderr:
                    output += ('\n' if output else '') + result.stderr
                self.send_json({'output': output, 'status': result.returncode})
            except subprocess.TimeoutExpired:
                self.send_json({'output': '[TIMEOUT] Cell execution exceeded 60s limit', 'status': 1})
            except Exception as e:
                self.send_json({'output': f'[ERR] {e}', 'status': 1})
        
        elif action == 'check_ollama':
            try:
                import urllib.request
                req = urllib.request.urlopen('http://localhost:11434/api/tags', timeout=3)
                import json
                data = json.loads(req.read())
                self.send_json({'connected': True, 'models': data.get('models', [])})
            except:
                self.send_json({'connected': False, 'models': []})
        
        elif action == 'system_stats':
            import platform
            import os
            stats = {
                'cpu_percent': 0,
                'memory_used': 'N/A',
                'memory_total': 'N/A',
                'memory_percent': 0,
                'disk_used': 'N/A',
                'disk_total': 'N/A',
                'disk_percent': 0,
                'gpu_available': False,
                'gpu_util': 0,
                'gpu_mem_used': 0,
                'gpu_mem_total': 0,
                'uptime': 0,
                'cpu_count': 0,
                'cpu_freq': '',
                'platform': platform.platform(),
                'python': platform.python_version(),
            }
            try:
                import psutil
                stats['cpu_percent'] = psutil.cpu_percent(interval=0.5)
                stats['cpu_count'] = psutil.cpu_count(logical=False) or psutil.cpu_count()
                cpu_freq = psutil.cpu_freq()
                if cpu_freq:
                    stats['cpu_freq'] = f'@ {cpu_freq.current:.0f}MHz'
                mem = psutil.virtual_memory()
                stats['memory_used'] = f'{mem.used / 1e9:.1f} GB'
                stats['memory_total'] = f'{mem.total / 1e9:.1f} GB'
                stats['memory_percent'] = mem.percent
                disk = psutil.disk_usage('/')
                stats['disk_used'] = f'{disk.used / 1e9:.1f} GB'
                stats['disk_total'] = f'{disk.total / 1e9:.1f} GB'
                stats['disk_percent'] = disk.percent
                stats['uptime'] = time.time() - psutil.boot_time()
            except ImportError:
                pass
            try:
                import subprocess
                r = subprocess.run(['nvidia-smi', '--query-gpu=utilization.gpu,memory.used,memory.total', '--format=csv,noheader,nounits'], capture_output=True, text=True, timeout=5)
                if r.returncode == 0:
                    parts = r.stdout.strip().split(', ')
                    stats['gpu_available'] = True
                    stats['gpu_util'] = float(parts[0]) if len(parts) > 0 else 0
                    stats['gpu_mem_used'] = float(parts[1]) if len(parts) > 1 else 0
                    stats['gpu_mem_total'] = float(parts[2]) if len(parts) > 2 else 0
            except:
                pass
            self.send_json(stats)
        
        else:
            self.send_json({'error': 'Unknown training action'}, 400)

    def handle_training_status(self):
        """GET training center status"""
        import platform
        self.send_json({
            'status': 'ok',
            'python': platform.python_version(),
            'platform': platform.platform(),
        })

    # ─── Helpers ───────────────────────────────────────────────────────────
    def send_json(self, data, code=200):
        """Send JSON response"""
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', len(body))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        """Custom logging"""
        msg = format % args
        if '/api/' in msg:
            print(f"  [API] {msg}")
        # Suppress static file logs for cleaner output

    def _count_packages(self):
        db_path = BASE_DIR / ".myan_db.json"
        if db_path.exists():
            try:
                with open(db_path) as f:
                    db = json.load(f)
                return len(db.get('packages', {}))
            except:
                pass
        return 0

    def _get_pkg_icon(self, name):
        icons = {
            'myanmar-code': '🇲🇲',
            'myanos-terminal': '⬛',
            'myanos-display-engine': '🖥️',
            'myanos-ps2-layer': '🎮',
            'myanos-android-layer': '📱',
            'myanos-toolbox': '🔧',
            'myanos-desktop': '💻',
            'myanai': '🤖',
        }
        return icons.get(name, '📦')


# ─── Server Runner ─────────────────────────────────────────────────────────────
def find_port(port):
    """Find available port"""
    for p in range(port, port + 20):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.bind(('0.0.0.0', p))
            s.close()
            return p
        except OSError:
            continue
    return port


def main():
    port = DEFAULT_PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass

    port = find_port(port)

    # Change to desktop directory for serving
    os.chdir(str(DESKTOP_DIR))

    server = HTTPServer(('0.0.0.0', port), MyanosHandler)

    # Graceful shutdown
    def shutdown(sig, frame):
        print(f"\n  [MMR] Server shutting down...")
        server.shutdown()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    print()
    print(f"  ╔══════════════════════════════════════════╗")
    print(f"  ║  🇲🇲 Myanos Web OS v{VERSION}              ║")
    print(f"  ║  MMR Shell + Myan Package Manager         ║")
    print(f"  ║  Server running on port {port:<19}║")
    print(f"  ╚══════════════════════════════════════════╝")
    print()
    print(f"  Desktop:  http://localhost:{port}")
    print(f"  API:      http://localhost:{port}/api/exec")
    print(f"  Packages: http://localhost:{port}/api/packages")
    print()
    print(f"  Press Ctrl+C to stop")
    print()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        shutdown(None, None)


if __name__ == '__main__':
    main()
