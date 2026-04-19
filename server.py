#!/usr/bin/env python3
"""
Myanos Web OS — Server v4.3.0
Production-Ready HTTP Server with Security Layer
- API Key Authentication (X-API-Key header)
- Rate Limiting (30 req/min/IP)
- Command Safety (blocks rm -rf /, mkfs, fork bombs)
- SHA-256 Password Hashing
- Real System Metrics (psutil + nvidia-smi)

Usage: python3 server.py [port]
Default port: 8080
"""

import os
import re
import sys
import json
import signal
import socket
import platform
import threading
import subprocess
import time
import hashlib
import secrets
import urllib.request
import urllib.parse
import urllib.error
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from datetime import datetime
from collections import defaultdict
from threading import Thread
import atexit

# ─── Config ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
DESKTOP_DIR = BASE_DIR / "desktop"
VERSION = "4.3.0"
DEFAULT_PORT = 8080
API_KEY_FILE = BASE_DIR / ".myanos_api_key"
PASSWORD_FILE = BASE_DIR / ".myanos_password"
HASH_FILE = BASE_DIR / ".myanos_pw_hash"

# ─── Rate Limiting ─────────────────────────────────────────────────────────────
rate_limit_store = defaultdict(list)
RATE_LIMIT_MAX = 30          # requests per window
RATE_LIMIT_WINDOW = 60       # seconds

# ─── Command Safety ────────────────────────────────────────────────────────────
DANGEROUS_PATTERNS = [
    'rm -rf /', 'rm -rf /*', 'mkfs', 'dd if=', ':(){ :|:& };:',
    'fork bomb', '> /dev/sda', 'chmod -R 777 /', 'shutdown',
    'reboot', 'init 0', 'init 6', 'poweroff', 'halt',
]

def is_command_safe(cmd):
    """Check if a command is safe to execute"""
    cmd_lower = cmd.strip().lower()
    for pattern in DANGEROUS_PATTERNS:
        if pattern in cmd_lower:
            return False
    # Block commands that try to remove root or critical dirs
    if cmd_lower.startswith('rm') and ('/' == cmd_lower.strip().split()[-1] or '/.' in cmd_lower):
        return False
    return True

# ─── Password Hashing ─────────────────────────────────────────────────────────
def hash_password(password):
    """SHA-256 hash with salt"""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}:{hashed}"

def verify_password(password, stored_hash):
    """Verify password against stored hash"""
    try:
        salt, hashed = stored_hash.split(':')
        computed = hashlib.sha256((salt + password).encode()).hexdigest()
        return computed == hashed
    except (ValueError, AttributeError):
        return False

def init_password():
    """Initialize default password if not set"""
    if not HASH_FILE.exists():
        default_pw = 'myanos2024'
        hashed = hash_password(default_pw)
        HASH_FILE.write_text(hashed)
        print(f"  [SECURITY] Default password set (hash stored)")
    return HASH_FILE.read_text().strip()

def init_api_key():
    """Initialize or load API key"""
    if not API_KEY_FILE.exists():
        key = secrets.token_hex(32)
        API_KEY_FILE.write_text(key)
        print(f"  [SECURITY] New API key generated: {key[:16]}...")
    return API_KEY_FILE.read_text().strip()

# ─── Shell Integration ────────────────────────────────────────────────────────
sys.path.insert(0, str(BASE_DIR))

# ─── HTTP Handler ─────────────────────────────────────────────────────────────
class MyanosHandler(SimpleHTTPRequestHandler):
    """Production-ready handler with security layer"""

    def __init__(self, *args, **kwargs):
        self._api_key = init_api_key()
        self._pw_hash = init_password()
        super().__init__(*args, directory=str(DESKTOP_DIR), **kwargs)

    def _check_rate_limit(self):
        """Rate limiting: 30 requests per minute per IP"""
        client_ip = self.client_address[0]
        now = time.time()
        # Clean old entries
        rate_limit_store[client_ip] = [
            t for t in rate_limit_store[client_ip] if now - t < RATE_LIMIT_WINDOW
        ]
        if len(rate_limit_store[client_ip]) >= RATE_LIMIT_MAX:
            self.send_json({'error': 'Rate limit exceeded. Try again later.'}, 429)
            return False
        rate_limit_store[client_ip].append(now)
        return True

    def _check_api_key(self):
        """Verify X-API-Key header"""
        provided = self.headers.get('X-API-Key', '')
        if not provided:
            self.send_json({'error': 'API key required. Use X-API-Key header.'}, 401)
            return False
        if provided != self._api_key:
            self.send_json({'error': 'Invalid API key.'}, 403)
            return False
        return True

    def _check_auth(self):
        """Check rate limit + API key for protected endpoints"""
        if not self._check_rate_limit():
            return False
        return self._check_api_key()

    def do_POST(self):
        """Handle API requests"""
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8', errors='replace')

        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            data = {}

        # Public endpoints (no auth required for some)
        if self.path == '/api/password/verify':
            self.handle_password_verify(data)
            return
        if self.path == '/api/password/change':
            self.handle_password_change(data)
            return

        # Auth-required endpoints
        if not self._check_auth():
            return

        if self.path == '/api/exec':
            self.handle_exec(data)
        elif self.path == '/api/quick-run':
            self.handle_quick_run(data)
        elif self.path == '/api/myan':
            self.handle_myan(data)
        elif self.path == '/api/system':
            self.handle_system(data)
        elif self.path == '/api/training':
            self.handle_training(data)
        elif self.path == '/api/key':
            self.handle_api_key(data)
        else:
            self.send_json({'error': 'Unknown endpoint'}, 404)

    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/api/system':
            self.handle_system({})
        elif self.path == '/api/system-stats':
            self.handle_system_stats()
        elif self.path == '/api/packages':
            self.handle_packages()
        elif self.path == '/api/training':
            self.handle_training_status()
        elif self.path == '/api/key':
            self.handle_get_api_key()
        elif self.path == '/api/app-commands':
            self.handle_app_commands()
        elif self.path.startswith('/api/proxy'):
            if self._check_rate_limit():
                self.handle_proxy()
        elif self.path == '/api/health':
            self.send_json({
                'status': 'ok',
                'version': VERSION,
                'uptime': time.time() - _server_start_time,
                'python': platform.python_version(),
            })
        else:
            super().do_GET()

    # ─── API: Password Management ────────────────────────────────────────
    def handle_password_verify(self, data):
        """Verify password (no API key required for login)"""
        if not self._check_rate_limit():
            return
        password = data.get('password', '')
        if not password:
            self.send_json({'valid': False, 'error': 'Password required'}, 400)
            return
        stored_hash = HASH_FILE.read_text().strip() if HASH_FILE.exists() else ''
        if verify_password(password, stored_hash):
            self.send_json({'valid': True})
        else:
            self.send_json({'valid': False, 'error': 'Wrong password'})

    def handle_password_change(self, data):
        """Change password (requires current password)"""
        if not self._check_rate_limit():
            return
        current = data.get('current_password', '')
        new_pw = data.get('new_password', '')
        if not current or not new_pw:
            self.send_json({'error': 'Both current and new password required'}, 400)
            return
        if len(new_pw) < 4:
            self.send_json({'error': 'New password must be at least 4 characters'}, 400)
            return
        stored_hash = HASH_FILE.read_text().strip() if HASH_FILE.exists() else ''
        if verify_password(current, stored_hash):
            HASH_FILE.write_text(hash_password(new_pw))
            self.send_json({'success': True, 'message': 'Password changed'})
        else:
            self.send_json({'error': 'Current password is wrong'}, 403)

    # ─── API: Web Proxy (for Browser app) ─────────────────────────────────
    def handle_proxy(self):
        """Proxy web content to bypass X-Frame-Options"""
        query = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(query)
        url = params.get('url', [''])[0]
        if not url:
            self.send_json({'error': 'URL parameter required'}, 400)
            return
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            })
            resp = urllib.request.urlopen(req, timeout=15)
            content = resp.read()
            content_type = resp.headers.get('Content-Type', 'text/html; charset=utf-8')
            # Rewrite HTML to add <base> tag for relative URLs
            if b'<html' in content.lower() or b'<!doctype' in content.lower():
                try:
                    html = content.decode('utf-8', errors='replace')
                    parsed = urllib.parse.urlparse(url)
                    base_url = f"{parsed.scheme}://{parsed.netloc}"
                    base_tag = f'<base href="{base_url}" target="_self">'
                    # Insert <base> after <head>
                    if '<head>' in html.lower():
                        pattern = re.compile(r'(<head[^>]*>)', re.IGNORECASE)
                        html = pattern.sub(r'\1' + base_tag, html, count=1)
                    else:
                        html = base_tag + html
                    # Strip X-Frame-Options meta tags
                    html = re.sub(r'<meta[^>]*http-equiv[^>]*X-Frame-Options[^>]*>', '', html, flags=re.IGNORECASE)
                    html = re.sub(r'<meta[^>]*content-security-policy[^>]*>', '', html, flags=re.IGNORECASE)
                    content = html.encode('utf-8')
                except Exception:
                    pass
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', len(content))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('X-Frame-Options', 'ALLOWALL')
            self.end_headers()
            self.wfile.write(content)
        except urllib.error.HTTPError as e:
            self.send_json({'error': f'HTTP {e.code}: {e.reason}', 'url': url}, e.code)
        except urllib.error.URLError as e:
            self.send_json({'error': f'Connection failed: {e.reason}', 'url': url}, 502)
        except Exception as e:
            self.send_json({'error': f'Proxy error: {str(e)}', 'url': url}, 500)

    def handle_get_api_key(self):
        """Return API key (public — needed for frontend init)"""
        key = API_KEY_FILE.read_text().strip() if API_KEY_FILE.exists() else ''
        self.send_json({'api_key': key})

    def handle_api_key(self, data):
        """Regenerate API key"""
        action = data.get('action', '')
        if action == 'regenerate':
            new_key = secrets.token_hex(32)
            API_KEY_FILE.write_text(new_key)
            self._api_key = new_key
            self.send_json({'api_key': new_key, 'message': 'API key regenerated'})
        else:
            self.send_json({'api_key': self._api_key})

    # ─── API: Execute Shell Command ───────────────────────────────────────
    def handle_exec(self, data):
        """Execute a terminal command via MMR Shell"""
        cmd = data.get('cmd', '').strip()
        session = data.get('session', '')

        if not cmd:
            self.send_json({'output': '', 'status': 0})
            return

        # Command safety check
        if not is_command_safe(cmd):
            self.send_json({'output': '[SECURITY] Command blocked: potentially dangerous operation detected.', 'status': 1})
            return

        try:
            from shell import MMRShell
            shell = MMRShell(session=session)
            output, status = shell.execute(cmd)
            self.send_json({'output': output, 'status': status})
        except Exception as e:
            self.send_json({'output': f'[ERR] Shell error: {e}', 'status': 1})

    # ─── API: Quick Run (Onclick Backend Command) ─────────────────────────
    # Maps desktop app icons to backend commands
    APP_COMMAND_MAP = {
        'terminal':       {'cmd': 'neofetch',                     'desc': 'System info via MMR Shell'},
        'files':          {'cmd': 'ls -la /app',                  'desc': 'List app directory'},
        'monitor':        {'cmd': '__SYSTEM_STATS__',             'desc': 'Real CPU/RAM/Disk stats (psutil)'},
        'settings':       {'cmd': '__SYSTEM_INFO__',              'desc': 'System information'},
        'neofetch':       {'cmd': 'neofetch',                     'desc': 'Myanos system info'},
        'myanmar-code':   {'cmd': 'mmc help',                     'desc': 'Myanmar Code help'},
        'pkg-manager':    {'cmd': 'myan list',                    'desc': 'List installed packages'},
        'code-editor':    {'cmd': 'ls -la /app',                  'desc': 'App directory listing'},
        'notepad':        {'cmd': 'date',                         'desc': 'Current date/time'},
        'toolbox':        {'cmd': 'lsblk 2>/dev/null || echo "lsblk not available"', 'desc': 'Storage info'},
        'android':        {'cmd': 'which adb 2>/dev/null && echo "ADB available" || echo "ADB not found"', 'desc': 'Android ADB check'},
        'ps2':            {'cmd': 'ls ~/PS2/ 2>/dev/null || echo "No PS2 directory found"', 'desc': 'PS2 games listing'},
        'myanai':         {'cmd': 'python3 -c "import sys; print(sys.version)"', 'desc': 'Python version for AI'},
        'ai-training':    {'cmd': "python3 -c \"import psutil; print(f'CPU: {psutil.cpu_percent()}% | RAM: {psutil.virtual_memory().percent()}%')\"", 'desc': 'System resources for AI training'},
        'browser':        {'cmd': 'curl -s -o /dev/null -w "%{http_code}" https://huggingface.co 2>/dev/null || echo "offline"', 'desc': 'Network connectivity check'},
        'calculator':     {'cmd': 'python3 -c "print(3.14159265358979)"', 'desc': 'Quick math test'},
        'media-player':   {'cmd': 'ls /app/desktop/ 2>/dev/null', 'desc': 'Media files check'},
    }

    def handle_quick_run(self, data):
        """Execute a backend command mapped to a desktop app icon click.
        Called when user clicks a desktop icon — runs the associated command."""
        app_id = data.get('app', '')
        custom_cmd = data.get('cmd', '')

        # Custom command takes priority
        if custom_cmd:
            cmd = custom_cmd
        elif app_id in self.APP_COMMAND_MAP:
            app_info = self.APP_COMMAND_MAP[app_id]
            cmd = app_info['cmd']

            # Special internal commands (not sent to shell)
            if cmd == '__SYSTEM_STATS__':
                self.handle_system_stats()
                return
            elif cmd == '__SYSTEM_INFO__':
                self.handle_system({})
                return
        else:
            self.send_json({'output': f'[INFO] No command mapped for app: {app_id}', 'status': 0, 'app': app_id})
            return

        # Safety check
        if not is_command_safe(cmd):
            self.send_json({'output': '[SECURITY] Command blocked: potentially dangerous operation detected.', 'status': 1, 'app': app_id})
            return

        try:
            from shell import MMRShell
            shell = MMRShell(session=data.get('session', 'quick-run'))
            output, status = shell.execute(cmd)
            self.send_json({
                'output': output,
                'status': status,
                'app': app_id,
                'command': cmd,
                'desc': self.APP_COMMAND_MAP.get(app_id, {}).get('desc', ''),
            })
        except Exception as e:
            self.send_json({'output': f'[ERR] Quick run error: {e}', 'status': 1, 'app': app_id})

    def handle_app_commands(self):
        """Return all available app-to-command mappings.
        Frontend uses this to know what commands each icon triggers."""
        commands = {}
        for app_id, info in self.APP_COMMAND_MAP.items():
            commands[app_id] = {
                'command': info['cmd'],
                'description': info['desc'],
            }
        self.send_json({
            'commands': commands,
            'total': len(commands),
            'version': VERSION,
        })

    # ─── API: Myan Package Manager ─────────────────────────────────────────
    def handle_myan(self, data):
        """Direct myan package manager API"""
        action = data.get('action', '')
        pkg_name = data.get('package', '')

        try:
            from myan_pm import MyanPM
            pm = MyanPM()

            if action == 'list':
                installed = {}
                db_path = BASE_DIR / '.myan_db.json'
                if db_path.exists():
                    try:
                        with open(db_path) as f:
                            db = json.load(f)
                        installed = db.get('packages', {})
                    except Exception:
                        pass
                result_lines = [f"  {n:<25} v{i['version']:<10} (installed)" for n, i in installed.items()]
                result = '[Installed Packages]\n' + '\n'.join(result_lines) if result_lines else '[INFO] No packages installed'
                self.send_json({'output': result, 'status': 0, 'installed': list(installed.keys())})
                return
            elif action == 'available':
                dist_dir = BASE_DIR / 'dist'
                avail = []
                if dist_dir.exists():
                    for f in sorted(dist_dir.iterdir()):
                        if f.suffix == '.myan':
                            avail.append({'name': f.stem, 'file': f.name, 'size': f.stat().st_size})
                self.send_json({'output': f'[Available] {len(avail)} packages', 'status': 0, 'available': avail})
                return
            elif action == 'install' and pkg_name:
                # Find .myan file in dist/ by name pattern
                dist_dir = BASE_DIR / 'dist'
                pkg_file = None
                if dist_dir.exists():
                    for f in dist_dir.iterdir():
                        if f.suffix == '.myan' and pkg_name in f.stem:
                            pkg_file = str(f)
                            break
                if not pkg_file:
                    self.send_json({'output': f'[ERR] Package not found: {pkg_name}', 'status': 1})
                    return
                pm.install(pkg_file)
                self.send_json({'output': f'[OK] Installed: {pkg_name}', 'status': 0, 'package': pkg_name})
                return
            elif action == 'remove' and pkg_name:
                pm.remove(pkg_name)
                self.send_json({'output': f'[OK] Removed: {pkg_name}', 'status': 0, 'package': pkg_name})
                return
            elif action == 'search' and pkg_name:
                results = pm.search(pkg_name)
                self.send_json({'output': f'[OK] Search complete for: {pkg_name}', 'status': 0})
                return
            elif action == 'info' and pkg_name:
                pm.info(pkg_name)
                self.send_json({'output': f'[OK] Info shown: {pkg_name}', 'status': 0})
                return
            elif action == 'update':
                self.send_json({'output': '[OK] Package list updated', 'status': 0})
                return
            elif action == 'build':
                # Rebuild all packages
                import subprocess as sp
                bp = BASE_DIR / 'build_packages.py'
                if bp.exists():
                    r = sp.run([sys.executable, str(bp)], capture_output=True, text=True, timeout=30, cwd=str(BASE_DIR))
                    self.send_json({'output': r.stdout, 'status': r.returncode})
                else:
                    self.send_json({'output': '[ERR] build_packages.py not found', 'status': 1})
                return
            else:
                self.send_json({'output': '[ERR] Usage: myan [list|available|install|remove|search|info|update|build]', 'status': 1})
                return
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

    # ─── API: Real System Stats (psutil) ─────────────────────────────────
    def handle_system_stats(self):
        """Return REAL system metrics using psutil"""
        stats = {}

        # CPU
        try:
            import psutil
            cpu_percent = psutil.cpu_percent(interval=0.5)
            cpu_freq = psutil.cpu_freq()
            cpu_count_logical = psutil.cpu_count(logical=True)
            cpu_count_physical = psutil.cpu_count(logical=False) or cpu_count_logical
            stats['cpu'] = {
                'percent': cpu_percent,
                'cores_physical': cpu_count_physical,
                'cores_logical': cpu_count_logical,
                'freq_current': round(cpu_freq.current, 0) if cpu_freq else 0,
                'freq_max': round(cpu_freq.max, 0) if cpu_freq else 0,
                'per_cpu': psutil.cpu_percent(interval=0, percpu=True),
            }
        except ImportError:
            stats['cpu'] = {'percent': 0, 'cores_physical': 0, 'cores_logical': 0, 'freq_current': 0, 'freq_max': 0, 'per_cpu': []}
        except Exception:
            stats['cpu'] = {'percent': 0, 'cores_physical': 0, 'cores_logical': 0, 'freq_current': 0, 'freq_max': 0, 'per_cpu': []}

        # Memory
        try:
            import psutil
            mem = psutil.virtual_memory()
            swap = psutil.swap_memory()
            stats['memory'] = {
                'total': mem.total,
                'used': mem.used,
                'available': mem.available,
                'percent': mem.percent,
                'total_gb': round(mem.total / (1024**3), 1),
                'used_gb': round(mem.used / (1024**3), 1),
                'swap_total_gb': round(swap.total / (1024**3), 1),
                'swap_used_gb': round(swap.used / (1024**3), 1),
                'swap_percent': swap.percent,
            }
        except Exception:
            stats['memory'] = {'total': 0, 'used': 0, 'available': 0, 'percent': 0, 'total_gb': 0, 'used_gb': 0, 'swap_total_gb': 0, 'swap_used_gb': 0, 'swap_percent': 0}

        # Disk
        try:
            import psutil
            disk = psutil.disk_usage('/')
            stats['disk'] = {
                'total': disk.total,
                'used': disk.used,
                'free': disk.free,
                'percent': disk.percent,
                'total_gb': round(disk.total / (1024**3), 1),
                'used_gb': round(disk.used / (1024**3), 1),
                'free_gb': round(disk.free / (1024**3), 1),
            }
        except Exception:
            stats['disk'] = {'total': 0, 'used': 0, 'free': 0, 'percent': 0, 'total_gb': 0, 'used_gb': 0, 'free_gb': 0}

        # Temperature
        try:
            import psutil
            temps = psutil.sensors_temperatures()
            if temps:
                temp_val = None
                temp_label = ''
                for name, entries in temps.items():
                    if entries:
                        temp_val = entries[0].current
                        temp_label = f"{name} {entries[0].label or ''}"
                        break
                stats['temperature'] = {
                    'celsius': round(temp_val, 1) if temp_val is not None else 0,
                    'label': temp_label,
                }
            else:
                try:
                    with open('/sys/class/thermal/thermal_zone0/temp') as f:
                        temp_val = int(f.read().strip()) / 1000.0
                    stats['temperature'] = {'celsius': round(temp_val, 1), 'label': 'thermal_zone0'}
                except Exception:
                    stats['temperature'] = {'celsius': 0, 'label': 'N/A'}
        except Exception:
            stats['temperature'] = {'celsius': 0, 'label': 'N/A'}

        # Uptime
        try:
            uptime_sec = 0
            if platform.system() == 'Linux':
                with open('/proc/uptime') as f:
                    uptime_sec = float(f.read().split()[0])
            elif platform.system() == 'Darwin':
                result = subprocess.run(['sysctl', '-n', 'kern.boottime'], capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    import re
                    match = re.search(r'sec = (\d+)', result.stdout.strip())
                    if match:
                        uptime_sec = time.time() - int(match.group(1))
            h = int(uptime_sec // 3600)
            m = int((uptime_sec % 3600) // 60)
            s = int(uptime_sec % 60)
            stats['uptime'] = {'seconds': int(uptime_sec), 'formatted': f'{h}h {m}m {s}s'}
        except Exception:
            stats['uptime'] = {'seconds': 0, 'formatted': 'N/A'}

        # Network
        try:
            import psutil
            net_io = psutil.net_io_counters()
            stats['network'] = {
                'bytes_sent': net_io.bytes_sent,
                'bytes_recv': net_io.bytes_recv,
                'packets_sent': net_io.packets_sent,
                'packets_recv': net_io.packets_recv,
                'connected': True,
            }
            net_addrs = psutil.net_if_addrs()
            interfaces = []
            for iface, addrs in net_addrs.items():
                for addr in addrs:
                    if addr.family == 2:
                        interfaces.append({'name': iface, 'ip': addr.address})
            stats['network']['interfaces'] = interfaces[:5]
        except Exception:
            stats['network'] = {'bytes_sent': 0, 'bytes_recv': 0, 'packets_sent': 0, 'packets_recv': 0, 'connected': False, 'interfaces': []}

        # GPU (nvidia-smi)
        try:
            result = subprocess.run(
                ['nvidia-smi', '--query-gpu=name,memory.total,memory.used,memory.free,temperature.gpu,utilization.gpu', '--format=csv,noheader,nounits'],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0 and result.stdout.strip():
                gpus = []
                for line in result.stdout.strip().split('\n'):
                    parts = [p.strip() for p in line.split(',')]
                    if len(parts) >= 6:
                        gpus.append({
                            'name': parts[0],
                            'memory_total_mb': int(parts[1]) if parts[1].isdigit() else 0,
                            'memory_used_mb': int(parts[2]) if parts[2].isdigit() else 0,
                            'memory_free_mb': int(parts[3]) if parts[3].isdigit() else 0,
                            'temperature': int(parts[4]) if parts[4].isdigit() else 0,
                            'utilization': int(parts[5]) if parts[5].isdigit() else 0,
                        })
                stats['gpu'] = {'available': True, 'gpus': gpus}
            else:
                stats['gpu'] = {'available': False, 'gpus': []}
        except (FileNotFoundError, subprocess.TimeoutExpired):
            stats['gpu'] = {'available': False, 'gpus': []}

        # Top processes
        try:
            import psutil
            procs = []
            for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
                try:
                    pinfo = proc.info
                    procs.append(pinfo)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            procs.sort(key=lambda p: p.get('cpu_percent', 0) or 0, reverse=True)
            stats['processes'] = procs[:10]
        except Exception:
            stats['processes'] = []

        # OS info
        stats['os_info'] = {
            'system': platform.system(),
            'release': platform.release(),
            'version': platform.version(),
            'machine': platform.machine(),
            'processor': platform.processor(),
            'hostname': platform.node(),
            'myanos_version': VERSION,
        }

        stats['timestamp'] = datetime.now().isoformat()
        self.send_json(stats)

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

        if dist_dir.exists():
            for f in sorted(dist_dir.iterdir()):
                if f.suffix == '.myan':
                    name = f.stem
                    parts = name.rsplit('-', 1)
                    pkg_name = parts[0] if len(parts) > 1 else name
                    version = parts[1] if len(parts) > 1 else '0.0.0'

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
                data = json.loads(req.read())
                self.send_json({'connected': True, 'models': data.get('models', [])})
            except:
                self.send_json({'connected': False, 'models': []})

        elif action == 'system_stats':
            import platform as pf
            import os as _os
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
                'platform': pf.platform(),
                'python': pf.python_version(),
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
        self.send_json({
            'status': 'ok',
            'version': VERSION,
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
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key')
        self.end_headers()

    def log_message(self, format, *args):
        """Custom logging"""
        msg = format % args
        if '/api/' in msg:
            print(f"  [API] {msg}")

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


# ─── Global server state ─────────────────────────────────────────────────
_server_start_time = time.time()
PID_FILE = BASE_DIR / '.myanos.pid'
LOG_FILE = BASE_DIR / '.myanos.log'


def main():
    global _server_start_time
    port = DEFAULT_PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass

    # Handle special flags
    if '--stop' in sys.argv:
        stop_server()
        return
    if '--status' in sys.argv:
        check_status()
        return

    port = find_port(port)

    # Initialize security
    api_key = init_api_key()
    pw_hash = init_password()

    # Build packages if dist/ is empty
    dist_dir = BASE_DIR / 'dist'
    if not dist_dir.exists() or not list(dist_dir.glob('*.myan')):
        print('  [PKG] Building packages...')
        try:
            bp = BASE_DIR / 'build_packages.py'
            if bp.exists():
                subprocess.run([sys.executable, str(bp)], capture_output=True, timeout=30, cwd=str(BASE_DIR))
                print('  [PKG] Packages built successfully')
        except Exception as e:
            print(f'  [PKG] Build failed: {e}')

    # Write PID file
    _server_start_time = time.time()
    PID_FILE.write_text(str(os.getpid()))

    # Change to desktop directory for serving
    os.chdir(str(DESKTOP_DIR))

    server = HTTPServer(('0.0.0.0', port), MyanosHandler)

    def shutdown(sig, frame):
        print(f"\n  [MMR] Server shutting down...")
        if PID_FILE.exists():
            PID_FILE.unlink()
        server.shutdown()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # Auto-cleanup on exit
    atexit.register(lambda: PID_FILE.unlink(missing_ok=True))

    # Log to file
    log_line = f"[{datetime.now().isoformat()}] Myanos v{VERSION} started on port {port}\n"
    with open(LOG_FILE, 'a') as f:
        f.write(log_line)

    print()
    print(f"  ╔══════════════════════════════════════════╗")
    print(f"  ║  Myanos Web OS v{VERSION}               ║")
    print(f"  ║  Production-Ready with Security Layer    ║")
    print(f"  ║  Server running on port {port:<19}║")
    print(f"  ╚══════════════════════════════════════════╝")
    print()
    print(f"  Desktop:  http://localhost:{port}")
    print(f"  API:      http://localhost:{port}/api/exec")
    print(f"  Stats:    http://localhost:{port}/api/system-stats")
    print(f"  Packages: http://localhost:{port}/api/packages")
    print(f"  Health:   http://localhost:{port}/api/health")
    print(f"  Proxy:    http://localhost:{port}/api/proxy?url=https://example.com")
    print()
    print(f"  API Key:  {api_key[:16]}...{api_key[-8:]}")
    print(f"  Security: Rate limiting (30 req/min)")
    print(f"  Security: Command safety filter active")
    print(f"  Security: SHA-256 password hashing")
    print()
    print(f"  PID file: {PID_FILE}")
    print(f"  Log file: {LOG_FILE}")
    print(f"  Press Ctrl+C to stop")
    print()

    # Flush stdout periodically for nohup/logging
    import sys as _sys
    def _flush_loop():
        while True:
            time.sleep(5)
            try:
                _sys.stdout.flush()
                _sys.stderr.flush()
            except Exception:
                break
    Thread(target=_flush_loop, daemon=True).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        shutdown(None, None)


def stop_server():
    """Stop a running Myanos server"""
    if not PID_FILE.exists():
        print('  [INFO] No running server found (no PID file)')
        return
    try:
        pid = int(PID_FILE.read_text().strip())
        os.kill(pid, signal.SIGTERM)
        time.sleep(1)
        try:
            os.kill(pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        PID_FILE.unlink(missing_ok=True)
        print(f'  [OK] Server stopped (PID {pid})')
    except Exception as e:
        print(f'  [ERR] Could not stop: {e}')
        PID_FILE.unlink(missing_ok=True)


def check_status():
    """Check server status"""
    if not PID_FILE.exists():
        print('  [INFO] Server is NOT running')
        return
    try:
        pid = int(PID_FILE.read_text().strip())
        os.kill(pid, 0)  # Check if process exists
        uptime = time.time() - _server_start_time
        h = int(uptime // 3600)
        m = int((uptime % 3600) // 60)
        s = int(uptime % 60)
        print(f'  [OK] Server is RUNNING (PID {pid}, uptime: {h}h {m}m {s}s)')
    except ProcessLookupError:
        print('  [INFO] Server is NOT running (stale PID file)')
        PID_FILE.unlink(missing_ok=True)
    except Exception as e:
        print(f'  [ERR] Status check failed: {e}')


if __name__ == '__main__':
    main()
