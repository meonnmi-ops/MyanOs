#!/usr/bin/env python3
"""
Myanmar Code CLI for Myanos v2.0.1
Wrapper for myanmar-code Python package
Author: Aung MoeOo (MWD) | Integrated by Meonnmi-ops
"""

import sys

def run_myanmar_code(code):
    """Execute Myanmar Code"""
    try:
        import myanmar_code
        result = myanmar_code.execute(code)
        if result:
            print(result)
    except ImportError:
        print("🇲🇲 Myanmar Code v2.0.1")
        print("127 keywords | Author: Aung MoeOo (MWD)")
        print()
        print("Install: pip install myanmar-code")
        print("PyPI:    https://pypi.org/project/myanmar-code/")
        print()
        print("Usage: mmc run '<myanmar_code>'")
        print("Example: mmc run 'ပုံနှိပ် \"မင်္ဂလာပါ\"'")

def main():
    if len(sys.argv) < 3 or sys.argv[1] != "run":
        print("Myanmar Code CLI v2.0.1")
        print("Usage: python3 mmc.py run '<code>'")
        return
    code = " ".join(sys.argv[2:])
    run_myanmar_code(code)

if __name__ == "__main__":
    main()
