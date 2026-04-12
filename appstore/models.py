#!/usr/bin/env python3
"""
Myanos App Store - Data Models
Enhanced package metadata, user models, and API schemas
"""

import json
import time
import os
from typing import Optional, Dict, List, Any

# ──────────────────────────────────────────────
# Package Model
# ──────────────────────────────────────────────

class Package:
    """
    Enhanced .myan package model for the App Store.
    Extends the base MANIFEST.json with store-specific fields.
    """

    REQUIRED_FIELDS = ["name", "version", "author", "description"]
    OPTIONAL_FIELDS = [
        "category", "icon", "screenshots", "homepage", "license",
        "tags", "dependencies", "min_myanos", "myan_format",
        "download_url", "checksum", "size", "downloads",
        "rating", "rating_count", "created", "updated"
    ]

    def __init__(self, data: dict):
        for field in self.REQUIRED_FIELDS:
            if field not in data:
                raise ValueError(f"Missing required field: {field}")
        self.data = data
        # Defaults
        self.data.setdefault("category", "tools")
        self.data.setdefault("icon", "")
        self.data.setdefault("screenshots", [])
        self.data.setdefault("tags", [])
        self.data.setdefault("dependencies", [])
        self.data.setdefault("min_myanos", "1.0.0")
        self.data.setdefault("myan_format", "1.0")
        self.data.setdefault("downloads", 0)
        self.data.setdefault("rating", 0.0)
        self.data.setdefault("rating_count", 0)
        self.data.setdefault("created", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
        self.data.setdefault("updated", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
        self.data.setdefault("homepage", "")
        self.data.setdefault("license", "MIT")
        self.data.setdefault("size", 0)
        self.data.setdefault("download_url", "")
        self.data.setdefault("checksum", "")
        self.data.setdefault("verified", False)
        self.data.setdefault("featured", False)

    @property
    def name(self) -> str:
        return self.data["name"]

    @property
    def version(self) -> str:
        return self.data["version"]

    @property
    def author(self) -> str:
        return self.data["author"]

    @property
    def description(self) -> str:
        return self.data["description"]

    @property
    def category(self) -> str:
        return self.data["category"]

    @property
    def downloads(self) -> int:
        return self.data["downloads"]

    @property
    def rating(self) -> float:
        return self.data["rating"]

    def to_dict(self) -> dict:
        return dict(self.data)

    def to_summary(self) -> dict:
        """Lightweight summary for listing"""
        return {
            "name": self.name,
            "version": self.version,
            "author": self.author,
            "description": self.description[:120],
            "category": self.category,
            "icon": self.data.get("icon", ""),
            "downloads": self.downloads,
            "rating": self.rating,
            "rating_count": self.data.get("rating_count", 0),
            "size": self.data.get("size", 0),
            "verified": self.data.get("verified", False),
            "featured": self.data.get("featured", False),
        }

    def validate(self) -> bool:
        """Validate package metadata"""
        if not self.name or not self.version:
            return False
        # Name: lowercase, alphanumeric, hyphens only
        import re
        if not re.match(r'^[a-z0-9][a-z0-9\-]{1,48}[a-z0-9]$', self.name):
            return False
        # Version: semver-like
        if not re.match(r'^\d+\.\d+\.\d+', self.version):
            return False
        return True


# ──────────────────────────────────────────────
# Review / Rating Model
# ──────────────────────────────────────────────

class Review:
    """User review for a package"""

    def __init__(self, username: str, package: str, rating: int, comment: str = ""):
        self.data = {
            "id": self._gen_id(username, package),
            "username": username,
            "package": package,
            "rating": min(5, max(1, rating)),
            "comment": comment,
            "created": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "helpful": 0,
        }

    @staticmethod
    def _gen_id(username, package):
        import hashlib
        return hashlib.sha256(f"{username}:{package}:{time.time()}".encode()).hexdigest()[:16]

    def to_dict(self):
        return dict(self.data)


# ──────────────────────────────────────────────
# User Model
# ──────────────────────────────────────────────

class User:
    """App Store user (developer / end-user)"""

    def __init__(self, username: str, email: str, role: str = "user"):
        self.data = {
            "username": username,
            "email": email,
            "role": role,  # "user", "developer", "admin"
            "created": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "packages": [],
            "token": self._gen_token(username),
        }

    @staticmethod
    def _gen_token(username):
        import hashlib
        return hashlib.sha256(f"{username}:{time.time()}".encode()).hexdigest()[:32]

    def to_dict(self):
        d = dict(self.data)
        d.pop("token", None)  # Never expose token in listing
        return d


# ──────────────────────────────────────────────
# API Response Models
# ──────────────────────────────────────────────

class APIResponse:
    """Standardized API response"""

    @staticmethod
    def success(data=None, message="OK", status=200):
        return {
            "status": "success",
            "code": status,
            "message": message,
            "data": data,
        }

    @staticmethod
    def error(message, status=400, details=None):
        resp = {
            "status": "error",
            "code": status,
            "message": message,
        }
        if details:
            resp["details"] = details
        return resp

    @staticmethod
    def paginated(items, page, per_page, total):
        return {
            "status": "success",
            "code": 200,
            "data": items,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page,
            }
        }


# ──────────────────────────────────────────────
# Repository Index Model
# ──────────────────────────────────────────────

class RepoIndex:
    """
    Repository index file (registry.json)
    Contains all package metadata + server configuration.
    """

    def __init__(self):
        self.data = {
            "version": "1.0.0",
            "name": "Myanos Official Registry",
            "description": "Official package registry for Myanos Web OS",
            "url": "",
            "maintainer": "Meonnmi-ops",
            "created": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "updated": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "packages": {},
            "categories": {},
            "stats": {
                "total_packages": 0,
                "total_downloads": 0,
                "total_developers": 0,
            }
        }

    def add_package(self, pkg: Package):
        self.data["packages"][pkg.name] = pkg.to_dict()
        cat = pkg.category
        if cat not in self.data["categories"]:
            self.data["categories"][cat] = []
        if pkg.name not in self.data["categories"][cat]:
            self.data["categories"][cat].append(pkg.name)
        self._update_stats()

    def remove_package(self, name: str):
        if name in self.data["packages"]:
            pkg = self.data["packages"][name]
            cat = pkg.get("category", "tools")
            if cat in self.data["categories"] and name in self.data["categories"][cat]:
                self.data["categories"][cat].remove(name)
            del self.data["packages"][name]
            self._update_stats()

    def get_package(self, name: str) -> Optional[dict]:
        return self.data["packages"].get(name)

    def search(self, query: str, category: str = None) -> List[dict]:
        results = []
        query = query.lower()
        for name, pkg in self.data["packages"].items():
            if category and pkg.get("category") != category:
                continue
            if (query in name.lower()
                or query in pkg.get("description", "").lower()
                or query in pkg.get("author", "").lower()
                or query in " ".join(pkg.get("tags", [])).lower()):
                results.append(pkg)
        return results

    def get_featured(self) -> List[dict]:
        return [p for p in self.data["packages"].values() if p.get("featured")]

    def get_by_category(self, category: str) -> List[dict]:
        return [
            self.data["packages"][n]
            for n in self.data["categories"].get(category, [])
            if n in self.data["packages"]
        ]

    def get_recent(self, limit: int = 10) -> List[dict]:
        pkgs = sorted(
            self.data["packages"].values(),
            key=lambda p: p.get("updated", ""),
            reverse=True
        )
        return pkgs[:limit]

    def get_popular(self, limit: int = 10) -> List[dict]:
        pkgs = sorted(
            self.data["packages"].values(),
            key=lambda p: p.get("downloads", 0),
            reverse=True
        )
        return pkgs[:limit]

    def increment_download(self, name: str):
        if name in self.data["packages"]:
            self.data["packages"][name]["downloads"] = \
                self.data["packages"][name].get("downloads", 0) + 1
            self._update_stats()

    def _update_stats(self):
        self.data["stats"]["total_packages"] = len(self.data["packages"])
        self.data["stats"]["total_downloads"] = sum(
            p.get("downloads", 0) for p in self.data["packages"].values()
        )
        devs = set()
        for p in self.data["packages"].values():
            devs.add(p.get("author", ""))
        self.data["stats"]["total_developers"] = len(devs)
        self.data["updated"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")

    def load(self, filepath: str):
        """Load index from JSON file"""
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                self.data = json.load(f)

    def save(self, filepath: str):
        """Save index to JSON file"""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)

    def to_dict(self) -> dict:
        return dict(self.data)
