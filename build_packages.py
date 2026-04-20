#!/usr/bin/env python3
"""
MyanOS Auto Package Builder
Builds all registered packages into dist/ as .myan files
Usage: python3 build_packages.py
"""

import os, sys, json, shutil
from pathlib import Path

BASE_DIR = Path(__file__).parent
DIST_DIR = BASE_DIR / "dist"

# ── Package Definitions ───────────────────────────────────────────────────
PACKAGES = [
    {
        "name": "myanmar-code",
        "version": "2.0.1",
        "author": "Aung MoeOo (MWD)",
        "desc": "Myanmar Programming Language - 127 keywords",
        "src_files": ["packages/myanmar-code/mmc.py"],
    },
    {
        "name": "myanos-terminal",
        "version": "1.0.0",
        "author": "Meonnmi-ops",
        "desc": "Interactive terminal emulator",
        "src_files": ["terminal/terminal.py"],
    },
    # NOTE: display-engine, ps2-layer, android-layer removed (cloud hosting compatibility)
    {
        "name": "myanos-toolbox",
        "version": "1.0.0",
        "author": "Meonnmi-ops",
        "desc": "Professional system utilities toolbox",
        "src_files": ["toolbox/toolbox.py"],
    },
    {
        "name": "myanai",
        "version": "1.0.0",
        "author": "Meonnmi-ops",
        "desc": "Low-code AI Agent Builder framework",
        "src_files": ["myanai/myanai.py"],
    },
    {
        "name": "myanos-shell",
        "version": "1.0.0",
        "author": "Meonnmi-ops",
        "desc": "MMR Shell - Myanmar command-line shell with 40+ builtins",
        "src_files": ["shell.py"],
    },
    {
        "name": "myanos-pm",
        "version": "1.0.0",
        "author": "Meonnmi-ops",
        "desc": "MyanPM - Myanos Package Manager",
        "src_files": ["myan_pm.py"],
    },
]


def build_package(pkg_def):
    """Build a single .myan package"""
    import hashlib, zipfile, time

    name = pkg_def["name"]
    version = pkg_def["version"]
    pkg_filename = f"{name}-{version}.myan"
    pkg_path = DIST_DIR / pkg_filename
    build_dir = DIST_DIR / "_build_tmp"

    # Clean previous build
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir(parents=True, exist_ok=True)

    # Copy source files
    data_dir = build_dir / "data"
    data_dir.mkdir()
    file_list = []
    checksums = {}

    for src_rel in pkg_def["src_files"]:
        src_path = BASE_DIR / src_rel
        if not src_path.exists():
            print(f"  [WARN] Source not found: {src_rel}")
            continue
        dst_path = data_dir / src_path.name
        shutil.copy2(src_path, dst_path)
        file_list.append(src_path.name)

        # Calculate checksum
        sha256 = hashlib.sha256()
        with open(dst_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                sha256.update(chunk)
        checksums[src_path.name] = sha256.hexdigest()

    if not file_list:
        print(f"  [SKIP] {name}: no source files found")
        if build_dir.exists():
            shutil.rmtree(build_dir)
        return False

    # Create MANIFEST.json
    manifest = {
        "name": name,
        "version": version,
        "author": pkg_def["author"],
        "description": pkg_def["desc"],
        "created": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "myan_format": "1.0",
        "min_myanos": "4.3.0",
        "files": file_list,
        "file_count": len(file_list),
        "checksums": checksums,
    }

    # Create CHECKSUM file
    checksum_content = "\n".join(f"{h}  {f}" for f, h in checksums.items())

    # Build ZIP
    with zipfile.ZipFile(pkg_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("MANIFEST.json", json.dumps(manifest, indent=2, ensure_ascii=False))
        zf.writestr("CHECKSUM.sha256", checksum_content)
        for f in data_dir.iterdir():
            zf.write(f, f"data/{f.name}")

    # Cleanup
    shutil.rmtree(build_dir)

    size = pkg_path.stat().st_size
    print(f"  [OK] {pkg_filename} ({size} bytes, {len(file_list)} files)")
    return True


def main():
    print()
    print(f"  MyanOS Package Builder")
    print(f"  Building all packages to dist/")
    print(f"  {'=' * 50}")

    DIST_DIR.mkdir(parents=True, exist_ok=True)

    built = 0
    failed = 0
    for pkg in PACKAGES:
        if build_package(pkg):
            built += 1
        else:
            failed += 1

    print(f"  {'=' * 50}")
    print(f"  Built: {built} | Failed: {failed}")
    print(f"  Output: {DIST_DIR}/")
    print(f"  Files: {len(list(DIST_DIR.glob('*.myan')))} .myan packages")
    print()

    # List built packages
    for f in sorted(DIST_DIR.glob("*.myan")):
        print(f"    {f.name} ({f.stat().st_size} bytes)")
    print()

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
