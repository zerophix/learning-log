#!/usr/bin/env python3
"""
Web AI Bridge — 终端直连免费 AI（双通道）
========================================
Playwright 自动化 + GitHub Models API 双通道。

用法:
  web-ai "你的问题"                # 默认用 GitHub Models API（稳定）
  web-ai --browser "问题"          # 用 Playwright 浏览器自动化
  web-ai --login deepseek          # 首次登录 DeepSeek Web（需手动输手机号）
  web-ai --save "问题"             # 回答同时记录到 learnlog
  web-ai --list                    # 列出可用平台
"""

import argparse
import sys
import os
import json
import subprocess
import urllib.request
import urllib.error
from pathlib import Path

# ── 配置 ────────────────────────────────────────────────

SESSION_DIR = os.path.expanduser("~/.learning-log")
os.makedirs(SESSION_DIR, exist_ok=True)

# 平台定义
PLATFORMS = {
    "deepseek": {
        "url": "https://chat.deepseek.com",
        "note": "需手机号登录，每日免费额度",
        "login_indicators": ["ds-sign-in-form", "Phone number", "验证码"],
        "textarea_sel": "#chat-input textarea, div[contenteditable='true']",
        "submit_sel": "button[type='submit']",
        "response_sel": ".ds-markdown, [data-testid='assistant-message'], .f6c5e9c6",
        "wait_sel": ".ds-markdown p, .f6c5e9c6 p",
    },
    "gemini": {
        "url": "https://gemini.google.com",
        "note": "免费，Google 账号登录",
        "login_indicators": ["signin", "Sign in", "登录"],
        "textarea_sel": "textarea, [contenteditable='true'], .ql-editor",
        "submit_sel": "button[aria-label*='send']",
        "response_sel": ".model-response-text, .message-content",
        "wait_sel": ".model-response-text",
    },
    "chatgpt": {
        "url": "https://chatgpt.com",
        "note": "免费版有使用配额",
        "login_indicators": ["login", "Log in", "Sign up"],
        "textarea_sel": "#prompt-textarea",
        "submit_sel": "button[data-testid='send-button']",
        "response_sel": "[data-message-author-role='assistant']",
        "wait_sel": "[data-message-author-role='assistant']",
    },
    "huggingchat": {
        "url": "https://huggingface.co/chat",
        "note": "免费，无需登录",
        "login_indicators": [],
        "textarea_sel": "textarea[placeholder*='Ask']",
        "submit_sel": "button[type='submit']",
        "response_sel": ".prose, .whitespace-pre-wrap",
        "wait_sel": ".prose",
    },
    "kimi": {
        "url": "https://www.kimi.com",
        "note": "免费，需手机号",
        "login_indicators": ["登录", "手机号"],
        "textarea_sel": "textarea",
        "submit_sel": "button[type='submit']",
        "response_sel": ".message-content, .markdown-body",
        "wait_sel": ".message-content",
    },
    "doubao": {
        "url": "https://www.doubao.com/chat/",
        "note": "免费，字节系账号",
        "login_indicators": ["登录", "手机号"],
        "textarea_sel": "textarea",
        "submit_sel": "button[type='submit']",
        "response_sel": ".ds-markdown, .message-content",
        "wait_sel": ".ds-markdown",
    },
"qianwen": {
        "url": "https://www.qianwen.com",
        "note": "免费，通义千问官网 (原 tongyi.aliyun.com)",
        "login_indicators": ["登录", "注册", "手机号"],
        "textarea_sel": "textarea, [contenteditable='true'], [role='textbox']",
        "submit_sel": "button[type='submit'], button:has(svg), [aria-label*='发送']",
        "response_sel": ".message-content, .markdown-body, .answer-content, .prose",
        "wait_sel": ".message-content, .answer-content",
    },
}

# GitHub Models API — 免费模型（2026-06）
GITHUB_MODELS = {
    "gpt-4o": "gpt-4o",
    "deepseek-v3": "DeepSeek-V3-0324",
    "deepseek-r1": "DeepSeek-R1",
    "phi-4": "Phi-4-multimodal-instruct",
    "mistral-large": "Mistral-large-2407",
    "cohere-command-r": "Cohere-command-r-plus-08-2024",
}

DEFAULT_API_MODEL = "gpt-4o"


# ── API 模式（GitHub Models — 稳定、免费）───────────────

def ask_api(prompt: str, model: str = DEFAULT_API_MODEL) -> str:
    """通过 GitHub Models API 调用免费模型"""
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        return "❌ 需要设置 GITHUB_TOKEN 环境变量"

    api_model = GITHUB_MODELS.get(model, model)

    data = json.dumps({
        "model": api_model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 4096,
    }).encode()

    req = urllib.request.Request(
        "https://models.inference.ai.azure.com/chat/completions",
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read())
            return result["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return f"❌ API 错误 ({e.code}): {body[:200]}"
    except Exception as e:
        return f"❌ 请求失败: {e}"


# ── Ollama 本地模式（快速 fallback）───────────────────

def ask_ollama(prompt: str, model: str = "qwen3-coder:30b") -> str:
    """调用本地 Ollama 模型"""
    data = json.dumps({
        "model": model,
        "prompt": prompt,
        "stream": False,
    }).encode()
    try:
        req = urllib.request.Request(
            "http://localhost:11434/api/generate",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read())
            return result.get("response", "⚠️ 空回答")
    except urllib.error.HTTPError as e:
        return f"❌ Ollama 错误 ({e.code}): {e.read().decode()[:200]}"
    except Exception as e:
        return f"❌ Ollama 连接失败 ({e})"


def list_api_models():
    """列出可用 API 模型"""
    token = os.environ.get("GITHUB_TOKEN")
    models = list(GITHUB_MODELS.keys())
    return models, bool(token)


# ── Chrome Extension 桥接模式 ───────────────────────────

def ask_extension(prompt: str, platform: str = "deepseek", timeout: int = 120) -> str:
    """通过 Chrome Extension + Bridge Server HTTP API 调用网页 AI"""
    import json
    import urllib.request

    data = json.dumps({
        "platform": platform,
        "prompt": prompt,
        "timeout": timeout,
    }).encode()

    req = urllib.request.Request(
        "http://localhost:9877/ask",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout + 5) as resp:
            result = json.loads(resp.read())
            if "error" in result and result["error"]:
                return f"❌ {result['error']}"
            return result.get("text", "⚠️ 空回答")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return f"❌ Bridge 错误 ({e.code}): {body[:200]}"
    except urllib.error.URLError:
        return (f"❌ 无法连接 Bridge Server\n"
                f"   请确保服务在运行: bridge start")
    except Exception as e:
        return f"❌ 请求失败: {e}"


def ask_extension_stream(prompt: str, platform: str = "deepseek", timeout: int = 120, output=sys.stderr) -> str:
    """流式模式：通过 /ask/start + /ask/progress 逐段输出"""
    import json, urllib.request, time, sys

    # 1. 异步启动
    data = json.dumps({"platform": platform, "prompt": prompt, "timeout": timeout}).encode()
    req = urllib.request.Request(
        "http://localhost:9877/ask/start", data=data,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read())
    except Exception as e:
        return f"❌ 流式启动失败: {e}"

    stream_id = result.get("stream_id", "")
    if not stream_id:
        return "❌ 未获取到 stream_id"

    # 2. 轮询进度
    full_text = ""
    last_len = 0
    deadline = time.time() + timeout + 10

    while time.time() < deadline:
        time.sleep(0.5)
        try:
            progress_req = urllib.request.Request(
                f"http://localhost:9877/ask/progress?stream_id={stream_id}"
            )
            with urllib.request.urlopen(progress_req, timeout=5) as resp:
                progress = json.loads(resp.read())
        except Exception:
            continue

        text = progress.get("text", "")
        done = progress.get("done", False)

        # 输出新增字符
        if len(text) > last_len:
            chunk = text[last_len:]
            full_text += chunk
            last_len = len(text)
            sys.stdout.write(chunk)
            sys.stdout.flush()

        if done:
            break

    print(file=output)
    return full_text


# ── Chrome Profile 模式（Playwright + 持久化登录态）──────

CHROME_PROFILE = "/tmp/web-ai-chrome-profile"
EXTENSION_PATH = os.path.expanduser(
    "~/PycharmProjects/learning-log/chrome-extension"
)

_CHROME_LAUNCHED = False
_CHROME_PAGE = None
_CHROME_CONTEXT = None
_CHROME_PLAYWRIGHT = None


def setup_chrome():
    """一次性登录：启动可见 Chrome，让用户登录各 AI 平台"""
    from playwright.sync_api import sync_playwright

    print("\n🔐 Web AI Bridge — 一次性登录设置", file=sys.stderr)
    print("=" * 50, file=sys.stderr)
    print("即将打开 Chrome，请登录以下平台：", file=sys.stderr)
    print("  1. https://chat.deepseek.com", file=sys.stderr)
    print("  2. https://huggingface.co/chat", file=sys.stderr)
    print("\n完成后关闭浏览器即可", file=sys.stderr)
    print("=" * 50, file=sys.stderr)

    with sync_playwright() as p:
        browser = p.chromium.launch_persistent_context(
            user_data_dir=CHROME_PROFILE,
            headless=False,
            args=[
                f"--disable-extensions-except={EXTENSION_PATH}",
                f"--load-extension={EXTENSION_PATH}",
            ],
            viewport={"width": 1280, "height": 800},
        )
        page = browser.pages[0] if browser.pages else browser.new_page()
        page.goto("https://chat.deepseek.com")
        input("\n📌 登录后关闭浏览器，然后按 Enter 继续...")
        browser.close()

    print("✅ 登录态已保存！以后全自动：web-ai \"问题\"")


def ask_chrome(prompt: str, platform: str = "deepseek", timeout: int = 120) -> str:
    """用已登录 Chrome profile + Playwright 直接操作页面"""
    from playwright.sync_api import sync_playwright

    cfg = PLATFORMS.get(platform)
    if not cfg:
        return f"❌ 未知平台: {platform}"

    global _CHROME_LAUNCHED, _CHROME_PAGE, _CHROME_CONTEXT, _CHROME_PLAYWRIGHT

    try:
        if not _CHROME_LAUNCHED:
            print(f"  🚀 启动 Chrome...", file=sys.stderr)
            _CHROME_PLAYWRIGHT = sync_playwright()
            ps = _CHROME_PLAYWRIGHT.__enter__()
            _CHROME_CONTEXT = ps.chromium.launch_persistent_context(
                user_data_dir=CHROME_PROFILE,
                headless=True,
                args=[
                    f"--disable-extensions-except={EXTENSION_PATH}",
                    f"--load-extension={EXTENSION_PATH}",
                    "--disable-blink-features=AutomationControlled",
                ],
                viewport={"width": 1280, "height": 800},
                ignore_default_args=["--enable-automation"],
            )
            _CHROME_LAUNCHED = True
            _CHROME_PAGE = (_CHROME_CONTEXT.pages[0]
                           if _CHROME_CONTEXT.pages
                           else _CHROME_CONTEXT.new_page())

        page = _CHROME_PAGE
        _dismiss_modals(page)

        # 导航
        print(f"  🔍 打开 {cfg['url']} ...", file=sys.stderr)
        page.goto(cfg["url"], wait_until="domcontentloaded")
        page.wait_for_timeout(3000)

        # 检查登录
        text = page.evaluate("() => document.body.innerText.slice(0,1000).toLowerCase()")
        if any(k in text for k in ["log in", "sign in", "phone"]):
            return (f"❌ {platform} 未登录\n请先运行: web-ai --setup")

        _dismiss_modals(page)

        # 打字
        print(f"  ✏️ 输入问题 ({len(prompt)} 字符)...", file=sys.stderr)
        ta = _find_input(page, cfg)
        if not ta:
            return f"❌ 找不到输入框"

        ta.click()
        page.wait_for_timeout(200)
        ta.fill(prompt)
        page.wait_for_timeout(500)

        # 发送
        btn = _find_send(page, cfg)
        if btn:
            btn.click()
        else:
            page.keyboard.press("Enter")

        print(f"  ⏳ 等待回答（最长 {timeout}s）...", file=sys.stderr)
        page.wait_for_timeout(3000)

        # 轮询等回答
        body_len = len(page.evaluate("() => document.body.innerText"))
        for _ in range(timeout // 2):
            page.wait_for_timeout(2000)
            new_len = len(page.evaluate("() => document.body.innerText"))
            if new_len > body_len + 80:
                break
            body_len = new_len

        # 提取
        for sel in cfg["response"].split(", "):
            try:
                els = page.query_selector_all(sel.strip())
                if els:
                    t = els[-1].text_content().strip()
                    if len(t) > 20:
                        return t
            except Exception:
                continue

        # fallback: 取页面全部文本
        full = page.evaluate("() => document.body.innerText")
        # 去掉输入提示等噪音
        lines = [l.strip() for l in full.split("\n") if len(l.strip()) > 20]
        return "\n".join(lines[-10:]) if lines else "⚠️ 未获取到回答"

    except Exception as e:
        return f"❌ 错误: {e}"


def _find_input(page, cfg):
    sels = [s.strip() for s in cfg["textarea"].split(", ") if s.strip()]
    for sel in sels:
        try:
            el = page.wait_for_selector(sel, timeout=2000)
            if el and el.is_visible():
                return el
        except Exception:
            continue
    return None


def _find_send(page, cfg):
    sels = [s.strip() for s in cfg["submit"].split(", ") if s.strip()]
    for sel in sels:
        try:
            el = page.wait_for_selector(sel, timeout=2000)
            if el and el.is_visible():
                return el
        except Exception:
            continue
    return None


def _dismiss_modals(page):
    for sel in [
        "button:has-text('接受')", "button:has-text('同意')",
        "button:has-text('拒绝')", "button:has-text('关闭')",
        "button:has-text('Continue')", "button:has-text('Got it')",
        "button:has-text('Stay logged out')",
        "button[aria-label='Close']", ".modal-close-btn",
    ]:
        try:
            btn = page.query_selector(sel)
            if btn and btn.is_visible():
                btn.click()
                page.wait_for_timeout(500)
        except Exception:
            pass


# ── Playwright 浏览器模式（无 profile / session 文件）──

def _session_path(platform: str) -> str:
    return os.path.join(SESSION_DIR, f"web-ai-session-{platform}.json")


def _has_session(platform: str) -> bool:
    return os.path.exists(_session_path(platform))


def _load_session(platform: str):
    try:
        with open(_session_path(platform)) as f:
            return json.load(f)
    except Exception:
        return None


def _save_session(context, platform: str):
    """保存浏览器上下文（cookies + localStorage）"""
    path = _session_path(platform)
    context.storage_state(path=path)
    print(f"  💾 会话已保存 → {path}", file=sys.stderr)


def is_login_page(page) -> bool:
    """检测当前页面是否是登录页（而非聊天页）"""
    cfg = PLATFORMS.get(getattr(page, "_platform", "deepseek"), {})
    indicators = cfg.get("login_indicators", [])
    text = page.evaluate("() => document.body.innerText.slice(0, 2000)").lower()
    for keyword in indicators:
        if keyword.lower() in text:
            return True
    # 如果找不到聊天输入框，也可能是登录页
    try:
        page.wait_for_selector("textarea, [contenteditable='true']", timeout=2000)
        return False
    except Exception:
        return True


def login(platform: str):
    """交互式登录：打开可见浏览器让用户手动登录"""
    from playwright.sync_api import sync_playwright

    cfg = PLATFORMS.get(platform)
    if not cfg:
        print(f"❌ 未知平台: {platform}")
        return

    print(f"\n🔐 登录 {platform} ({cfg['url']})", file=sys.stderr)
    print("  ⚠️  请在打开的浏览器中手动登录", file=sys.stderr)
    print("  ⏎  登录完成后按 Enter 继续...", file=sys.stderr)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,  # 可见浏览器
            args=["--no-sandbox"],
        )
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            storage_state=_load_session(platform) if _has_session(platform) else None,
        )
        page = browser.new_page()
        page._platform = platform
        page.goto(cfg["url"], wait_until="domcontentloaded")

        # 等用户交互
        input("  📌 请完成登录，然后按 Enter 键保存会话...")

        # 保存 session
        _save_session(context, platform)

        # 验证
        print("  🔍 验证登录态...", file=sys.stderr)
        page.goto(cfg["url"], wait_until="domcontentloaded")
        page.wait_for_timeout(2000)
        if is_login_page(page):
            print("  ⚠️  似乎仍在登录页，session 可能未完全保存", file=sys.stderr)
            print("  请下次使用 --login 重新登录", file=sys.stderr)
        else:
            print("  ✅ 登录成功！", file=sys.stderr)

        browser.close()


def ask_browser(prompt: str, platform: str = "deepseek", timeout: int = 120) -> str:
    """通过 Playwright 浏览器自动化调用网页 AI"""
    from playwright.sync_api import sync_playwright

    cfg = PLATFORMS.get(platform)
    if not cfg:
        return f"❌ 未知平台: {platform}"

    if not _has_session(platform):
        return (f"❌ 未找到 {platform} 的登录会话\n"
                f"   请先运行: web-ai --login {platform}")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox"],
        )
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            storage_state=_load_session(platform),
        )
        page = browser.new_page()

        print(f"  🔍 打开 {cfg['url']} ...", file=sys.stderr)
        page.goto(cfg["url"], wait_until="domcontentloaded")
        page.wait_for_timeout(3000)

        # 检查登录态
        if is_login_page(page):
            browser.close()
            return (f"❌ {platform} 登录已过期，请重新登录:\n"
                    f"   web-ai --login {platform}")

        # 关弹窗
        _dismiss_modal(page)

        # 找输入框
        print(f"  ✏️ 输入问题 ({len(prompt)} 字符)...", file=sys.stderr)
        _type_into_chat(page, prompt, cfg)

        # 点击提交
        _click_send(page, cfg)
        print(f"  ⏳ 等待回答（最长 {timeout}s）...", file=sys.stderr)

        # 等回答
        try:
            page.wait_for_selector(cfg["wait_sel"], timeout=timeout * 1000)
            page.wait_for_timeout(2000)
        except Exception:
            browser.close()
            return "⚠️ 等待回答超时"

        # 提取
        result = page.evaluate(f"""
            () => {{
                const els = document.querySelectorAll('{cfg["response_sel"]}');
                return Array.from(els).map(el => el.textContent).join('\\n\\n');
            }}
        """)

        # 刷新 session
        _save_session(context, platform)
        browser.close()

        return result.strip() if result else "⚠️ 未获取到回答"


def _type_into_chat(page, text: str, cfg: dict):
    """尝试多种方式找到输入框并输入"""
    import time

    selectors = [
        cfg["textarea_sel"],
        "textarea",
        "[contenteditable='true']",
        "[role='textbox']",
        ".chat-input textarea",
    ]
    for sel in selectors:
        try:
            el = page.wait_for_selector(sel, timeout=3000)
            if el and el.is_visible():
                el.click()
                page.wait_for_timeout(300)
                el.fill(text)
                return
        except Exception:
            continue
    raise Exception("未找到可用的输入框")


def _click_send(page, cfg: dict):
    """尝试多种方式找到发送按钮并点击"""
    import time

    selectors = [
        cfg["submit_sel"],
        "button[type='submit']",
        "button:has(svg)",
        "[aria-label*='send']",
        "[aria-label*='Send']",
        ".send-button",
    ]
    for sel in selectors:
        try:
            btn = page.wait_for_selector(sel, timeout=2000)
            if btn and btn.is_visible():
                btn.click()
                return
        except Exception:
            continue
    # 最后尝试按 Enter
    page.keyboard.press("Enter")


def _dismiss_modal(page):
    """关掉各种弹窗/欢迎页"""
    selectors = [
        "button:has-text('接受')", "button:has-text('同意')",
        "button:has-text('拒绝')", "button:has-text('关闭')",
        "button:has-text('Continue')", "button:has-text('Get started')",
        "button:has-text('Stay logged out')",
        "button[aria-label='Close']", ".modal-close-btn",
        "[data-testid='close-button']",
        ".btn-close", ".close-button",
    ]
    for sel in selectors:
        try:
            btn = page.query_selector(sel)
            if btn and btn.is_visible():
                btn.click()
                page.wait_for_timeout(800)
        except Exception:
            pass


# ── CLI 入口 ──────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Web AI Bridge — 终端直连免费 AI",
        formatter_class=argparse.RawTextHelpFormatter,
        epilog=(
            "示例:\n"
            "  web-ai --ollama \"你的问题\"          # 本地模型（最快）\n"
            "  web-ai --extension \"问题\"           # Chrome Extension 桥接（推荐）\n"
            "  web-ai --browser \"问题\"             # Playwright 自动化（备选）\n"
            "  web-ai --api --model gpt-4o \"...\"   # GitHub Models API\n"
            "  web-ai --login deepseek               # 首次登录 DeepSeek\n"
            "  web-ai --save \"问题\"                 # 同时记录到 learnlog\n"
            "  web-ai --list                         # 列出所有平台和模式\n"
        ),
    )
    parser.add_argument("prompt", nargs="*", help="问题文本")
    parser.add_argument("--extension", "-e", action="store_true",
                        help="Chrome Extension 桥接模式（需要 bridge server）")
    parser.add_argument("--chrome", "-c", action="store_true",
                        help="Chrome Profile 模式（推荐：自动、稳定）")
    parser.add_argument("--setup", action="store_true",
                        help="一次性登录各 AI 平台（仅需一次，之后全自动）")
    parser.add_argument("--browser", "-b", action="store_true",
                        help="Playwright 浏览器自动化模式")
    parser.add_argument("--api", action="store_true",
                        help="GitHub Models API 模式")
    parser.add_argument("--ollama", "-o", action="store_true",
                        help="本地 Ollama 模型模式")
    parser.add_argument("--model", "-m", default=DEFAULT_API_MODEL,
                        help=f"API 模型 (默认: {DEFAULT_API_MODEL})")
    parser.add_argument("--ollama-model", default="qwen3-coder:30b",
                        help="Ollama 本地模型 (默认: qwen3-coder:30b)")
    parser.add_argument("--platform", "-p", choices=list(PLATFORMS.keys()),
                        default="deepseek", help="AI 平台")
    parser.add_argument("--login", action="store_true",
                        help="交互式登录（浏览器模式）")
    parser.add_argument("--save", "-s", action="store_true",
                        help="回答同时记录到 learnlog")
    parser.add_argument("--pipe", action="store_true",
                        help="从 stdin 读取 prompt")
    parser.add_argument("--timeout", "-t", type=int, default=120,
                        help="超时秒数 (默认: 120)")
    parser.add_argument("--stream", action="store_true",
                        help="流式模式：逐段输出回答（仅 Bridge / Extension 模式）")
    parser.add_argument("--list", "-l", action="store_true",
                        help="列出平台和模型")

    args = parser.parse_args()

    # ── --list 更新 ──
    if args.list:
        print("📋 Web AI Bridge 可用资源\n")
        print("  ── 本地 Ollama（即时可用）──")
        print(f"    模型: {args.ollama_model}")
        try:
            r = urllib.request.urlopen("http://localhost:11434/api/tags", timeout=2)
            models = json.loads(r.read()).get("models", [])
            print(f"    状态: {'✅ 运行中' if models else '⚠️ 无模型'} ({len(models)} 个模型)")
        except Exception:
            print("    状态: ❌ 未运行 (ollama serve)")
        print()
        print("  ── Chrome Extension 桥接（推荐）──")
        bridge_ok = False
        try:
            r = urllib.request.urlopen("http://localhost:9877/health", timeout=1)
            bridge_ok = r.status == 200
        except Exception:
            pass
        if bridge_ok:
            try:
                r = urllib.request.urlopen("http://localhost:9877/status", timeout=1)
                st = json.loads(r.read())
                engine_ready = st.get("engine", {}).get("ready", False)
                ext_platforms = [p for p, info in st.get("platforms", {}).items() if info.get("connected")]
                if ext_platforms:
                    for p in ext_platforms:
                        print(f"    ✅ {p:12s}  已连接 (Extension)")
                else:
                    print(f"    ⚠️  无 Extension 连接")
                if engine_ready:
                    profile = st["engine"].get("profile_exists", False)
                    status = "✅ Profile 就绪" if profile else "⚠️ 请先运行 web-ai --setup"
                    print(f"    🎯 Playwright 引擎     {status}")
                else:
                    print(f"    🎯 Playwright 引擎     等待首次使用时启动")
                print(f"    💡 即使无 Extension，引擎也会自动执行")
            except Exception:
                print(f"    ✅ 桥接服务运行中")
        else:
            print(f"    ❌ 桥接服务未运行 (bridge start)")
        print()
        print("  ── Playwright 浏览器模式 ──")
        for name, cfg in PLATFORMS.items():
            sess = "✅" if _has_session(name) else "❌"
            print(f"    {sess} {name:12s} {cfg['url']}")
            print(f"                {cfg['note']}")
        print()
        print("  ── GitHub Models API（免费）──")
        models, has_token = list_api_models()
        token_status = "✅ 已设置" if has_token else "❌ 未设置"
        print(f"    GITHUB_TOKEN: {token_status}")
        for m in models:
            print(f"    - {m}")
        print()
        print("  ── 本地 Ollama ──")
        print(f"    模型: qwen3-coder:30b (已运行中)")
        print()
        print("  使用策略:")
        print("    bridge start                 # 启动桥接服务（自动引擎）")
        print("    web-ai \"...\"                # 自动选择最优（推荐）")
        print("    web-ai --ollama \"...\"       # 本地模型（快速、隐私）")
        print("    web-ai --api \"...\"          # GitHub Models API")
        print("    web-ai --browser \"...\"      # Playwright 自动化（备选）")
        print("")
        print("  💡 推荐流程:")
        print("    1. bridge start              # 启动服务（持久后台）")
        print("    2. web-ai --setup            # 首次登录 AI 平台（仅一次）")
        print("    3. web-ai \"问题\"            # 之后直接提问，无需开页面")
        return

    # ── --login ──
    if args.login:
        login(args.platform)
        return

    # ── 获取 prompt ──
    prompt = None
    if args.pipe:
        prompt = sys.stdin.read().strip()
    elif args.prompt:
        prompt = " ".join(args.prompt)

    if not prompt and not args.setup:
        parser.print_help()
        print("\n❌ 请提供问题文本，或用 --pipe 从 stdin 读取")
        sys.exit(1)

    # ── --setup 处理 ──
    if args.setup:
        setup_chrome()
        return

    # ── 模式选择 ──
    use_browser = args.browser
    use_api = args.api
    use_ollama = args.ollama
    use_extension = args.extension
    use_chrome = args.chrome

    if not use_browser and not use_api and not use_ollama and not use_extension and not use_chrome:
        # 自动选择：Bridge Server > Chrome Profile > Ollama > API > Browser
        # Bridge Server 内置 Playwright 引擎，无需手动打开 AI 页面
        try:
            r = urllib.request.urlopen("http://localhost:9877/health", timeout=1)
            if r.status == 200:
                use_extension = True
        except Exception:
            pass
        if not use_extension:
            if os.path.exists(os.path.join(CHROME_PROFILE, "Default", "Cookies")):
                use_chrome = True
            else:
                try:
                    r = urllib.request.urlopen("http://localhost:11434/api/tags", timeout=1)
                    models = json.loads(r.read()).get("models", [])
                    if models:
                        use_ollama = True
                except Exception:
                    pass
            if not use_chrome and not use_ollama and os.environ.get("GITHUB_TOKEN"):
                use_api = True
            if not use_chrome and not use_ollama and not use_api:
                use_browser = True

    # ── 调用 ──
    print(f"\n🌐 Web AI Bridge", file=sys.stderr)
    if use_chrome:
        print(f"  模式: Chrome Profile [{args.platform}]", file=sys.stderr)
    elif use_extension:
        print(f"  模式: Chrome Extension [{args.platform}]", file=sys.stderr)
    elif use_ollama:
        print(f"  模式: Ollama [{args.ollama_model}]", file=sys.stderr)
    elif use_api:
        print(f"  模式: API [{args.model}]", file=sys.stderr)
    else:
        print(f"  模式: 浏览器 [{args.platform}]", file=sys.stderr)
    print("=" * 50, file=sys.stderr)

    if use_chrome:
        answer = ask_chrome(prompt, args.platform, args.timeout)
    elif use_extension:
        if args.stream:
            answer = ask_extension_stream(prompt, args.platform, args.timeout)
        else:
            answer = ask_extension(prompt, args.platform, args.timeout)
    elif use_ollama:
        answer = ask_ollama(prompt, args.ollama_model)
    elif use_api:
        answer = ask_api(prompt, args.model)
    else:
        answer = ask_browser(prompt, args.platform, args.timeout)

    # 输出到 stdout
    print("\n" + "=" * 50, file=sys.stderr)
    print(answer[:500] + ("..." if len(answer) > 500 else ""), file=sys.stderr)
    print(answer)

    # ── --save ──
    if args.save:
        topic = prompt[:60].strip()
        mode_tag = "Chrome Profile" if use_chrome else \
                   "Chrome Extension" if use_extension else \
                   f"API/{args.model}" if use_api else \
                   f"Browser/{args.platform}" if use_browser else \
                   f"Ollama/{args.ollama_model}"
        proc = subprocess.Popen(
            ["learnlog", "record", topic, "--pipe", "--energy", "4",
             "--type", "deep-research"],
            stdin=subprocess.PIPE,
            text=True,
        )
        entry = f"""## 问题
{prompt}

## 回答（{mode_tag}）
{answer}"""
        proc.communicate(input=entry)
        print(f"\n✅ 已记录到 learnlog", file=sys.stderr)


if __name__ == "__main__":
    main()
