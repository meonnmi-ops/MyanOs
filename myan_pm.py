#!/usr/bin/env python3
"""
MyanPM - Myanos Package Manager v1.0.0
Custom .myan package format for Myanos Web OS
Author: Meonnmi-ops (CTO, Myanos Project)
"""

import os, sys, json, hashlib, zipfile, shutil, time, argparse
from pathlib import Path

VERSION = "1.0.0"
DB_FILE = os.path.join(os.path.dirname(__file__), ".myan_db.json")
INSTALL_DIR = os.path.join(os.path.dirname(__file__), "installed")

class MyanPM:
    def __init__(self):
        self.db = self._load_db()
        os.makedirs(INSTALL_DIR, exist_ok=True)
        os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)

    def _load_db(self):
        if os.path.exists(DB_FILE):
            with open(DB_FILE, 'r') as f:
                return json.load(f)
        return {"packages": {}, "version": VERSION}

    def _save_db(self):
        with open(DB_FILE, 'w') as f:
            json.dump(self.db, f, indent=2, ensure_ascii=False)

    def _hash_file(self, filepath):
        sha256 = hashlib.sha256()
        with open(filepath, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                sha256.update(chunk)
        return sha256.hexdigest()

    def build(self, name, version, author, desc, src_dir, output_dir):
        """Build a .myan package from source directory"""
        pkg_name = f"{name}-{version}"
        pkg_file = os.path.join(output_dir, f"{pkg_name}.myan")
        manifest = {
            "name": name,
            "version": version,
            "author": author,
            "description": desc,
            "created": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "myan_format": "1.0",
            "min_myanos": "1.0.0"
        }
        data_dir = os.path.join(output_dir, "_build_data")
        if os.path.exists(data_dir):
            shutil.rmtree(data_dir)
        shutil.copytree(src_dir, data_dir)
        checksum_file = os.path.join(output_dir, "_build_checksum.sha256")
        hashes = {}
        for root, dirs, files in os.walk(data_dir):
            for fname in files:
                fpath = os.path.join(root, fname)
                rel = os.path.relpath(fpath, data_dir)
                hashes[rel] = self._hash_file(fpath)
        with open(checksum_file, 'w') as f:
            for path, h in hashes.items():
                f.write(f"{h}  {path}\n")
        manifest["files"] = list(hashes.keys())
        manifest["file_count"] = len(hashes)
        os.makedirs(output_dir, exist_ok=True)
        with zipfile.ZipFile(pkg_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("MANIFEST.json", json.dumps(manifest, indent=2, ensure_ascii=False))
            zf.writestr("CHECKSUM.sha256", open(checksum_file).read())
            for root, dirs, files in os.walk(data_dir):
                for fname in files:
                    fpath = os.path.join(root, fname)
                    arcname = os.path.join("data", os.path.relpath(fpath, data_dir))
                    zf.write(fpath, arcname)
        shutil.rmtree(data_dir)
        if os.path.exists(checksum_file):
            os.remove(checksum_file)
        print(f"[OK] Package built: {pkg_file} ({os.path.getsize(pkg_file)} bytes)")
        return pkg_file

    def install(self, pkg_path):
        """Install a .myan package"""
        if not os.path.exists(pkg_path):
            print(f"[ERR] Package not found: {pkg_path}")
            return False
        with zipfile.ZipFile(pkg_path, 'r') as zf:
            manifest = json.loads(zf.read("MANIFEST.json"))
        pkg_name = manifest["name"]
        pkg_version = manifest["version"]
        if pkg_name in self.db["packages"]:
            print(f"[WARN] {pkg_name} already installed (v{self.db['packages'][pkg_name]['version']})")
            print(f"       Use 'remove' first, then reinstall")
            return False
        pkg_install_dir = os.path.join(INSTALL_DIR, pkg_name)
        os.makedirs(pkg_install_dir, exist_ok=True)
        with zipfile.ZipFile(pkg_path, 'r') as zf:
            for item in zf.namelist():
                if item.startswith("data/"):
                    zf.extract(item, pkg_install_dir)
        self.db["packages"][pkg_name] = {
            "version": pkg_version,
            "author": manifest.get("author", "Unknown"),
            "description": manifest.get("description", ""),
            "installed": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "files": manifest.get("files", []),
            "format": manifest.get("myan_format", "1.0")
        }
        self._save_db()
        print(f"[OK] Installed: {pkg_name} v{pkg_version}")
        print(f"     Author: {manifest.get('author', 'Unknown')}")
        print(f"     Desc: {manifest.get('description', '')}")
        return True

    def remove(self, pkg_name):
        """Remove an installed package"""
        if pkg_name not in self.db["packages"]:
            print(f"[ERR] Package not installed: {pkg_name}")
            return False
        pkg_dir = os.path.join(INSTALL_DIR, pkg_name)
        if os.path.exists(pkg_dir):
            shutil.rmtree(pkg_dir)
        version = self.db["packages"][pkg_name]["version"]
        del self.db["packages"][pkg_name]
        self._save_db()
        print(f"[OK] Removed: {pkg_name} v{version}")
        return True

    def list(self):
        """List installed packages"""
        if not self.db["packages"]:
            print("[INFO] No packages installed")
            return
        print("[Installed Packages]")
        print("-" * 55)
        for name, info in self.db["packages"].items():
            print(f"  {name:<25} v{info['version']:<10} ({info.get('author', 'Unknown')})")
            if info.get('description'):
                print(f"  └─ {info['description']}")
        print("-" * 55)
        print(f"Total: {len(self.db['packages'])} packages")

    def search(self, query):
        """Search installed packages"""
        found = False
        for name, info in self.db["packages"].items():
            if query.lower() in name.lower() or query.lower() in info.get('description', '').lower():
                print(f"  {name} v{info['version']} - {info.get('description', '')}")
                found = True
        if not found:
            print(f"[INFO] No packages matching '{query}'")

    def info(self, pkg_name):
        """Show package details"""
        if pkg_name not in self.db["packages"]:
            print(f"[ERR] Package not found: {pkg_name}")
            return
        info = self.db["packages"][pkg_name]
        print(f"Package: {pkg_name}")
        print(f"Version: {info['version']}")
        print(f"Author:  {info.get('author', 'Unknown')}")
        print(f"Desc:    {info.get('description', '')}")
        print(f"Installed: {info.get('installed', 'Unknown')}")
        print(f"Files:   {len(info.get('files', []))}")

def main():
    parser = argparse.ArgumentParser(description="MyanPM - Myanos Package Manager")
    sub = parser.add_subparsers(dest="command")
    install_p = sub.add_parser("install", help="Install .myan package")
    install_p.add_argument("path", help="Path to .myan file")
    sub.add_parser("list", help="List installed packages")
    sub.add_parser("search", help="Search packages").add_argument("query")
    sub.add_parser("info", help="Package info").add_argument("name")
    sub.add_parser("remove", help="Remove package").add_argument("name")
    build_p = sub.add_parser("build", help="Build .myan package")
    build_p.add_argument("--name", required=True)
    build_p.add_argument("--version", default="1.0.0")
    build_p.add_argument("--author", default="Unknown")
    build_p.add_argument("--desc", default="")
    build_p.add_argument("--src", default="./src")
    build_p.add_argument("--out", default="./dist")
    args = parser.parse_args()
    pm = MyanPM()
    if args.command == "install":
        pm.install(args.path)
    elif args.command == "list":
        pm.list()
    elif args.command == "search":
        pm.search(args.query)
    elif args.command == "info":
        pm.info(args.name)
    elif args.command == "remove":
        pm.remove(args.name)
    elif args.command == "build":
        pm.build(args.name, args.version, args.author, args.desc, args.src, args.out)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
