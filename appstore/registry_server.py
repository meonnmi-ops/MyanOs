#!/usr/bin/env python3
"""
Myanos App Store - Registry Server
Lightweight REST API server for online package registry.

Usage:
    python3 -m appstore.registry_server              # Start server on port 8080
    python3 -m appstore.registry_server --port 9090  # Custom port
    python3 -m appstore.registry_server --init       # Initialize with default packages

API Endpoints:
    GET  /api/                        -> Registry info & stats
    GET  /api/packages                -> List all packages (paginated)
    GET  /api/packages/:name          -> Package details
    GET  /api/packages/:name/download -> Download .myan file
    GET  /api/search?q=QUERY          -> Search packages
    GET  /api/categories              -> List categories
    GET  /api/categories/:cat         -> Packages by category
    GET  /api/featured                -> Featured packages
    GET  /api/recent                  -> Recently updated
    GET  /api/popular                 -> Most downloaded
    GET  /api/stats                   -> Registry statistics
    POST /api/packages                -> Publish new package (auth)
    PUT  /api/packages/:name          -> Update package (auth)
    DEL  /api/packages/:name          -> Remove package (auth)
    POST /api/packages/:name/rate     -> Rate package
    POST /api/packages/:name/review   -> Write review
    POST /api/auth/register           -> Register user
    POST /api/auth/login              -> Login
"""

import os
import sys
import json
import time
import argparse
import hashlib
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from typing import Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from appstore.config import (
    DEFAULT_HOST, DEFAULT_PORT, DATA_DIR, REPO_DIR,
    CACHE_DIR, DB_FILE, USERS_DB, CATEGORIES, MAX_UPLOAD_SIZE,
    ensure_dirs
)
from appstore.models import (
    Package, Review, User, APIResponse, RepoIndex
)


class RateLimiter:
    """Simple in-memory rate limiter"""

    def __init__(self, max_requests=100, window=3600):
        self.max_requests = max_requests
        self.window = window
        self.requests = {}

    def check(self, ip: str) -> bool:
        now = time.time()
        if ip not in self.requests:
            self.requests[ip] = []
        # Clean old entries
        self.requests[ip] = [t for t in self.requests[ip] if now - t < self.window]
        if len(self.requests[ip]) >= self.max_requests:
            return False
        self.requests[ip].append(now)
        return True


class RequestHandler(BaseHTTPRequestHandler):
    """HTTP request handler for the App Store API"""

    # Class-level shared state
    index: RepoIndex = None
    users_db: dict = None
    rate_limiter: RateLimiter = None
    repo_dir: Path = None
    auth_tokens: dict = {}  # token -> username

    def log_message(self, format, *args):
        """Custom logging format"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {args[0]}")

    def _send_json(self, data, status=200):
        """Send JSON response"""
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False, indent=2).encode())

    def _read_body(self) -> bytes:
        """Read request body"""
        length = int(self.headers.get("Content-Length", 0))
        if length > MAX_UPLOAD_SIZE:
            return None
        return self.rfile.read(length) if length > 0 else b""

    def _parse_body(self) -> dict:
        """Parse JSON body"""
        body = self._read_body()
        if body is None:
            return None
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            return None

    def _get_auth_user(self) -> Optional[str]:
        """Get authenticated username from request"""
        auth = self.headers.get("Authorization", "")
        token = self.headers.get("X-API-Key", "")
        if token and token in self.auth_tokens:
            return self.auth_tokens[token]
        if auth.startswith("Bearer "):
            token = auth[7:]
            if token in self.auth_tokens:
                return self.auth_tokens[token]
        return None

    def _get_path_parts(self) -> list:
        """Parse URL path into parts"""
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.strip("/")
        parts = path.split("/")
        return parts

    def _get_query_params(self) -> dict:
        """Parse URL query parameters"""
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        return {k: v[0] if len(v) == 1 else v for k, v in params.items()}

    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
        self.end_headers()

    def do_GET(self):
        """Handle GET requests"""
        # Rate limiting
        ip = self.client_address[0]
        if not self.rate_limiter.check(ip):
            self._send_json(APIResponse.error("Rate limit exceeded", 429), 429)
            return

        parts = self._get_path_parts()

        # API root
        if parts == ["api"]:
            self._handle_api_root()
        # Packages list
        elif parts == ["api", "packages"]:
            self._handle_packages_list()
        # Package detail / download / rate / review
        elif len(parts) >= 3 and parts[0] == "api" and parts[1] == "packages":
            name = parts[2]
            if len(parts) == 3:
                self._handle_package_detail(name)
            elif len(parts) == 4:
                if parts[3] == "download":
                    self._handle_package_download(name)
                elif parts[3] == "rate":
                    pass  # POST only
                elif parts[3] == "reviews":
                    self._handle_package_reviews(name)
        # Search
        elif parts == ["api", "search"]:
            self._handle_search()
        # Categories
        elif parts == ["api", "categories"]:
            self._handle_categories_list()
        elif len(parts) == 3 and parts[0] == "api" and parts[1] == "categories":
            self._handle_category_packages(parts[2])
        # Featured / Recent / Popular
        elif parts == ["api", "featured"]:
            self._handle_featured()
        elif parts == ["api", "recent"]:
            self._handle_recent()
        elif parts == ["api", "popular"]:
            self._handle_popular()
        # Stats
        elif parts == ["api", "stats"]:
            self._handle_stats()
        # Package file download (direct)
        elif len(parts) == 1 and parts[0].endswith(".myan"):
            self._handle_direct_download(parts[0])
        else:
            self._send_json(APIResponse.error("Endpoint not found", 404), 404)

    def do_POST(self):
        """Handle POST requests"""
        parts = self._get_path_parts()

        # Auth
        if parts == ["api", "auth", "register"]:
            self._handle_register()
        elif parts == ["api", "auth", "login"]:
            self._handle_login()
        # Publish package
        elif parts == ["api", "packages"]:
            self._handle_publish_package()
        # Rate / Review
        elif len(parts) == 4 and parts[0] == "api" and parts[1] == "packages":
            name = parts[2]
            if parts[3] == "rate":
                self._handle_rate(name)
            elif parts[3] == "review":
                self._handle_review(name)
        else:
            self._send_json(APIResponse.error("Endpoint not found", 404), 404)

    def do_PUT(self):
        """Handle PUT requests"""
        parts = self._get_path_parts()
        if len(parts) == 3 and parts[0] == "api" and parts[1] == "packages":
            self._handle_update_package(parts[2])
        else:
            self._send_json(APIResponse.error("Endpoint not found", 404), 404)

    def do_DELETE(self):
        """Handle DELETE requests"""
        parts = self._get_path_parts()
        if len(parts) == 3 and parts[0] == "api" and parts[1] == "packages":
            self._handle_delete_package(parts[2])
        else:
            self._send_json(APIResponse.error("Endpoint not found", 404), 404)

    # ── API Root ──

    def _handle_api_root(self):
        """GET /api/ - Registry info"""
        info = {
            "name": self.index.data.get("name", "Myanos Registry"),
            "version": self.index.data.get("version", "1.0.0"),
            "description": self.index.data.get("description", ""),
            "endpoints": [
                "GET /api/packages",
                "GET /api/packages/:name",
                "GET /api/packages/:name/download",
                "GET /api/search?q=QUERY",
                "GET /api/categories",
                "GET /api/featured",
                "GET /api/recent",
                "GET /api/popular",
                "GET /api/stats",
                "POST /api/packages (auth)",
                "POST /api/auth/register",
                "POST /api/auth/login",
            ]
        }
        self._send_json(APIResponse.success(info))

    # ── Packages ──

    def _handle_packages_list(self):
        """GET /api/packages - List all packages (paginated)"""
        params = self._get_query_params()
        page = int(params.get("page", 1))
        per_page = int(params.get("per_page", 20))
        category = params.get("category", "")
        sort = params.get("sort", "name")  # name, downloads, rating, updated

        pkgs = list(self.index.data["packages"].values())

        # Filter by category
        if category:
            pkgs = [p for p in pkgs if p.get("category") == category]

        # Sort
        if sort == "downloads":
            pkgs.sort(key=lambda p: p.get("downloads", 0), reverse=True)
        elif sort == "rating":
            pkgs.sort(key=lambda p: p.get("rating", 0), reverse=True)
        elif sort == "updated":
            pkgs.sort(key=lambda p: p.get("updated", ""), reverse=True)
        else:
            pkgs.sort(key=lambda p: p.get("name", ""))

        total = len(pkgs)
        start = (page - 1) * per_page
        end = start + per_page
        page_pkgs = pkgs[start:end]

        self._send_json(APIResponse.paginated(page_pkgs, page, per_page, total))

    def _handle_package_detail(self, name):
        """GET /api/packages/:name - Package details"""
        pkg = self.index.get_package(name)
        if not pkg:
            self._send_json(APIResponse.error(f"Package '{name}' not found", 404), 404)
            return
        self._send_json(APIResponse.success(pkg))

    def _handle_package_download(self, name):
        """GET /api/packages/:name/download - Download .myan file"""
        pkg = self.index.get_package(name)
        if not pkg:
            self._send_json(APIResponse.error(f"Package '{name}' not found", 404), 404)
            return

        # Look for the .myan file in repo directory
        pkg_file = self.repo_dir / f"{name}-{pkg['version']}.myan"
        if not pkg_file.exists():
            # Try alternative naming
            for f in self.repo_dir.glob(f"{name}-*.myan"):
                pkg_file = f
                break

        if not pkg_file.exists():
            self._send_json(APIResponse.error("Package file not available for download", 404), 404)
            return

        # Increment download counter
        self.index.increment_download(name)
        self.index.save(str(DB_FILE))

        # Send file
        self.send_response(200)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Disposition", f"attachment; filename=\"{pkg_file.name}\"")
        self.send_header("Content-Length", str(pkg_file.stat().st_size))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        with open(pkg_file, "rb") as f:
            self.wfile.write(f.read())

    def _handle_direct_download(self, filename):
        """GET /:filename.myan - Direct .myan file download"""
        pkg_file = self.repo_dir / filename
        if not pkg_file.exists():
            self._send_json(APIResponse.error("File not found", 404), 404)
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Disposition", f"attachment; filename=\"{filename}\"")
        self.send_header("Content-Length", str(pkg_file.stat().st_size))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        with open(pkg_file, "rb") as f:
            self.wfile.write(f.read())

    # ── Search ──

    def _handle_search(self):
        """GET /api/search?q=QUERY&category=CAT - Search packages"""
        params = self._get_query_params()
        query = params.get("q", "")
        category = params.get("category", "")

        if not query:
            self._send_json(APIResponse.error("Missing query parameter 'q'", 400), 400)
            return

        results = self.index.search(query, category or None)
        self._send_json(APIResponse.success([r for r in results]))

    # ── Categories ──

    def _handle_categories_list(self):
        """GET /api/categories - List all categories with counts"""
        cats = {}
        for cat_id, cat_info in CATEGORIES.items():
            count = len(self.index.data.get("categories", {}).get(cat_id, []))
            if count > 0 or cat_id in self.index.data.get("categories", {}):
                cats[cat_id] = {
                    **cat_info,
                    "package_count": count,
                }
        self._send_json(APIResponse.success(cats))

    def _handle_category_packages(self, category):
        """GET /api/categories/:cat - Packages in category"""
        pkgs = self.index.get_by_category(category)
        if not pkgs:
            self._send_json(APIResponse.error(f"Category '{category}' not found or empty", 404), 404)
            return
        self._send_json(APIResponse.success(pkgs))

    # ── Featured / Recent / Popular ──

    def _handle_featured(self):
        """GET /api/featured - Featured packages"""
        featured = self.index.get_featured()
        self._send_json(APIResponse.success(featured))

    def _handle_recent(self):
        """GET /api/recent - Recently updated packages"""
        params = self._get_query_params()
        limit = int(params.get("limit", 10))
        recent = self.index.get_recent(limit)
        self._send_json(APIResponse.success(recent))

    def _handle_popular(self):
        """GET /api/popular - Most downloaded packages"""
        params = self._get_query_params()
        limit = int(params.get("limit", 10))
        popular = self.index.get_popular(limit)
        self._send_json(APIResponse.success(popular))

    def _handle_stats(self):
        """GET /api/stats - Registry statistics"""
        self._send_json(APIResponse.success(self.index.data.get("stats", {})))

    # ── Reviews ──

    def _handle_package_reviews(self, name):
        """GET /api/packages/:name/reviews - Package reviews"""
        pkg = self.index.get_package(name)
        if not pkg:
            self._send_json(APIResponse.error(f"Package '{name}' not found", 404), 404)
            return
        reviews_file = DATA_DIR / "reviews" / f"{name}.json"
        reviews = []
        if reviews_file.exists():
            with open(reviews_file, 'r', encoding='utf-8') as f:
                reviews = json.load(f)
        self._send_json(APIResponse.success(reviews))

    # ── Auth ──

    def _handle_register(self):
        """POST /api/auth/register - Register new user"""
        body = self._parse_body()
        if not body:
            self._send_json(APIResponse.error("Invalid JSON body", 400), 400)
            return

        username = body.get("username", "").strip()
        email = body.get("email", "").strip()
        role = body.get("role", "user")

        if not username or not email:
            self._send_json(APIResponse.error("Username and email required", 400), 400)
            return

        if username in self.users_db:
            self._send_json(APIResponse.error("Username already exists", 409), 409)
            return

        user = User(username, email, role)
        self.users_db[username] = user.to_dict()
        self.users_db[username]["token"] = user.data["token"]  # Store token internally
        self._save_users()

        self._send_json(APIResponse.success({
            "username": username,
            "email": email,
            "role": role,
            "token": user.data["token"],
            "message": "Registration successful. Save your API token."
        }, "User registered", 201), 201)

    def _handle_login(self):
        """POST /api/auth/login - Login (get token)"""
        body = self._parse_body()
        if not body:
            self._send_json(APIResponse.error("Invalid JSON body", 400), 400)
            return

        username = body.get("username", "").strip()
        if not username:
            self._send_json(APIResponse.error("Username required", 400), 400)
            return

        if username not in self.users_db:
            self._send_json(APIResponse.error("User not found", 404), 404)
            return

        user_data = self.users_db[username]
        token = user_data.get("token", "")
        self.auth_tokens[token] = username

        self._send_json(APIResponse.success({
            "username": username,
            "role": user_data.get("role", "user"),
            "token": token,
        }, "Login successful"))

    # ── Publish / Update / Delete (Auth required) ──

    def _handle_publish_package(self):
        """POST /api/packages - Publish new package"""
        user = self._get_auth_user()
        if not user:
            self._send_json(APIResponse.error("Authentication required. Use X-API-Key header.", 401), 401)
            return

        body = self._parse_body()
        if not body:
            self._send_json(APIResponse.error("Invalid JSON body", 400), 400)
            return

        try:
            body["author"] = user
            pkg = Package(body)
            if not pkg.validate():
                self._send_json(APIResponse.error("Invalid package metadata", 400), 400)
                return

            if self.index.get_package(pkg.name):
                self._send_json(APIResponse.error(
                    f"Package '{pkg.name}' already exists. Use PUT to update.", 409), 409)
                return

            self.index.add_package(pkg)
            self.index.save(str(DB_FILE))

            # Save token mapping
            self.auth_tokens[self.headers.get("X-API-Key", "")] = user

            self._send_json(APIResponse.success(
                pkg.to_summary(), f"Package '{pkg.name}' published successfully", 201), 201)

        except ValueError as e:
            self._send_json(APIResponse.error(str(e), 400), 400)

    def _handle_update_package(self, name):
        """PUT /api/packages/:name - Update package"""
        user = self._get_auth_user()
        if not user:
            self._send_json(APIResponse.error("Authentication required", 401), 401)
            return

        pkg = self.index.get_package(name)
        if not pkg:
            self._send_json(APIResponse.error(f"Package '{name}' not found", 404), 404)
            return

        if pkg.get("author") != user:
            self._send_json(APIResponse.error("Only the package author can update it", 403), 403)
            return

        body = self._parse_body()
        if not body:
            self._send_json(APIResponse.error("Invalid JSON body", 400), 400)
            return

        # Update allowed fields
        for field in ["version", "description", "icon", "screenshots", "tags",
                       "homepage", "license", "dependencies", "min_myanos",
                       "download_url", "checksum", "size", "category"]:
            if field in body:
                pkg[field] = body[field]
        pkg["updated"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")

        self.index.save(str(DB_FILE))
        self._send_json(APIResponse.success(pkg, f"Package '{name}' updated"))

    def _handle_delete_package(self, name):
        """DELETE /api/packages/:name - Remove package"""
        user = self._get_auth_user()
        if not user:
            self._send_json(APIResponse.error("Authentication required", 401), 401)
            return

        pkg = self.index.get_package(name)
        if not pkg:
            self._send_json(APIResponse.error(f"Package '{name}' not found", 404), 404)
            return

        if pkg.get("author") != user:
            self._send_json(APIResponse.error("Only the package author can delete it", 403), 403)
            return

        self.index.remove_package(name)
        self.index.save(str(DB_FILE))
        self._send_json(APIResponse.success(None, f"Package '{name}' deleted"))

    # ── Rate / Review ──

    def _handle_rate(self, name):
        """POST /api/packages/:name/rate - Rate a package (1-5)"""
        pkg = self.index.get_package(name)
        if not pkg:
            self._send_json(APIResponse.error(f"Package '{name}' not found", 404), 404)
            return

        body = self._parse_body()
        if not body:
            self._send_json(APIResponse.error("Invalid JSON body", 400), 400)
            return

        rating = body.get("rating", 0)
        if not 1 <= rating <= 5:
            self._send_json(APIResponse.error("Rating must be between 1 and 5", 400), 400)
            return

        # Simple rating update
        old_rating = pkg.get("rating", 0)
        old_count = pkg.get("rating_count", 0)
        new_count = old_count + 1
        new_rating = ((old_rating * old_count) + rating) / new_count

        pkg["rating"] = round(new_rating, 1)
        pkg["rating_count"] = new_count
        self.index.save(str(DB_FILE))

        self._send_json(APIResponse.success({
            "rating": pkg["rating"],
            "rating_count": new_count,
        }, f"Rated '{name}' {rating}/5"))

    def _handle_review(self, name):
        """POST /api/packages/:name/review - Write a review"""
        pkg = self.index.get_package(name)
        if not pkg:
            self._send_json(APIResponse.error(f"Package '{name}' not found", 404), 404)
            return

        body = self._parse_body()
        if not body:
            self._send_json(APIResponse.error("Invalid JSON body", 400), 400)
            return

        username = body.get("username", "anonymous")
        rating = body.get("rating", 5)
        comment = body.get("comment", "")

        if not comment:
            self._send_json(APIResponse.error("Comment required", 400), 400)
            return

        review = Review(username, name, rating, comment)

        # Save review
        reviews_dir = DATA_DIR / "reviews"
        reviews_dir.mkdir(parents=True, exist_ok=True)
        reviews_file = reviews_dir / f"{name}.json"
        reviews = []
        if reviews_file.exists():
            with open(reviews_file, 'r', encoding='utf-8') as f:
                reviews = json.load(f)
        reviews.append(review.to_dict())
        with open(reviews_file, 'w', encoding='utf-8') as f:
            json.dump(reviews, f, indent=2, ensure_ascii=False)

        # Update rating
        if 1 <= rating <= 5:
            old_rating = pkg.get("rating", 0)
            old_count = pkg.get("rating_count", 0)
            new_count = old_count + 1
            new_rating = ((old_rating * old_count) + rating) / new_count
            pkg["rating"] = round(new_rating, 1)
            pkg["rating_count"] = new_count
            self.index.save(str(DB_FILE))

        self._send_json(APIResponse.success(
            review.to_dict(), "Review submitted", 201), 201)

    # ── Persistence ──

    @classmethod
    def _save_users(cls):
        """Save users database"""
        os.makedirs(os.path.dirname(USERS_DB), exist_ok=True)
        with open(USERS_DB, 'w', encoding='utf-8') as f:
            json.dump(cls.users_db, f, indent=2, ensure_ascii=False)


# ──────────────────────────────────────────────
# Default packages for initialization
# ──────────────────────────────────────────────

DEFAULT_PACKAGES = [
    {
        "name": "myanmar-code",
        "version": "2.0.1",
        "author": "Aung MoeOo (MWD)",
        "description": "Myanmar Programming Language with 127 keywords. Write code in Myanmar language.",
        "description_my": "မြန်မာဘာသာစကားဖြင့် ရေးသားနိုင်သော ပရိုဂရမ်းမင်းဘာသာစကား (Myanmar Programming Language)",
        "category": "language",
        "icon": "",
        "tags": ["myanmar", "programming", "language", "mmc"],
        "license": "MIT",
        "homepage": "https://pypi.org/project/myanmar-code/",
        "size": 2200,
        "downloads": 342,
        "rating": 4.7,
        "rating_count": 28,
        "verified": True,
        "featured": True,
    },
    {
        "name": "myanos-terminal",
        "version": "1.0.0",
        "author": "Meonnmi-ops",
        "description": "Linux-like interactive terminal with file management, shell commands, and web interface.",
        "description_my": "Linux ကိုယ်စားပြုလိုက် Web-based ကိရိယာ Terminal",
        "category": "system",
        "icon": "",
        "tags": ["terminal", "shell", "cli", "web"],
        "license": "MIT",
        "size": 8400,
        "downloads": 567,
        "rating": 4.5,
        "rating_count": 42,
        "verified": True,
        "featured": True,
    },
    {
        "name": "myanos-display-engine",
        "version": "1.0.0",
        "author": "Meonnmi-ops",
        "description": "noVNC-based display engine for streaming Android and PS2 displays to web browser.",
        "description_my": "noVNC ဖြင့် Android နှင့် PS2 Display ကို Web Browser မှာ ကြည့်နိုင်သော Engine",
        "category": "display",
        "icon": "",
        "tags": ["display", "vnc", "novnc", "streaming"],
        "license": "MIT",
        "size": 4800,
        "downloads": 234,
        "rating": 4.3,
        "rating_count": 19,
        "verified": True,
        "featured": False,
    },
    {
        "name": "myanos-ps2-layer",
        "version": "1.0.0",
        "author": "Meonnmi-ops",
        "description": "PlayStation 2 emulation layer with Play! and PCSX2 emulator integration for running PS2 games.",
        "description_my": "PlayStation 2 ခန်းဖြင့် PS2 ဂိုးများ စက်တင်ခန်းအတွက် Emulation Layer",
        "category": "emulation",
        "icon": "",
        "tags": ["ps2", "playstation", "emulation", "games"],
        "license": "MIT",
        "size": 3100,
        "downloads": 189,
        "rating": 4.6,
        "rating_count": 15,
        "verified": True,
        "featured": True,
    },
    {
        "name": "myanos-android-layer",
        "version": "1.0.0",
        "author": "Meonnmi-ops",
        "description": "Android APK management via WayDroid/ADB with VNC streaming to browser. Run Android apps on Myanos.",
        "description_my": "WayDroid/ADB ဖြင့် Android APK များ စီမံပြီး VNC Streaming ဖြင့် Browser မှာ အသုံးပြုနိုင်",
        "category": "android",
        "icon": "",
        "tags": ["android", "waydroid", "apk", "vnc"],
        "license": "MIT",
        "size": 8900,
        "downloads": 423,
        "rating": 4.4,
        "rating_count": 31,
        "verified": True,
        "featured": True,
    },
    {
        "name": "myanos-toolbox",
        "version": "1.0.0",
        "author": "Meonnmi-ops",
        "description": "Professional toolbox with 20+ tools: storage analysis, network scanner, firmware flash, and security tools.",
        "description_my": "၂၀+ ကိရိယာများပါသော ပညာရေးရည်ရွယ်ချက် ကိရိယာအိမ်",
        "category": "tools",
        "icon": "",
        "tags": ["tools", "utility", "network", "storage", "security"],
        "license": "MIT",
        "size": 4100,
        "downloads": 356,
        "rating": 4.8,
        "rating_count": 37,
        "verified": True,
        "featured": True,
    },
    {
        "name": "myanai",
        "version": "1.0.0",
        "author": "Meonnmi-ops",
        "description": "Low-Code AI Agent Builder. Create AI agents with visual workflow editor without writing code.",
        "description_my": "Low-Code AI Agent Builder. Code ရသော်မဟုတ်ဘဲ AI Agent များ ဖန်တီးနိုင်သော ကိရိယာ",
        "category": "development",
        "icon": "",
        "tags": ["ai", "agent", "builder", "low-code", "automation"],
        "license": "MIT",
        "size": 28700,
        "downloads": 156,
        "rating": 4.2,
        "rating_count": 12,
        "verified": True,
        "featured": True,
    },
    {
        "name": "myanos-settings",
        "version": "1.0.0",
        "author": "Meonnmi-ops",
        "description": "System settings manager with themes, wallpaper, sound, and user preferences configuration.",
        "description_my": "Theme, Wallpaper, Sound စသည့် System Settings စီမံကိရိယာ",
        "category": "system",
        "icon": "",
        "tags": ["settings", "preferences", "theme", "wallpaper"],
        "license": "MIT",
        "size": 3200,
        "downloads": 445,
        "rating": 4.1,
        "rating_count": 22,
        "verified": True,
        "featured": False,
    },
]


def init_registry():
    """Initialize registry with default packages"""
    ensure_dirs()
    index = RepoIndex()

    if DB_FILE.exists():
        print(f"[INFO] Registry already exists at {DB_FILE}")
        print(f"       Use --reset to reinitialize")
        index.load(str(DB_FILE))
        return index

    print("[INIT] Initializing Myanos App Store Registry...")
    for pkg_data in DEFAULT_PACKAGES:
        try:
            pkg = Package(pkg_data)
            index.add_package(pkg)
            print(f"  [+] {pkg.name} v{pkg.version}")
        except ValueError as e:
            print(f"  [!] Error adding package: {e}")

    index.save(str(DB_FILE))
    print(f"[OK] Registry initialized with {len(index.data['packages'])} packages")
    print(f"     Saved to: {DB_FILE}")
    return index


def load_users():
    """Load users database"""
    if USERS_DB.exists():
        with open(USERS_DB, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def run_server(host=DEFAULT_HOST, port=DEFAULT_PORT, reset=False):
    """Start the App Store registry server"""
    global DB_FILE, USERS_DB

    ensure_dirs()

    if reset and DB_FILE.exists():
        print("[RESET] Removing existing registry...")
        os.remove(DB_FILE)

    index = init_registry()
    users = load_users()

    # Set class-level state
    RequestHandler.index = index
    RequestHandler.users_db = users
    RequestHandler.rate_limiter = RateLimiter()
    RequestHandler.repo_dir = REPO_DIR

    # Restore auth tokens from users
    for username, udata in users.items():
        token = udata.get("token", "")
        if token:
            RequestHandler.auth_tokens[token] = username

    server = HTTPServer((host, port), RequestHandler)

    print()
    print("=" * 55)
    print("  Myanos App Store - Registry Server v1.0.0")
    print("=" * 55)
    print(f"  URL:       http://{host}:{port}")
    print(f"  API:       http://{host}:{port}/api")
    print(f"  Packages:  {index.data['stats']['total_packages']}")
    print(f"  Downloads: {index.data['stats']['total_downloads']}")
    print(f"  Repo dir:  {REPO_DIR}")
    print("=" * 55)
    print(f"  Commands:")
    print(f"    Browse:  curl http://localhost:{port}/api/packages")
    print(f"    Search:  curl 'http://localhost:{port}/api/search?q=tool'")
    print(f"    Download: curl -O http://localhost:{port}/api/packages/PACKAGE/download")
    print("=" * 55)
    print()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[INFO] Server stopped")
        server.server_close()


def main():
    parser = argparse.ArgumentParser(
        description="Myanos App Store - Registry Server",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 -m appstore.registry_server              # Start on port 8080
  python3 -m appstore.registry_server --port 9090  # Custom port
  python3 -m appstore.registry_server --init       # Initialize only
  python3 -m appstore.registry_server --reset      # Reset & reinitialize
        """
    )
    parser.add_argument("--host", default=DEFAULT_HOST, help="Server host")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Server port")
    parser.add_argument("--init", action="store_true", help="Initialize registry only")
    parser.add_argument("--reset", action="store_true", help="Reset registry")
    parser.add_argument("--version", action="version", version="Myanos App Store v1.0.0")

    args = parser.parse_args()

    if args.init:
        init_registry()
        return

    run_server(args.host, args.port, args.reset)


if __name__ == "__main__":
    main()
