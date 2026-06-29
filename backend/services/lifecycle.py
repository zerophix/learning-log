"""FastAPI backend lifecycle management for MCP server."""
import os
import sys
import time
import subprocess
import requests

PROJECT_DIR = os.environ.get(
    "LEARNLOG_PROJECT_DIR",
    os.path.expanduser("~/PycharmProjects/learning-log")
)
RUNTIME_DIR = os.path.expanduser("~/.learning-log")
BACKEND_SCRIPT = os.path.join(PROJECT_DIR, "backend", "main.py")
VENV_PYTHON = os.path.join(PROJECT_DIR, "venv", "bin", "python3")
PID_FILE = os.path.join(RUNTIME_DIR, "backend.pid")
PORT_FILE = os.path.join(RUNTIME_DIR, "backend.port")
BACKEND_PORT = int(os.environ.get("LEARNLOG_PORT", "8002"))
BACKEND_URL = f"http://localhost:{BACKEND_PORT}"


def check_alive() -> bool:
    try:
        r = requests.get(f"{BACKEND_URL}/api/stats", timeout=2)
        return r.status_code == 200
    except Exception:
        return False


def start() -> bool:
    if check_alive():
        return True
    os.makedirs(RUNTIME_DIR, exist_ok=True)
    python = VENV_PYTHON if os.path.exists(VENV_PYTHON) else sys.executable
    if not os.path.exists(BACKEND_SCRIPT):
        print(f"⚠️  Backend script not found at {BACKEND_SCRIPT}", file=sys.stderr)
        return False
    print(f"🔧 正在启动 Learning Log 后端...", file=sys.stderr)
    try:
        proc = subprocess.Popen(
            [python, BACKEND_SCRIPT],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
            cwd=os.path.dirname(BACKEND_SCRIPT)
        )
        with open(PID_FILE, 'w') as f:
            f.write(str(proc.pid))
        with open(PORT_FILE, 'w') as f:
            f.write(str(BACKEND_PORT))
        for _ in range(25):
            time.sleep(0.2)
            if check_alive():
                print(f"✅ 后端就绪 (PID: {proc.pid}, port: {BACKEND_PORT})", file=sys.stderr)
                return True
        print(f"⚠️  后端启动超时", file=sys.stderr)
        return False
    except Exception as e:
        print(f"❌ 后端启动失败: {e}", file=sys.stderr)
        return False


def ensure() -> bool:
    if not check_alive():
        return start()
    return True


def save_entry(entry_data: dict) -> int:
    if not ensure():
        print("❌ 后端不可用", file=sys.stderr)
        return -1
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/entries",
            json=entry_data,
            timeout=10
        )
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 学习记录已保存 (ID: {result.get('id')})", file=sys.stderr)
            return result.get('id', -1)
        else:
            print(f"❌ 保存失败: {response.text}", file=sys.stderr)
            return -1
    except Exception as e:
        print(f"❌ API 调用失败: {e}", file=sys.stderr)
        return -1
