#!/usr/bin/env python3
"""
Myanos App Store - Client CLI
Command-line client for browsing, searching, and installing packages
from remote Myanos App Store registries.

Usage:
    python3 -m appstore.client search <query>       Search packages
    python3 -m appstore.client list                  List all packages
    python3 -m appstore.client info <name>           Package details
    python3 -m appstore.client install <name>        Download & install package
    python3 -m appstore.client featured              Featured packages
    python3 -m appstore.client categories            List categories
    python3 -m appstore.client popular               Popular packages
    python3 -m appstore.client recent                Recent updates
    python3 -m appstore.client repo list             List configured repos
    python3 -m appstore.client repo add <url>        Add remote repo
    python3 -m appstore.client repo remove <url>     Remove remote repo
    python3 -m appstore.client publish <manifest>    Publish package to registry
"""

import os
import sys
import json
import argparse
import urllib.request
import urllib.parse
import urllib.error
import time
import hashlib
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from appstore.config import COMMUNITY_REGISTRIES, BASE_DIR

VERSION = "1.0.0"
CONFIG_FILE = BASE_DIR / "appstore" / "data" / "client_config.json"
CACHE_DIR = BASE_DIR / "appstore" / "data" / "cache"


class AppStoreClient:
    """CLI client for the Myanos App Store"""

    def __init__(self, config_file=None):
        self.config_file = Path(config_file) if config_file else CONFIG_FILE
        self.config = self._load_config()
        self.cache = {}

    def _load_config(self) -> dict:
        """Load client configuration"""
        default_config = {
            "version": VERSION,
            "repos": COMMUNITY_REGISTRIES,
            "active_repo": 0,
            "auth_tokens": {},
            "last_sync": None,
            "favorites": [],
        }
        if self.config_file.exists():
            with open(self.config_file, 'r', encoding='utf-8') as f:
                saved = json.load(f)
                default_config.update(saved)
        return default_config

    def _save_config(self):
        """Save client configuration"""
        self.config_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_file, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, indent=2, ensure_ascii=False)

    def _get_active_repo(self) -> str:
        """Get active repository URL"""
        repos = self.config.get("repos", [])
        if not repos:
            print("[ERR] No repositories configured. Run 'repo add <url>' first.")
            sys.exit(1)
        idx = self.config.get("active_repo", 0)
        return repos[idx]

    def _api_request(self, endpoint: str, method: str = "GET", data: dict = None) -> dict:
        """Make API request to active repository"""
        repo_url = self._get_active_repo().rstrip("/")
        url = f"{repo_url}{endpoint}"

        headers = {
            "Content-Type": "application/json",
            "User-Agent": f"MyanosAppStore/{VERSION}",
        }

        # Add auth token if available
        token = self.config.get("auth_tokens", {}).get(self._get_active_repo(), "")
        if token:
            headers["X-API-Key"] = token

        body = None
        if data:
            body = json.dumps(data, ensure_ascii=False).encode()

        try:
            req = urllib.request.Request(url, data=body, headers=headers, method=method)
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            error_body = e.read().decode()
            try:
                return json.loads(error_body)
            except json.JSONDecodeError:
                return {"status": "error", "message": f"HTTP {e.code}: {e.reason}"}
        except urllib.error.URLError as e:
            return {"status": "error", "message": f"Connection failed: {e.reason}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def _format_size(self, size_bytes: int) -> str:
        """Format file size in human-readable format"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f}{unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f}TB"

    def _format_rating(self, rating: float) -> str:
        """Format rating with stars"""
        full = int(rating)
        half = 1 if rating - full >= 0.5 else 0
        empty = 5 - full - half
        return "\u2605" * full + ("\u00BD" if half else "") + "\u2606" * empty + f" {rating:.1f}"

    def _print_pkg_card(self, pkg: dict, index: int = None):
        """Print a formatted package card"""
        idx = f"{index}. " if index else ""
        name = pkg.get("name", "unknown")
        version = pkg.get("version", "?")
        author = pkg.get("author", "Unknown")
        desc = pkg.get("description", "")
        category = pkg.get("category", "")
        downloads = pkg.get("downloads", 0)
        rating = pkg.get("rating", 0)
        verified = pkg.get("verified", False)
        featured = pkg.get("featured", False)

        badge = ""
        if verified:
            badge += " [Verified]"
        if featured:
            badge += " [Featured]"

        print(f"  {idx}{name} v{version}{badge}")
        print(f"     {desc[:100]}{'...' if len(desc) > 100 else ''}")
        print(f"     Author: {author} | Category: {category}")
        print(f"     {self._format_rating(rating)} | Downloads: {downloads}")
        print()

    # ── Commands ──

    def search(self, query: str, category: str = None):
        """Search packages in registry"""
        print(f"\n  Searching for: '{query}'...\n")
        endpoint = f"/api/search?q={urllib.parse.quote(query)}"
        if category:
            endpoint += f"&category={urllib.parse.quote(category)}"

        result = self._api_request(endpoint)
        if result.get("status") == "success":
            pkgs = result.get("data", [])
            if not pkgs:
                print(f"  No packages found for '{query}'")
                return
            print(f"  Found {len(pkgs)} packages:\n")
            print("  " + "-" * 55)
            for i, pkg in enumerate(pkgs, 1):
                self._print_pkg_card(pkg, i)
        else:
            print(f"  [ERR] {result.get('message', 'Search failed')}")

    def list_packages(self, category: str = None, sort: str = "name", limit: int = 50):
        """List all packages"""
        endpoint = f"/api/packages?sort={sort}&per_page={limit}"
        if category:
            endpoint += f"&category={category}"

        result = self._api_request(endpoint)
        if result.get("status") == "success":
            pkgs = result.get("data", [])
            pagination = result.get("pagination", {})
            total = pagination.get("total", len(pkgs))

            print(f"\n  Available Packages ({total} total)")
            print("  " + "-" * 55)
            for i, pkg in enumerate(pkgs, 1):
                self._print_pkg_card(pkg, i)
            print("  " + "-" * 55)
            print(f"  Showing {len(pkgs)} of {total} packages")
        else:
            print(f"  [ERR] {result.get('message', 'Failed to list packages')}")

    def info(self, name: str):
        """Show detailed package information"""
        result = self._api_request(f"/api/packages/{urllib.parse.quote(name)}")
        if result.get("status") != "success":
            print(f"  [ERR] {result.get('message', 'Package not found')}")
            return

        pkg = result.get("data", {})
        print()
        print(f"  Name:        {pkg.get('name', '')}")
        print(f"  Version:     {pkg.get('version', '')}")
        print(f"  Author:      {pkg.get('author', '')}")
        print(f"  Description: {pkg.get('description', '')}")
        if pkg.get("description_my"):
            print(f"  (Myanmar):   {pkg.get('description_my', '')}")
        print(f"  Category:    {pkg.get('category', '')}")
        print(f"  License:     {pkg.get('license', 'Unknown')}")
        print(f"  Homepage:    {pkg.get('homepage', '')}")
        print(f"  Size:        {self._format_size(pkg.get('size', 0))}")
        print(f"  Downloads:   {pkg.get('downloads', 0)}")
        print(f"  Rating:      {self._format_rating(pkg.get('rating', 0))} ({pkg.get('rating_count', 0)} reviews)")
        print(f"  Verified:    {'Yes' if pkg.get('verified') else 'No'}")
        print(f"  Featured:    {'Yes' if pkg.get('featured') else 'No'}")
        if pkg.get("tags"):
            print(f"  Tags:        {', '.join(pkg['tags'])}")
        if pkg.get("dependencies"):
            print(f"  Depends:     {', '.join(pkg['dependencies'])}")
        print(f"  Created:     {pkg.get('created', '')}")
        print(f"  Updated:     {pkg.get('updated', '')}")
        print()

    def install(self, name: str):
        """Download and install a package"""
        # First get package info
        result = self._api_request(f"/api/packages/{urllib.parse.quote(name)}")
        if result.get("status") != "success":
            print(f"  [ERR] {result.get('message', 'Package not found')}")
            return False

        pkg = result.get("data", {})
        version = pkg.get("version", "unknown")
        filename = f"{name}-{version}.myan"

        print(f"\n  Installing {name} v{version}...")
        print(f"  Size: {self._format_size(pkg.get('size', 0))}")

        # Download
        repo_url = self._get_active_repo().rstrip("/")
        download_url = f"{repo_url}/api/packages/{urllib.parse.quote(name)}/download"
        cache_file = CACHE_DIR / filename
        cache_file.parent.mkdir(parents=True, exist_ok=True)

        print(f"  Downloading...", end="", flush=True)
        try:
            req = urllib.request.Request(download_url, headers={
                "User-Agent": f"MyanosAppStore/{VERSION}"
            })
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = resp.read()
            with open(cache_file, "wb") as f:
                f.write(data)
            print(f" OK ({self._format_size(len(data))})")
        except Exception as e:
            print(f" FAILED")
            print(f"  [ERR] Download failed: {e}")
            return False

        # Verify checksum if available
        expected_checksum = pkg.get("checksum", "")
        if expected_checksum:
            actual_checksum = hashlib.sha256(data).hexdigest()
            if actual_checksum != expected_checksum:
                print(f"  [ERR] Checksum mismatch!")
                print(f"  Expected: {expected_checksum}")
                print(f"  Got:      {actual_checksum}")
                cache_file.unlink(missing_ok=True)
                return False
            print(f"  Checksum verified: {actual_checksum[:16]}...")

        # Install using MyanPM
        pm_path = BASE_DIR / "myan_pm.py"
        if pm_path.exists():
            print(f"  Installing via MyanPM...")
            import subprocess
            try:
                result = subprocess.run(
                    [sys.executable, str(pm_path), "install", str(cache_file)],
                    capture_output=True, text=True, timeout=30
                )
                if result.returncode == 0:
                    print(f"  {result.stdout.strip()}")
                    print(f"\n  [OK] {name} v{version} installed successfully!")
                    return True
                else:
                    print(f"  [ERR] {result.stderr.strip()}")
                    return False
            except subprocess.TimeoutExpired:
                print(f"  [ERR] Installation timed out")
                return False
            except Exception as e:
                print(f"  [ERR] {e}")
                return False
        else:
            print(f"  [WARN] MyanPM not found at {pm_path}")
            print(f"  Package saved to: {cache_file}")
            return True

    def featured(self):
        """List featured packages"""
        result = self._api_request("/api/featured")
        if result.get("status") == "success":
            pkgs = result.get("data", [])
            print(f"\n  Featured Packages")
            print("  " + "-" * 55)
            for i, pkg in enumerate(pkgs, 1):
                self._print_pkg_card(pkg, i)
        else:
            print(f"  [ERR] {result.get('message', 'Failed')}")

    def popular(self, limit: int = 10):
        """List most popular packages"""
        result = self._api_request(f"/api/popular?limit={limit}")
        if result.get("status") == "success":
            pkgs = result.get("data", [])
            print(f"\n  Top {len(pkgs)} Popular Packages")
            print("  " + "-" * 55)
            for i, pkg in enumerate(pkgs, 1):
                self._print_pkg_card(pkg, i)
        else:
            print(f"  [ERR] {result.get('message', 'Failed')}")

    def recent(self, limit: int = 10):
        """List recently updated packages"""
        result = self._api_request(f"/api/recent?limit={limit}")
        if result.get("status") == "success":
            pkgs = result.get("data", [])
            print(f"\n  Recently Updated Packages")
            print("  " + "-" * 55)
            for i, pkg in enumerate(pkgs, 1):
                self._print_pkg_card(pkg, i)
        else:
            print(f"  [ERR] {result.get('message', 'Failed')}")

    def categories(self):
        """List all categories"""
        result = self._api_request("/api/categories")
        if result.get("status") == "success":
            cats = result.get("data", {})
            if not cats:
                print("  No categories found")
                return
            print(f"\n  App Store Categories")
            print("  " + "-" * 40)
            for cat_id, cat_info in cats.items():
                icon = cat_info.get("icon", "")
                name = cat_info.get("name", cat_id)
                name_my = cat_info.get("name_my", "")
                count = cat_info.get("package_count", 0)
                print(f"  {icon} {cat_id:<15} {name:<20} ({count} packages)")
            print("  " + "-" * 40)
        else:
            print(f"  [ERR] {result.get('message', 'Failed')}")

    def stats(self):
        """Show registry statistics"""
        result = self._api_request("/api/stats")
        if result.get("status") == "success":
            stats = result.get("data", {})
            print(f"\n  Registry Statistics")
            print("  " + "-" * 35)
            print(f"  Total Packages:  {stats.get('total_packages', 0)}")
            print(f"  Total Downloads: {stats.get('total_downloads', 0)}")
            print(f"  Developers:      {stats.get('total_developers', 0)}")
            print("  " + "-" * 35)
        else:
            print(f"  [ERR] {result.get('message', 'Failed')}")

    # ── Repository Management ──

    def repo_list(self):
        """List configured repositories"""
        repos = self.config.get("repos", [])
        active = self.config.get("active_repo", 0)

        print(f"\n  Configured Repositories")
        print("  " + "-" * 55)
        for i, repo in enumerate(repos):
            marker = " >" if i == active else "  "
            print(f"  {marker} [{i}] {repo}")
        print("  " + "-" * 55)
        if repos:
            print(f"  Active: {repos[active]}")
        else:
            print("  No repositories configured")

    def repo_add(self, url: str):
        """Add a repository"""
        repos = self.config.get("repos", [])
        if url in repos:
            print(f"  [WARN] Repository already exists: {url}")
            return

        # Validate by testing connection
        print(f"  Testing connection to {url}...", end="", flush=True)
        try:
            req = urllib.request.Request(
                f"{url.rstrip('/')}/api",
                headers={"User-Agent": f"MyanosAppStore/{VERSION}"}
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode())
            if data.get("status") == "success":
                print(f" OK")
                repos.append(url)
                self.config["repos"] = repos
                self._save_config()
                print(f"  [OK] Repository added: {url}")
            else:
                print(f" FAILED (invalid response)")
        except Exception as e:
            print(f" FAILED ({e})")
            print(f"  [ERR] Cannot connect to repository")

    def repo_remove(self, index_or_url: str):
        """Remove a repository"""
        repos = self.config.get("repos", [])
        active = self.config.get("active_repo", 0)

        # Try by index
        try:
            idx = int(index_or_url)
            if 0 <= idx < len(repos):
                removed = repos.pop(idx)
                if active >= len(repos):
                    self.config["active_repo"] = max(0, len(repos) - 1)
                self.config["repos"] = repos
                self._save_config()
                print(f"  [OK] Removed: {removed}")
                return
        except ValueError:
            pass

        # Try by URL
        if index_or_url in repos:
            repos.remove(index_or_url)
            self.config["repos"] = repos
            self._save_config()
            print(f"  [OK] Removed: {index_or_url}")
        else:
            print(f"  [ERR] Repository not found: {index_or_url}")

    def repo_switch(self, index: int):
        """Switch active repository"""
        repos = self.config.get("repos", [])
        if 0 <= index < len(repos):
            self.config["active_repo"] = index
            self._save_config()
            print(f"  [OK] Active repository: {repos[index]}")
        else:
            print(f"  [ERR] Invalid index. Range: 0-{len(repos)-1}")

    # ── Publish ──

    def publish(self, manifest_path: str):
        """Publish a package to the registry"""
        if not os.path.exists(manifest_path):
            print(f"  [ERR] Manifest file not found: {manifest_path}")
            return

        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)

        print(f"  Publishing {manifest.get('name', 'unknown')}...")
        result = self._api_request("/api/packages", method="POST", data=manifest)

        if result.get("status") == "success":
            print(f"  [OK] {result.get('message', 'Package published')}")
        else:
            print(f"  [ERR] {result.get('message', 'Publish failed')}")


def main():
    parser = argparse.ArgumentParser(
        prog="myanos appstore",
        description="Myanos App Store - Browse, search, and install packages",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  myanos appstore search tool       Search for 'tool'
  myanos appstore list              List all packages
  myanos appstore info myanmar-code Show package details
  myanos appstore install toolbox   Download & install
  myanos appstore featured          Show featured packages
  myanos appstore popular           Show popular packages
  myanos appstore categories        List categories
  myanos appstore repo list         List repositories
  myanos appstore repo add <url>    Add repository
  myanos appstore stats             Show statistics
        """
    )

    sub = parser.add_subparsers(dest="command", help="Command")

    # Search
    sub.add_parser("search", help="Search packages").add_argument("query", nargs="+")
    # List
    list_p = sub.add_parser("list", help="List all packages")
    list_p.add_argument("--category", "-c", help="Filter by category")
    list_p.add_argument("--sort", "-s", default="name", choices=["name", "downloads", "rating", "updated"])
    list_p.add_argument("--limit", "-l", type=int, default=50)
    # Info
    sub.add_parser("info", help="Package details").add_argument("name")
    # Install
    sub.add_parser("install", help="Install package").add_argument("name")
    # Featured
    sub.add_parser("featured", help="Featured packages")
    # Popular
    pop_p = sub.add_parser("popular", help="Popular packages")
    pop_p.add_argument("--limit", "-l", type=int, default=10)
    # Recent
    rec_p = sub.add_parser("recent", help="Recent updates")
    rec_p.add_argument("--limit", "-l", type=int, default=10)
    # Categories
    sub.add_parser("categories", help="List categories")
    # Stats
    sub.add_parser("stats", help="Registry statistics")

    # Repo management
    repo_p = sub.add_parser("repo", help="Repository management")
    repo_sub = repo_p.add_subparsers(dest="repo_command")
    repo_sub.add_parser("list", help="List repositories")
    repo_sub.add_parser("add", help="Add repository").add_argument("url")
    repo_sub.add_parser("remove", help="Remove repository").add_argument("url")
    repo_sub.add_parser("switch", help="Switch repository").add_argument("index", type=int)

    # Publish
    sub.add_parser("publish", help="Publish package").add_argument("manifest")

    args = parser.parse_args()
    client = AppStoreClient()

    if args.command == "search":
        client.search(" ".join(args.query))
    elif args.command == "list":
        client.list_packages(getattr(args, "category", None), args.sort, args.limit)
    elif args.command == "info":
        client.info(args.name)
    elif args.command == "install":
        client.install(args.name)
    elif args.command == "featured":
        client.featured()
    elif args.command == "popular":
        client.popular(args.limit)
    elif args.command == "recent":
        client.recent(args.limit)
    elif args.command == "categories":
        client.categories()
    elif args.command == "stats":
        client.stats()
    elif args.command == "repo":
        if args.repo_command == "list":
            client.repo_list()
        elif args.repo_command == "add":
            client.repo_add(args.url)
        elif args.repo_command == "remove":
            client.repo_remove(args.url)
        elif args.repo_command == "switch":
            client.repo_switch(args.index)
        else:
            repo_p.print_help()
    elif args.command == "publish":
        client.publish(args.manifest)
    else:
        parser.print_help()
        print("\n  Quick start:")
        print("    myanos appstore list        # List packages")
        print("    myanos appstore search tool  # Search")


if __name__ == "__main__":
    main()
