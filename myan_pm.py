#!/usr/bin/env python3
"""
MyanPM - Myanos Package Manager v2.0.0
Custom .myan package format for Myanos Web OS

v2.0.0 Changes:
  - Remote repository support (install-remote, search-remote, update)
  - Repository management (repo-add, repo-list, repo-remove)
  - Auto-update check
  - Dependency resolution hints
  - Integration with App Store API

Author: Meonnmi-ops (CTO, Myanos Project)
"""

import os, sys, json, hashlib, zipfile, shutil, time, argparse, urllib.request, urllib.parse, urllib.error
from pathlib import Path

VERSION = "2.0.0"
BASE_DIR = Path(__file__).parent
DB_FILE = BASE_DIR / ".myan_db.json"
INSTALL_DIR = BASE_DIR / "installed"
REPO_CONFIG = BASE_DIR / ".myan_repos.json"
CACHE_DIR = BASE_DIR / ".myan_cache"

# Default remote registries
DEFAULT_REPOS = [
    "http://localhost:8080/api",
]

class MyanPM:
    def __init__(self):
        self.db = self._load_db()
        self.repos = self._load_repos()
        INSTALL_DIR.mkdir(exist_ok=True)
        CACHE_DIR.mkdir(exist_ok=True)
        DB_FILE.parent.mkdir(exist_ok=True)

    # ── Database ──

    def _load_db(self):
        if DB_FILE.exists():
            with open(DB_FILE, 'r') as f:
                return json.load(f)
        return {"packages": {}, "version": VERSION, "installed_at": {}}

    def _save_db(self):
        with open(DB_FILE, 'w') as f:
            json.dump(self.db, f, indent=2, ensure_ascii=False)

    def _load_repos(self):
        if REPO_CONFIG.exists():
            with open(REPO_CONFIG, 'r') as f:
                return json.load(f)
        return {"active": 0, "repos": DEFAULT_REPOS}

    def _save_repos(self):
        with open(REPO_CONFIG, 'w') as f:
            json.dump(self.repos, f, indent=2, ensure_ascii=False)

    def _get_active_repo(self) -> str:
        repos = self.repos.get("repos", [])
        if not repos:
            return None
        return repos[self.repos.get("active", 0)]

    def _hash_file(self, filepath):
        sha256 = hashlib.sha256()
        with open(filepath, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                sha256.update(chunk)
        return sha256.hexdigest()

    # ── Build ──

    def build(self, name, version, author, desc, src_dir, output_dir,
              category="tools", homepage="", license="MIT", icon="",
              tags=None, dependencies=None):
        """Build a .myan package from source directory"""
        pkg_name = f"{name}-{version}"
        pkg_file = os.path.join(output_dir, f"{pkg_name}.myan")

        if tags is None:
            tags = []
        if dependencies is None:
            dependencies = []

        manifest = {
            "name": name,
            "version": version,
            "author": author,
            "description": desc,
            "category": category,
            "homepage": homepage,
            "license": license,
            "icon": icon,
            "tags": tags,
            "dependencies": dependencies,
            "created": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "myan_format": "1.0",
            "min_myanos": "2.0.0",
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
        manifest["size"] = 0  # Will be set after zip creation

        os.makedirs(output_dir, exist_ok=True)

        with zipfile.ZipFile(pkg_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("MANIFEST.json", json.dumps(manifest, indent=2, ensure_ascii=False))
            zf.writestr("CHECKSUM.sha256", open(checksum_file).read())
            for root, dirs, files in os.walk(data_dir):
                for fname in files:
                    fpath = os.path.join(root, fname)
                    arcname = os.path.join("data", os.path.relpath(fpath, data_dir))
                    zf.write(fpath, arcname)

        # Cleanup
        shutil.rmtree(data_dir)
        if os.path.exists(checksum_file):
            os.remove(checksum_file)

        # Update size
        manifest["size"] = os.path.getsize(pkg_file)
        manifest["checksum"] = self._hash_file(pkg_file)

        # Rebuild zip with correct size/checksum
        with zipfile.ZipFile(pkg_file, 'r') as zf:
            data_content = {}
            for item in zf.namelist():
                data_content[item] = zf.read(item)

        # Update MANIFEST in the zip
        data_content["MANIFEST.json"] = json.dumps(manifest, indent=2, ensure_ascii=False).encode()

        with zipfile.ZipFile(pkg_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            for arcname, content in data_content.items():
                zf.writestr(arcname, content)

        print(f"[OK] Package built: {pkg_file}")
        print(f"     Size: {manifest['size']} bytes")
        print(f"     Checksum: {manifest['checksum']}")
        print(f"     Files: {manifest['file_count']}")

        return pkg_file

    # ── Install (Local) ──

    def install(self, pkg_path):
        """Install a .myan package from local file"""
        if not os.path.exists(pkg_path):
            print(f"[ERR] Package not found: {pkg_path}")
            return False

        with zipfile.ZipFile(pkg_path, 'r') as zf:
            manifest = json.loads(zf.read("MANIFEST.json"))

        pkg_name = manifest["name"]
        pkg_version = manifest["version"]

        if pkg_name in self.db["packages"]:
            current = self.db["packages"][pkg_name]["version"]
            print(f"[WARN] {pkg_name} v{current} already installed")
            print(f"       Use 'remove' first, or 'update' to upgrade")
            return False

        # Extract
        pkg_install_dir = INSTALL_DIR / pkg_name
        if pkg_install_dir.exists():
            shutil.rmtree(pkg_install_dir)
        pkg_install_dir.mkdir(parents=True)

        with zipfile.ZipFile(pkg_path, 'r') as zf:
            for item in zf.namelist():
                if item.startswith("data/"):
                    zf.extract(item, pkg_install_dir)

        self.db["packages"][pkg_name] = {
            "version": pkg_version,
            "author": manifest.get("author", "Unknown"),
            "description": manifest.get("description", ""),
            "category": manifest.get("category", "tools"),
            "installed": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source": "local",
            "files": manifest.get("files", []),
            "format": manifest.get("myan_format", "1.0"),
            "size": manifest.get("size", 0),
        }
        self._save_db()
        print(f"[OK] Installed: {pkg_name} v{pkg_version}")
        print(f"     Author: {manifest.get('author', 'Unknown')}")
        print(f"     Desc: {manifest.get('description', '')}")
        return True

    # ── Install (Remote) ──

    def install_remote(self, pkg_name):
        """Install a package from remote registry"""
        repo_url = self._get_active_repo()
        if not repo_url:
            print("[ERR] No remote repository configured")
            print("       Use 'repo-add <url>' to add one")
            return False

        # Check if already installed
        if pkg_name in self.db["packages"]:
            current = self.db["packages"][pkg_name]["version"]
            print(f"[WARN] {pkg_name} v{current} already installed")
            print(f"       Use 'remove' first, then reinstall")
            return False

        print(f"[INFO] Installing {pkg_name} from {repo_url}...")

        # Get package info
        try:
            url = f"{repo_url.rstrip('/')}/packages/{urllib.parse.quote(pkg_name)}"
            req = urllib.request.Request(url, headers={
                "User-Agent": f"MyanPM/{VERSION}"
            })
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            print(f"[ERR] Package '{pkg_name}' not found (HTTP {e.code})")
            return False
        except Exception as e:
            print(f"[ERR] Cannot connect to registry: {e}")
            return False

        if result.get("status") != "success":
            print(f"[ERR] {result.get('message', 'Package not found')}")
            return False

        pkg_data = result.get("data", {})
        version = pkg_data.get("version", "unknown")

        # Download .myan file
        download_url = f"{repo_url.rstrip('/')}/packages/{urllib.parse.quote(pkg_name)}/download"
        cache_file = CACHE_DIR / f"{pkg_name}-{version}.myan"

        print(f"[INFO] Downloading {pkg_name} v{version}...", end="", flush=True)
        try:
            req = urllib.request.Request(download_url, headers={
                "User-Agent": f"MyanPM/{VERSION}"
            })
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = resp.read()
            with open(cache_file, "wb") as f:
                f.write(data)
            print(f" OK ({len(data)} bytes)")
        except Exception as e:
            print(f" FAILED ({e})")
            return False

        # Verify checksum
        expected = pkg_data.get("checksum", "")
        if expected:
            actual = hashlib.sha256(data).hexdigest()
            if actual != expected:
                print(f"[ERR] Checksum mismatch!")
                cache_file.unlink(missing_ok=True)
                return False
            print(f"[OK] Checksum verified")

        # Install the cached file
        return self.install(str(cache_file))

    # ── Remove ──

    def remove(self, pkg_name):
        """Remove an installed package"""
        if pkg_name not in self.db["packages"]:
            print(f"[ERR] Package not installed: {pkg_name}")
            return False
        pkg_dir = INSTALL_DIR / pkg_name
        if pkg_dir.exists():
            shutil.rmtree(pkg_dir)
        version = self.db["packages"][pkg_name]["version"]
        del self.db["packages"][pkg_name]
        self._save_db()
        print(f"[OK] Removed: {pkg_name} v{version}")
        return True

    # ── List ──

    def list(self):
        """List installed packages"""
        if not self.db["packages"]:
            print("[INFO] No packages installed")
            return
        print("[Installed Packages]")
        print("-" * 60)
        for name, info in self.db["packages"].items():
            source = info.get("source", "local")
            src_mark = "[R]" if source == "remote" else "[L]"
            print(f"  {src_mark} {name:<25} v{info['version']:<10} ({info.get('author', 'Unknown')})")
            if info.get('description'):
                desc = info['description'][:50] + "..." if len(info['description']) > 50 else info['description']
                print(f"     {desc}")
        print("-" * 60)
        print(f"Total: {len(self.db['packages'])} packages")
        print("[L] = Local  [R] = Remote")

    # ── Search (Local) ──

    def search(self, query):
        """Search installed packages"""
        found = False
        for name, info in self.db["packages"].items():
            if query.lower() in name.lower() or query.lower() in info.get('description', '').lower():
                print(f"  {name} v{info['version']} - {info.get('description', '')}")
                found = True
        if not found:
            print(f"[INFO] No packages matching '{query}'")

    # ── Search (Remote) ──

    def search_remote(self, query, category=None):
        """Search remote registry"""
        repo_url = self._get_active_repo()
        if not repo_url:
            print("[ERR] No remote repository configured")
            return

        print(f"[INFO] Searching remote registry for '{query}'...")
        endpoint = f"{repo_url.rstrip('/')}/search?q={urllib.parse.quote(query)}"
        if category:
            endpoint += f"&category={urllib.parse.quote(category)}"

        try:
            req = urllib.request.Request(endpoint, headers={
                "User-Agent": f"MyanPM/{VERSION}"
            })
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read().decode())
        except Exception as e:
            print(f"[ERR] Cannot connect to registry: {e}")
            return

        if result.get("status") == "success":
            pkgs = result.get("data", [])
            if not pkgs:
                print(f"[INFO] No packages found for '{query}'")
                return
            print(f"[Found] {len(pkgs)} packages:")
            print("-" * 55)
            for i, pkg in enumerate(pkgs, 1):
                installed = "[installed]" if pkg.get("name") in self.db["packages"] else ""
                print(f"  {i}. {pkg.get('name')} v{pkg.get('version')} {installed}")
                desc = pkg.get("description", "")
                print(f"     {desc[:70]}{'...' if len(desc) > 70 else ''}")
                print(f"     Downloads: {pkg.get('downloads', 0)} | Rating: {pkg.get('rating', 0)}/5")
            print("-" * 55)
        else:
            print(f"[ERR] {result.get('message', 'Search failed')}")

    # ── Info ──

    def info(self, pkg_name):
        """Show package details"""
        if pkg_name not in self.db["packages"]:
            print(f"[ERR] Package not installed: {pkg_name}")
            return
        info = self.db["packages"][pkg_name]
        print(f"Package: {pkg_name}")
        print(f"Version: {info['version']}")
        print(f"Author:  {info.get('author', 'Unknown')}")
        print(f"Desc:    {info.get('description', '')}")
        print(f"Source:  {info.get('source', 'local')}")
        print(f"Size:    {info.get('size', 'Unknown')} bytes")
        print(f"Files:   {len(info.get('files', []))}")
        print(f"Installed: {info.get('installed', 'Unknown')}")

    # ── Update ──

    def update(self, pkg_name=None):
        """Check for package updates from remote registry"""
        repo_url = self._get_active_repo()
        if not repo_url:
            print("[ERR] No remote repository configured")
            return

        targets = {pkg_name: self.db["packages"][pkg_name]} if pkg_name and pkg_name in self.db["packages"] else dict(self.db["packages"])

        if not targets:
            print("[INFO] No packages to check")
            return

        print(f"[INFO] Checking for updates ({len(targets)} packages)...")

        updated = 0
        for name, info in targets.items():
            current = info["version"]
            try:
                url = f"{repo_url.rstrip('/')}/packages/{urllib.parse.quote(name)}"
                req = urllib.request.Request(url, headers={
                    "User-Agent": f"MyanPM/{VERSION}"
                })
                with urllib.request.urlopen(req, timeout=10) as resp:
                    result = json.loads(resp.read().decode())

                if result.get("status") == "success":
                    remote = result.get("data", {})
                    remote_version = remote.get("version", current)
                    if remote_version != current:
                        print(f"  [UPD] {name}: v{current} -> v{remote_version}")
                        updated += 1
                    else:
                        print(f"  [OK]  {name}: v{current} (up to date)")
            except Exception:
                print(f"  [ERR] {name}: Failed to check")

        if updated == 0:
            print(f"[OK] All packages are up to date")
        else:
            print(f"[INFO] {updated} updates available. Use 'remove' then 'install-remote' to update.")

    # ── Repository Management ──

    def repo_add(self, url):
        """Add a remote repository"""
        repos = self.repos.get("repos", [])
        if url in repos:
            print(f"[WARN] Repository already exists: {url}")
            return
        # Test connection
        print(f"[INFO] Testing {url}...", end="", flush=True)
        try:
            req = urllib.request.Request(
                f"{url.rstrip('/')}/",
                headers={"User-Agent": f"MyanPM/{VERSION}"}
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                resp.read()
            print(" OK")
            repos.append(url)
            self.repos["repos"] = repos
            self._save_repos()
            print(f"[OK] Repository added: {url}")
        except Exception as e:
            print(f" FAILED ({e})")
            print(f"[ERR] Cannot add repository")

    def repo_remove(self, url_or_index):
        """Remove a remote repository"""
        repos = self.repos.get("repos", [])
        try:
            idx = int(url_or_index)
            if 0 <= idx < len(repos):
                removed = repos.pop(idx)
                self.repos["repos"] = repos
                self._save_repos()
                print(f"[OK] Removed: {removed}")
                return
        except ValueError:
            pass
        if url_or_index in repos:
            repos.remove(url_or_index)
            self.repos["repos"] = repos
            self._save_repos()
            print(f"[OK] Removed: {url_or_index}")
        else:
            print(f"[ERR] Repository not found")

    def repo_list(self):
        """List configured repositories"""
        repos = self.repos.get("repos", [])
        active = self.repos.get("active", 0)
        print("[Configured Reposories]")
        print("-" * 50)
        for i, repo in enumerate(repos):
            marker = " > " if i == active else "   "
            print(f"  {marker}[{i}] {repo}")
        print("-" * 50)
        print(f"Active: [{active}] {repos[active] if repos else 'None'}")

    def repo_switch(self, index):
        """Switch active repository"""
        repos = self.repos.get("repos", [])
        if 0 <= index < len(repos):
            self.repos["active"] = index
            self._save_repos()
            print(f"[OK] Active repository: {repos[index]}")
        else:
            print(f"[ERR] Invalid index (0-{len(repos)-1})")

    # ── Export / Import ──

    def export(self, output_path):
        """Export installed packages list"""
        with open(output_path, 'w') as f:
            json.dump(self.db["packages"], f, indent=2, ensure_ascii=False)
        print(f"[OK] Exported to: {output_path}")

    def import_list(self, input_path):
        """Import packages from a list file"""
        if not os.path.exists(input_path):
            print(f"[ERR] File not found: {input_path}")
            return
        with open(input_path, 'r') as f:
            pkg_list = json.load(f)
        print(f"[INFO] Found {len(pkg_list)} packages to import")
        for name in pkg_list:
            if name not in self.db["packages"]:
                print(f"  [MISSING] {name}")
                self.install_remote(name)


def main():
    parser = argparse.ArgumentParser(
        description="MyanPM - Myanos Package Manager v2.0.0",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  myan_pm.py install ./package.myan        # Install local package
  myan_pm.py install-remote myanmar-code   # Install from registry
  myan_pm.py search-remote tool            # Search remote registry
  myan_pm.py update                        # Check for updates
  myan_pm.py repo-add http://...           # Add repository
  myan_pm.py repo-list                     # List repositories
  myan_pm.py build --name X --version Y    # Build package
        """
    )
    sub = parser.add_subparsers(dest="command")

    # Install
    install_p = sub.add_parser("install", help="Install .myan package (local)")
    install_p.add_argument("path", help="Path to .myan file")

    # Install remote
    install_r = sub.add_parser("install-remote", help="Install package from registry")
    install_r.add_argument("name", help="Package name")

    # Remove
    sub.add_parser("remove", help="Remove package").add_argument("name")

    # List
    sub.add_parser("list", help="List installed packages")

    # Search local
    search_p = sub.add_parser("search", help="Search installed packages")
    search_p.add_argument("query")

    # Search remote
    search_r = sub.add_parser("search-remote", help="Search remote registry")
    search_r.add_argument("query")
    search_r.add_argument("--category", "-c", help="Filter by category")

    # Info
    sub.add_parser("info", help="Package info").add_argument("name")

    # Update
    update_p = sub.add_parser("update", help="Check for updates")
    update_p.add_argument("name", nargs="?", help="Specific package (optional)")

    # Build
    build_p = sub.add_parser("build", help="Build .myan package")
    build_p.add_argument("--name", required=True)
    build_p.add_argument("--version", default="1.0.0")
    build_p.add_argument("--author", default="Unknown")
    build_p.add_argument("--desc", default="")
    build_p.add_argument("--src", default="./src")
    build_p.add_argument("--out", default="./dist")
    build_p.add_argument("--category", default="tools")
    build_p.add_argument("--homepage", default="")
    build_p.add_argument("--license", default="MIT")
    build_p.add_argument("--icon", default="")
    build_p.add_argument("--tags", nargs="*", default=[])

    # Repo management
    repo_p = sub.add_parser("repo-add", help="Add remote repository")
    repo_p.add_argument("url")

    repo_rm = sub.add_parser("repo-remove", help="Remove remote repository")
    repo_rm.add_argument("url_or_index")

    sub.add_parser("repo-list", help="List repositories")

    repo_sw = sub.add_parser("repo-switch", help="Switch active repository")
    repo_sw.add_argument("index", type=int)

    # Export/Import
    export_p = sub.add_parser("export", help="Export installed packages")
    export_p.add_argument("output", help="Output file path")

    import_p = sub.add_parser("import", help="Import packages from list")
    import_p.add_argument("input", help="Input file path")

    args = parser.parse_args()
    pm = MyanPM()

    if args.command == "install":
        pm.install(args.path)
    elif args.command == "install-remote":
        pm.install_remote(args.name)
    elif args.command == "remove":
        pm.remove(args.name)
    elif args.command == "list":
        pm.list()
    elif args.command == "search":
        pm.search(args.query)
    elif args.command == "search-remote":
        pm.search_remote(args.query, getattr(args, "category", None))
    elif args.command == "info":
        pm.info(args.name)
    elif args.command == "update":
        pm.update(args.name if hasattr(args, "name") else None)
    elif args.command == "build":
        pm.build(args.name, args.version, args.author, args.desc,
                 args.src, args.out, args.category, args.homepage,
                 args.license, args.icon, args.tags)
    elif args.command == "repo-add":
        pm.repo_add(args.url)
    elif args.command == "repo-remove":
        pm.repo_remove(args.url_or_index)
    elif args.command == "repo-list":
        pm.repo_list()
    elif args.command == "repo-switch":
        pm.repo_switch(args.index)
    elif args.command == "export":
        pm.export(args.output)
    elif args.command == "import":
        pm.import_list(args.input)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
