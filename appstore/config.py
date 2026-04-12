#!/usr/bin/env python3
"""
Myanos App Store - Configuration
Registry server settings, paths, and defaults
"""

import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "appstore" / "data"
REPO_DIR = DATA_DIR / "repo"
CACHE_DIR = DATA_DIR / "cache"
DB_FILE = DATA_DIR / "registry.json"
USERS_DB = DATA_DIR / "users.json"

# Server settings
DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 8080

# Remote registry URLs (community registries)
COMMUNITY_REGISTRIES = [
    "https://registry.myanos.dev/api",
    "https://myanos-community.github.io/registry/api",
]

# Package categories
CATEGORIES = {
    "system": {"name": "System", "icon": "⚙️", "name_my": "စနစ်"},
    "tools": {"name": "Tools", "icon": "🔧", "name_my": "ကိရိယာများ"},
    "language": {"name": "Languages", "icon": "💻", "name_my": "ဘာသာစကား"},
    "display": {"name": "Display", "icon": "🖥️", "name_my": "ပြက္ခဒိန်"},
    "emulation": {"name": "Emulation", "icon": "🎮", "name_my": "စက်တင်ခန်း"},
    "android": {"name": "Android", "icon": "🤖", "name_my": "အandiroid"},
    "network": {"name": "Network", "icon": "🌐", "name_my": "ကွန်ယက်"},
    "security": {"name": "Security", "icon": "🔒", "name_my": "တာကီရီ"},
    "media": {"name": "Media", "icon": "🎬", "name_my": "မီဒီယာ"},
    "games": {"name": "Games", "icon": "🎯", "name_my": "ဂိုးများ"},
    "education": {"name": "Education", "icon": "📚", "name_my": "ပညာရေး"},
    "development": {"name": "Development", "icon": "🛠️", "name_my": "ဖန်တီးမှု"},
}

# API rate limits
RATE_LIMIT_REQUESTS = 100
RATE_LIMIT_WINDOW = 3600  # 1 hour

# Max file upload size (50MB)
MAX_UPLOAD_SIZE = 50 * 1024 * 1024

# Ensure directories exist
def ensure_dirs():
    """Create required directories if they don't exist"""
    for d in [DATA_DIR, REPO_DIR, CACHE_DIR]:
        d.mkdir(parents=True, exist_ok=True)
