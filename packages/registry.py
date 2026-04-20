#!/usr/bin/env python3
"""
Myanos Package Registry v1.0.0
Online package registry for Myanos Web OS
"""

import os, sys, json, time

REGISTRY_VERSION = "1.0.0"

# Built-in package registry (offline-first)
PACKAGES = {
    "myanmar-code": {
        "name": "myanmar-code",
        "version": "2.0.1",
        "author": "Aung MoeOo (MWD)",
        "description": "မြန်မာဘာသာစကားဖြင့် ရေးသားနိုင်သော ပရိုဂရမ်းမင်းဘာသာစကား (Myanmar Programming Language with 127 keywords)",
        "category": "language",
        "license": "MIT",
        "homepage": "https://pypi.org/project/myanmar-code/",
        "size": "2.2KB",
        "installed": False
    },
    "myanos-terminal": {
        "name": "myanos-terminal",
        "version": "1.0.0",
        "author": "Meonnmi-ops",
        "description": "Myanos Linux-like interactive terminal with file management and shell commands",
        "category": "system",
        "size": "8.4KB",
        "installed": False
    },
    # NOTE: display-engine, ps2-layer, android-layer removed (cloud hosting compatibility)
    "myanos-toolbox": {
        "name": "myanos-toolbox",
        "version": "1.0.0",
        "author": "Meonnmi-ops",
        "description": "Professional toolbox with storage, network, firmware, flash and security tools",
        "category": "tools",
        "size": "4.1KB",
        "installed": False
    }
}

def list_available():
    """List all available packages in registry"""
    print(f"\n📦 Myanos Package Registry v{REGISTRY_VERSION}")
    print("═" * 55)
    for name, info in PACKAGES.items():
        status = "✅" if info.get("installed") else "⬜"
        print(f"  {status} {name:<25} v{info['version']:<8} [{info['category']}]")
        print(f"     {info['description']}")
        print(f"     Author: {info['author']} | Size: {info['size']}")
        print()
    print("═" * 55)
    print(f"Total: {len(PACKAGES)} packages")

def get_package(name):
    """Get package info from registry"""
    return PACKAGES.get(name)

def search(query):
    """Search packages"""
    results = []
    for name, info in PACKAGES.items():
        if query.lower() in name.lower() or query.lower() in info.get("description", "").lower():
            results.append(info)
    return results

if __name__ == "__main__":
    list_available()
