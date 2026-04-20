#!/usr/bin/env python3
"""
MyanOS — Python Code Execution Module
Isolated subprocess execution with matplotlib visualization support

Ported from ai_colab_platform/server/pythonExecutor.ts to Python
Features:
  - Sandboxed Python code execution via tempfile (no quote-escaping bugs)
  - stdout/stderr capture
  - Matplotlib figure capture (base64 images)
  - Configurable timeout
  - Execution time tracking
"""

import subprocess
import sys
import time
import json
import base64
import io
import os
import tempfile
from pathlib import Path

# ─── Config ────────────────────────────────────────────────────────────────────
DEFAULT_TIMEOUT = 30  # seconds
MAX_TIMEOUT = 120     # seconds (for training tasks)


def execute_python_code(code, timeout=DEFAULT_TIMEOUT):
    """
    Execute Python code in an isolated subprocess.
    Returns output, errors, and execution time.

    Uses tempfile approach to avoid quote-escaping bugs with
    multi-line strings, f-strings, and special characters.

    Args:
        code: Python code string to execute
        timeout: Maximum execution time in seconds

    Returns:
        dict with keys: status, output, error, executionTime
    """
    start_time = time.time()

    # Create a wrapper script that captures output
    wrapper = """
import sys, traceback, json, io
from contextlib import redirect_stdout, redirect_stderr

output_buffer = io.StringIO()
error_buffer = io.StringIO()

try:
    with redirect_stdout(output_buffer), redirect_stderr(error_buffer):
        exec(compile(open(___CODE_FILE___, 'rb').read(), ___CODE_FILE___, 'exec'))
    output = output_buffer.getvalue()
    error = error_buffer.getvalue()
    print(json.dumps({"status": "success", "output": output, "error": error}))
except Exception as e:
    error_msg = traceback.format_exc()
    print(json.dumps({"status": "error", "output": "", "error": error_msg}))
"""
    # Write user code to a temp file (avoids all escaping issues)
    tmpdir = tempfile.mkdtemp(prefix='myanos_exec_')
    code_file = os.path.join(tmpdir, 'user_code.py')

    try:
        with open(code_file, 'w', encoding='utf-8') as f:
            f.write(code)

        # Replace placeholder with actual file path
        wrapper = wrapper.replace('___CODE_FILE___', repr(code_file))

        result = subprocess.run(
            [sys.executable, '-c', wrapper],
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=tmpdir,
        )

        exec_time = int((time.time() - start_time) * 1000)

        try:
            parsed = json.loads(result.stdout.strip())
            return {
                'status': parsed.get('status', 'error'),
                'output': parsed.get('output', ''),
                'error': parsed.get('error', '') or result.stderr,
                'executionTime': exec_time,
            }
        except (json.JSONDecodeError, ValueError):
            return {
                'status': 'error',
                'output': result.stdout,
                'error': result.stderr or 'Failed to parse execution output',
                'executionTime': exec_time,
            }

    except subprocess.TimeoutExpired:
        exec_time = int((time.time() - start_time) * 1000)
        return {
            'status': 'error',
            'output': '',
            'error': f'Execution timeout ({timeout}s limit exceeded)',
            'executionTime': exec_time,
        }
    except Exception as e:
        exec_time = int((time.time() - start_time) * 1000)
        return {
            'status': 'error',
            'output': '',
            'error': f'Execution error: {e}',
            'executionTime': exec_time,
        }
    finally:
        # Cleanup temp files
        try:
            os.remove(code_file)
            os.rmdir(tmpdir)
        except Exception:
            pass


def execute_python_with_visualization(code, timeout=DEFAULT_TIMEOUT):
    """
    Execute Python code with matplotlib visualization support.
    Captures generated figures as base64-encoded images.

    Uses tempfile approach to avoid quote-escaping bugs.

    Args:
        code: Python code string to execute
        timeout: Maximum execution time in seconds

    Returns:
        dict with keys: status, output, error, images, executionTime
    """
    start_time = time.time()

    # Create wrapper that handles matplotlib figures
    wrapper = """
import sys, traceback, json, base64, io, os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from contextlib import redirect_stdout, redirect_stderr

output_buffer = io.StringIO()
error_buffer = io.StringIO()
images = []

try:
    with redirect_stdout(output_buffer), redirect_stderr(error_buffer):
        exec(compile(open(___CODE_FILE___, 'rb').read(), ___CODE_FILE___, 'exec'))

    # Capture matplotlib figures
    for fig_num in plt.get_fignums():
        fig = plt.figure(fig_num)
        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        images.append(img_base64)
        plt.close(fig)

    # Also capture any saved PNG files in working directory
    for fname in sorted(os.listdir('.')):
        if fname.endswith('.png') and fname.startswith('myanos_viz_'):
            try:
                with open(fname, 'rb') as f:
                    images.append(base64.b64encode(f.read()).decode('utf-8'))
                os.remove(fname)
            except Exception:
                pass

    output = output_buffer.getvalue()
    error = error_buffer.getvalue()
    print(json.dumps({
        "status": "success",
        "output": output,
        "error": error,
        "images": images
    }))
except Exception as e:
    error_msg = traceback.format_exc()
    print(json.dumps({
        "status": "error",
        "output": "",
        "error": error_msg,
        "images": []
    }))
"""

    # Write user code to a temp file
    tmpdir = tempfile.mkdtemp(prefix='myanos_viz_')
    code_file = os.path.join(tmpdir, 'user_code.py')

    try:
        with open(code_file, 'w', encoding='utf-8') as f:
            f.write(code)

        wrapper = wrapper.replace('___CODE_FILE___', repr(code_file))

        result = subprocess.run(
            [sys.executable, '-c', wrapper],
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=tmpdir,
        )

        exec_time = int((time.time() - start_time) * 1000)

        try:
            parsed = json.loads(result.stdout.strip())
            return {
                'status': parsed.get('status', 'error'),
                'output': parsed.get('output', ''),
                'error': parsed.get('error', '') or result.stderr,
                'images': parsed.get('images', []),
                'executionTime': exec_time,
            }
        except (json.JSONDecodeError, ValueError):
            return {
                'status': 'error',
                'output': result.stdout,
                'error': result.stderr or 'Failed to parse execution output',
                'images': [],
                'executionTime': exec_time,
            }

    except subprocess.TimeoutExpired:
        exec_time = int((time.time() - start_time) * 1000)
        return {
            'status': 'error',
            'output': '',
            'error': f'Execution timeout ({timeout}s limit exceeded)',
            'images': [],
            'executionTime': exec_time,
        }
    except Exception as e:
        exec_time = int((time.time() - start_time) * 1000)
        return {
            'status': 'error',
            'output': '',
            'error': f'Execution error: {e}',
            'images': [],
            'executionTime': exec_time,
        }
    finally:
        try:
            for f in Path(tmpdir).glob('*'):
                f.unlink(missing_ok=True)
            os.rmdir(tmpdir)
        except Exception:
            pass


# ─── Self-Test ──────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("MyanOS Code Executor — Self Test\n")

    # Test 1: Simple print
    print("Test 1: Simple print")
    result = execute_python_code('print("Hello from MyanOS!")')
    print(f"  Status: {result['status']}")
    print(f"  Output: {result['output'].strip()}")
    print()

    # Test 2: Multi-line code with f-strings
    print("Test 2: Multi-line with f-strings (was buggy before)")
    code = """
name = "MyanOS"
version = 5.0
for i in range(3):
    print(f'{name} v{version} - step {i+1}')
    if i == 1:
        print('  half way there!')
"""
    result = execute_python_code(code)
    print(f"  Status: {result['status']}")
    print(f"  Output: {result['output'].strip()}")
    print()

    # Test 3: Error handling
    print("Test 3: Error handling")
    result = execute_python_code('1/0')
    print(f"  Status: {result['status']}")
    print(f"  Error: {result['error'][:100]}")
    print()

    # Test 4: Visualization with matplotlib
    print("Test 4: Visualization (matplotlib)")
    code = """
import matplotlib.pyplot as plt
import numpy as np
x = np.linspace(0, 10, 100)
y = np.sin(x)
plt.figure()
plt.plot(x, y)
plt.title('Test Plot')
plt.xlabel('x')
plt.ylabel('sin(x)')
"""
    result = execute_python_with_visualization(code)
    print(f"  Status: {result['status']}")
    print(f"  Images: {len(result.get('images', []))}")
    if result.get('images'):
        print(f"  First image size: {len(result['images'][0])} chars (base64)")
    if result.get('error'):
        print(f"  Error: {result['error'][:200]}")
    print()

    # Test 5: Burmese text in code
    print("Test 5: Burmese text handling")
    code = """
data = ['မြန်မာ', 'ဘာသာ', 'ကြီးကြုံတယ်']
for item in data:
    print(f'  - {item}')
print('Total:', len(data))
"""
    result = execute_python_code(code)
    print(f"  Status: {result['status']}")
    print(f"  Output: {result['output'].strip()}")
    print()

    print("All tests completed!")
