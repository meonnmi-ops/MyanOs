#!/usr/bin/env python3
"""
Myanos Package Registry v2.0.0
Enhanced local/remote package registry for Myanos Web OS

v2.0.0 Changes:
  - Extended package metadata (icon, screenshots, rating, tags, dependencies)
  - Remote registry sync support
  - Category-based browsing
  - Integration with App Store API
  - Myanmar language support for descriptions

Author: Meonnmi-ops (CTO, Myanos Project)
"""

import os
import sys
import json
import time
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path

REGISTRY_VERSION = "2.0.0"

# ── Built-in Package Database ──
# This serves as the offline-first local registry.
# For online packages, use: myanos appstore search <query>

PACKAGES = {
    "myanmar-code": {
        "name": "myanmar-code",
        "version": "2.0.1",
        "author": "Aung MoeOo (MWD)",
        "description": "Myanmar Programming Language with 127 keywords. Write code in Myanmar language.",
        "description_my": "မြန်မာဘာသာစကားဖြင့် ရေးသားနိုင်သော ပရိုဂရမ်းမင်းဘာသာစကား (127 keywords)",
        "category": "language",
        "license": "MIT",
        "homepage": "https://pypi.org/project/myanmar-code/",
        "size": 2200,
        "downloads": 342,
        "rating": 4.7,
        "rating_count": 28,
        "verified": True,
        "featured": True,
        "tags": ["myanmar", "programming", "language", "mmc"],
        "dependencies": [],
    },
    "myanos-terminal": {
        "name": "myanos-terminal",
        "version": "1.0.0",
        "author": "Meonnmi-ops",
        "description": "Linux-like interactive terminal with file management, shell commands, and web interface.",
        "description_my": "Linux ကိုယ်စားပြုလိုက် Web-based ကိရိယာ Terminal",
        "category": "system",
        "size": 8400,
        "downloads": 567,
        "rating": 4.5,
        "rating_count": 42,
        "verified": True,
        "featured": True,
        "tags": ["terminal", "shell", "cli", "web"],
        "dependencies": [],
    },
    "myanos-display-engine": {
        "name": "myanos-display-engine",
        "version": "1.0.0",
        "author": "Meonnmi-ops",
        "description": "noVNC-based display engine for streaming Android and PS2 displays to web browser.",
        "description_my": "noVNC ဖြင့် Android နှင့် PS2 Display ကို Web Browser မှာ ကြည့်နိုင်သော Engine",
        "category": "display",
        "size": 4800,
        "downloads": 234,
        "rating": 4.3,
        "rating_count": 19,
        "verified": True,
        "featured": False,
        "tags": ["display", "vnc", "novnc", "streaming"],
        "dependencies": [],
    },
    "myanos-ps2-layer": {
        "name": "myanos-ps2-layer",
        "version": "1.0.0",
        "author": "Meonnmi-ops",
        "description": "PlayStation 2 emulation layer with Play! and PCSX2 emulator integration.",
        "description_my": "PlayStation 2 ခန်းဖြင့် PS2 ဂိုးများ စက်တင်ခန်းအတွက် Emulation Layer",
        "category": "emulation",
        "size": 3100,
        "downloads": 189,
        "rating": 4.6,
        "rating_count": 15,
        "verified": True,
        "featured": True,
        "tags": ["ps2", "playstation", "emulation", "games"],
        "dependencies": ["myanos-display-engine"],
    },
    "myanos-android-layer": {
        "name": "myanos-android-layer",
        "version": "1.0.0",
        "author": "Meonnmi-ops",
        "description": "Android APK management via WayDroid/ADB with VNC streaming to browser.",
        "description_my": "WayDroid/ADB ဖြင့် Android APK များ စီမံပြီး VNC Streaming ဖြင့် Browser မှာ အသုံးပြုနိုင်",
        "category": "android",
        "size": 8900,
        "downloads": 423,
        "rating": 4.4,
        "rating_count": 31,
        "verified": True,
        "featured": True,
        "tags": ["android", "waydroid", "apk", "vnc"],
        "dependencies": ["myanos-display-engine"],
    },
    "myanos-toolbox": {
        "name": "myanos-toolbox",
        "version": "1.0.0",
        "author": "Meonnmi-ops",
        "description": "Professional toolbox with 20+ tools: storage, network, firmware, flash, security.",
        "description_my": "၂၀+ ကိရိယာများပါသော ပညာရေးရည်ရွယ်ချက် ကိရိယာအိမ်",
        "category": "tools",
        "size": 4100,
        "downloads": 356,
        "rating": 4.8,
        "rating_count": 37,
        "verified": True,
        "featured": True,
        "tags": ["tools", "utility", "network", "storage", "security"],
        "dependencies": [],
    },
    "myanai": {
        "name": "myanai",
        "version": "1.0.0",
        "author": "Meonnmi-ops",
        "description": "Low-Code AI Agent Builder. Create AI agents with visual workflow editor.",
        "description_my": "Low-Code AI Agent Builder. Code ရသော်မဟုတ်ဘဲ AI Agent များ ဖန်တီးနိုင်",
        "category": "development",
        "size": 28700,
        "downloads": 156,
        "rating": 4.2,
        "rating_count": 12,
        "verified": True,
        "featured": True,
        "tags": ["ai", "agent", "builder", "low-code", "automation"],
        "dependencies": [],
    },
    "myanos-settings": {
        "name": "myanos-settings",
        "version": "1.0.0",
        "author": "Meonnmi-ops",
        "description": "System settings manager with themes, wallpaper, sound, and user preferences.",
        "description_my": "Theme, Wallpaper, Sound စသည့် System Settings စီမံကိရိယာ",
        "category": "system",
        "size": 3200,
        "downloads": 445,
        "rating": 4.1,
        "rating_count": 22,
        "verified": True,
        "featured": False,
        "tags": ["settings", "preferences", "theme", "wallpaper"],
        "dependencies": [],
    },
}

CATEGORIES = {
    "system": "System / Core",
    "tools": "Utilities & Tools",
    "language": "Programming Languages",
    "display": "Display & Graphics",
    "emulation": "Game Emulation",
    "android": "Android Integration",
    "development": "Development Tools",
    "network": "Network & Internet",
    "security": "Security & Privacy",
    "media": "Media & Entertainment",
    "games": "Games",
    "education": "Education",
}


def list_available():
    """List all available packages in local registry"""
    print(f"\n  Available Packages (Registry v{REGISTRY_VERSION})")
    print("  " + "-" * 60)
    for name, pkg in PACKAGES.items():
        featured = " [Featured]" if pkg.get("featured") else ""
        verified = " [Verified]" if pkg.get("verified") else ""
        print(f"  {name:<30} v{pkg['version']:<10}{featured}{verified}")
        desc = pkg.get("description", "")
        print(f"    {desc[:65]}{'...' if len(desc) > 65 else ''}")
        print(f"    Downloads: {pkg.get('downloads', 0)} | Rating: {pkg.get('rating', 0)}/5")
    print("  " + "-" * 60)
    print(f"  Total: {len(PACKAGES)} packages")
    print(f"  Use 'myanos appstore search <query>' for online packages")


def list_by_category():
    """List packages grouped by category"""
    cats = {}
    for name, pkg in PACKAGES.items():
        cat = pkg.get("category", "other")
        if cat not in cats:
            cats[cat] = []
        cats[cat].append(pkg)

    print(f"\n  Packages by Category")
    print("  " + "=" * 55)
    for cat in sorted(cats.keys()):
        cat_name = CATEGORIES.get(cat, cat)
        print(f"\n  [{cat}] {cat_name}")
        for pkg in cats[cat]:
            print(f"    - {pkg['name']} v{pkg['version']} ({pkg.get('downloads', 0)} downloads)")
    print()


def get_package(name):
    """Get package info from registry"""
    return PACKAGES.get(name)


def search(query, category=None):
    """Search packages by query string"""
    query = query.lower()
    results = []
    for name, pkg in PACKAGES.items():
        if category and pkg.get("category") != category:
            continue
        if (query in name.lower()
            or query in pkg.get("description", "").lower()
            or query in " ".join(pkg.get("tags", [])).lower()
            or query in pkg.get("author", "").lower()):
            results.append(pkg)
    return results


def search_print(query, category=None):
    """Search and print results"""
    results = search(query, category)
    if not results:
        print(f"  No packages found for '{query}'")
        return
    print(f"\n  Search results for '{query}' ({len(results)} found):")
    print("  " + "-" * 55)
    for i, pkg in enumerate(results, 1):
        print(f"  {i}. {pkg['name']} v{pkg['version']}")
        print(f"     {pkg.get('description', '')[:70]}")
    print("  " + "-" * 55)


def get_featured():
    """Get featured packages"""
    return [p for p in PACKAGES.values() if p.get("featured")]


def get_by_category(category):
    """Get packages in a specific category"""
    return [p for p in PACKAGES.values() if p.get("category") == category]


def sync_remote(repo_url):
    """Sync local registry with remote App Store"""
    print(f"[INFO] Syncing with {repo_url}...")
    try:
        url = f"{repo_url.rstrip('/')}/packages?per_page=100"
        req = urllib.request.Request(url, headers={
            "User-Agent": f"MyanosRegistry/{REGISTRY_VERSION}"
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode())

        if result.get("status") == "success":
            remote_pkgs = result.get("data", [])
            new_count = 0
            for pkg in remote_pkgs:
                if pkg["name"] not in PACKAGES:
                    PACKAGES[pkg["name"]] = pkg
                    new_count += 1
            print(f"[OK] Synced. {new_count} new packages found. Total: {len(PACKAGES)}")
            return True
        else:
            print(f"[ERR] {result.get('message', 'Sync failed')}")
            return False
    except Exception as e:
        print(f"[ERR] Sync failed: {e}")
        return False


def get_stats():
    """Get registry statistics"""
    total_downloads = sum(p.get("downloads", 0) for p in PACKAGES.values())
    avg_rating = sum(p.get("rating", 0) for p in PACKAGES.values()) / max(len(PACKAGES), 1)
    categories = set(p.get("category", "") for p in PACKAGES.values())
    authors = set(p.get("author", "") for p in PACKAGES.values())

    return {
        "total_packages": len(PACKAGES),
        "total_downloads": total_downloads,
        "avg_rating": round(avg_rating, 1),
        "categories": len(categories),
        "developers": len(authors),
        "featured": len(get_featured()),
    }


def print_stats():
    """Print registry statistics"""
    stats = get_stats()
    print(f"\n  Registry Statistics")
    print("  " + "-" * 35)
    print(f"  Total Packages:  {stats['total_packages']}")
    print(f"  Total Downloads: {stats['total_downloads']}")
    print(f"  Avg Rating:      {stats['avg_rating']}/5")
    print(f"  Categories:      {stats['categories']}")
    print(f"  Developers:      {stats['developers']}")
    print(f"  Featured:        {stats['featured']}")
    print("  " + "-" * 35)


def export_json(filepath):
    """Export registry to JSON file"""
    os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else ".", exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(PACKAGES, f, indent=2, ensure_ascii=False)
    print(f"[OK] Registry exported to: {filepath}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Myanos Package Registry v2.0.0")
    sub = parser.add_subparsers(dest="command")
    sub.add_parser("list", help="List all packages")
    sub.add_parser("categories", help="List by category")
    sub.add_parser("stats", help="Show statistics")
    sub.add_parser("featured", help="Featured packages")
    search_p = sub.add_parser("search", help="Search packages")
    search_p.add_argument("query")
    search_p.add_argument("--category", "-c", help="Filter by category")
    info_p = sub.add_parser("info", help="Package info")
    info_p.add_argument("name")
    export_p = sub.add_parser("export", help="Export to JSON")
    export_p.add_argument("filepath")
    sync_p = sub.add_parser("sync", help="Sync with remote")
    sync_p.add_argument("url", nargs="?", help="Remote registry URL")

    args = parser.parse_args()

    if args.command == "list":
        list_available()
    elif args.command == "categories":
        list_by_category()
    elif args.command == "stats":
        print_stats()
    elif args.command == "featured":
        featured = get_featured()
        for pkg in featured:
            print(f"  * {pkg['name']} v{pkg['version']} - {pkg.get('description', '')}")
    elif args.command == "search":
        search_print(args.query, getattr(args, "category", None))
    elif args.command == "info":
        pkg = get_package(args.name)
        if pkg:
            print(json.dumps(pkg, indent=2, ensure_ascii=False))
        else:
            print(f"[ERR] Package not found: {args.name}")
    elif args.command == "export":
        export_json(args.filepath)
    elif args.command == "sync":
        url = args.url or "http://localhost:8080/api"
        sync_remote(url)
    else:
        list_available()
