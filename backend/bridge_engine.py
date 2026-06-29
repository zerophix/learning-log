"""
Playwright Engine — Bridge Server 内置浏览器自动化
===================================================
headless Chrome + 已存 profile，无需用户手动打开 AI 页面。

ask_platform() 会先尝试 Extension 快通道，无 Extension 时自动降级到此引擎。
"""

import os
import time
import logging
import threading
from typing import Optional

from playwright.sync_api import sync_playwright, Page

logger = logging.getLogger(__name__)

# ── Chrome Profile ──────────────────────────────────────
CHROME_PROFILE = "/tmp/web-ai-chrome-profile"

# ── 平台 DOM 选择器（从 chrome-extension/content.js 移植）─
PLATFORM_CONFIGS: dict[str, dict] = {
    "deepseek": {
        "name": "DeepSeek",
        "url": "https://chat.deepseek.com",
        "textarea": [
            "textarea[placeholder*='Ask']",
            "#chat-input textarea",
            "div[contenteditable='true']",
            "textarea",
            "[role='textbox']",
        ],
        "send": [
            "button[type='submit']",
            "button:has(svg)",
            ".send-btn",
        ],
        "response": [
            ".ds-markdown",
            ".ds-message-content",
            "[data-testid='assistant-message']",
            ".f6c5e9c6",
            ".message-content",
        ],
        "wait_after_send": 2000,
        "use_enter": True,
    },
    "gemini": {
        "name": "Gemini",
        "url": "https://gemini.google.com",
        "textarea": [
            "textarea",
            "[contenteditable='true']",
            ".ql-editor",
            "[role='textbox']",
        ],
        "send": [
            "button[aria-label*='send']",
            "button[aria-label*='Send']",
            "button[type='submit']",
        ],
        "response": [
            ".model-response-text",
            ".message-content",
            "[data-message-author-role='assistant']",
        ],
        "wait_after_send": 3000,
        "use_enter": False,
    },
    "chatgpt": {
        "name": "ChatGPT",
        "url": "https://chatgpt.com",
        "textarea": [
            "#prompt-textarea",
            "textarea",
            "[contenteditable='true']",
        ],
        "send": [
            "button[data-testid='send-button']",
            "button[type='submit']",
        ],
        "response": [
            "[data-message-author-role='assistant']",
            ".markdown",
        ],
        "wait_after_send": 2000,
        "use_enter": False,
    },
    "huggingchat": {
        "name": "HuggingChat",
        "url": "https://huggingface.co/chat",
        "textarea": [
            "textarea[placeholder*='Ask']",
            "textarea",
            "[contenteditable='true']",
        ],
        "send": [
            "button[type='submit']",
        ],
        "response": [
            ".prose",
            ".whitespace-pre-wrap",
            "[data-testid='answer']",
        ],
        "wait_after_send": 2000,
        "use_enter": True,
    },
    "kimi": {
        "name": "Kimi",
        "url": "https://www.kimi.com",
        "textarea": [
            "textarea",
            "[contenteditable='true']",
            ".input-area textarea",
        ],
        "send": [
            "button[type='submit']",
            ".send-btn",
        ],
        "response": [
            ".message-content",
            ".markdown-body",
            ".chat-message",
        ],
        "wait_after_send": 2000,
        "use_enter": True,
    },
    "qianwen": {
        "name": "通义千问",
        "url": "https://www.qianwen.com",
        "textarea": [
            "textarea",
            "[contenteditable='true']",
            "[role='textbox']",
            ".ql-editor",
            ".chat-input textarea",
        ],
        "send": [
            "button[type='submit']",
            ".send-btn",
            "button:has(svg)",
            "[aria-label*='发送']",
            "[aria-label*='send']",
        ],
        "response": [
            ".message-content",
            ".markdown-body",
            ".answer-content",
            "[data-message-author-role='assistant']",
            ".prose",
        ],
        "wait_after_send": 2000,
        "use_enter": False,
    },
}

# ── Playwright 引擎 ────────────────────────────────────


class PlaywrightEngine:
    """持久的 headless Chrome 引擎，用于自动操作 AI 平台。

    线程安全：所有 Playwright 调用在单个线程中串行执行（通过 threading.Lock），
    与 bridge_server 的 asyncio 事件循环解耦。
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._pw = None
        self._context = None
        self._page: Optional[Page] = None
        self._ready = False
        self._start_time: Optional[float] = None

    # ── 生命周期 ────────────────────────────────────────

    def start(self):
        """启动持久 Chrome 上下文（线程安全，幂等）"""
        if self._ready:
            return
        with self._lock:
            if self._ready:
                return
            try:
                self._pw = sync_playwright().start()
                self._context = self._pw.chromium.launch_persistent_context(
                    user_data_dir=CHROME_PROFILE,
                    headless=True,
                    args=[
                        "--disable-blink-features=AutomationControlled",
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-dev-shm-usage",
                    ],
                    viewport={"width": 1280, "height": 800},
                    ignore_default_args=["--enable-automation"],
                )
                pages = self._context.pages
                self._page = pages[0] if pages else self._context.new_page()
                self._ready = True
                self._start_time = time.time()
                logger.info("✅ Playwright engine ready (persistent Chrome)")
            except Exception as e:
                logger.error(f"❌ Playwright engine 启动失败: {e}")
                self._cleanup()
                raise

    def stop(self):
        """关闭 Chrome 和 Playwright"""
        with self._lock:
            self._cleanup()

    def _cleanup(self):
        try:
            if self._context:
                self._context.close()
        except Exception:
            pass
        try:
            if self._pw:
                self._pw.stop()
        except Exception:
            pass
        self._pw = None
        self._context = None
        self._page = None
        self._ready = False
        self._start_time = None

    def status(self) -> dict:
        """返回引擎状态（供 HTTP /status 使用）"""
        with self._lock:
            return {
                "ready": self._ready,
                "uptime_sec": int(time.time() - self._start_time) if self._start_time else 0,
                "profile_exists": os.path.exists(os.path.join(CHROME_PROFILE, "Default", "Cookies")),
            }

    # ── 核心 ────────────────────────────────────────────

    def execute(self, platform: str, prompt: str, timeout: int = 120) -> dict:
        """在指定 AI 平台上执行 prompt，返回结果 dict。

        返回格式与 Extension 路径一致，方便 ask_platform() 统一处理：
            {"text": "...", "platform": "...", "latency_ms": 1234, "model": "..."}
            {"error": "...", "platform": "..."}
        """
        self.start()  # 确保已启动

        cfg = PLATFORM_CONFIGS.get(platform)
        if not cfg:
            return {"error": f"❌ 未知平台: {platform}", "platform": platform}

        logger.info(f"  🎯 Engine execute [{platform}]: {prompt[:60]}...")
        start_ms = time.time() * 1000

        try:
            with self._lock:
                result = self._execute_on_page(self._page, cfg, prompt, timeout)

            if "error" not in result:
                result["latency_ms"] = int(time.time() * 1000 - start_ms)
                result["model"] = cfg["name"]
            return result

        except Exception as e:
            logger.error(f"  ❌ Engine error [{platform}]: {e}")
            # 浏览器可能崩了，尝试重启
            self._cleanup()
            return {"error": f"❌ 引擎执行失败: {e}", "platform": platform}

    def _execute_on_page(self, page: Page, cfg: dict, prompt: str, timeout: int) -> dict:
        """在已打开的页面上执行提问（持有锁时调用）"""
        platform_name = cfg["name"]

        # 1. 检查 profile 是否存在
        if not os.path.exists(os.path.join(CHROME_PROFILE, "Default", "Cookies")):
            return {
                "error": f"❌ {platform_name} 未登录\n   请先运行: web-ai --setup",
                "platform": cfg.get("url"),
            }

        # 2. 导航到目标平台
        logger.info(f"  🔍 打开 {cfg['url']} ...")
        try:
            page.goto(cfg["url"], wait_until="domcontentloaded", timeout=15000)
        except Exception as e:
            logger.warning(f"  导航超时: {e}")
        page.wait_for_timeout(2000)

        # 3. 关闭弹窗
        self._dismiss_modals(page)

        # 4. 检查登录状态
        if self._is_login_page(page):
            return {
                "error": f"❌ {platform_name} 登录已过期\n   请重新运行: web-ai --setup",
                "platform": cfg.get("url"),
            }

        # 5. 记录当前页面文本快照（用于检测新回答）
        before_text: str = page.evaluate("() => document.body.innerText")

        # 6. 找到输入框并填入
        textarea = self._find_visible(page, cfg["textarea"])
        if not textarea:
            return {"error": f"❌ 找不到 {platform_name} 输入框", "platform": cfg.get("url")}

        textarea.click()
        page.wait_for_timeout(200)
        self._fill_input(page, textarea, prompt)
        page.wait_for_timeout(500)

        # 7. 发送
        if cfg.get("use_enter", False):
            page.keyboard.press("Enter")
        else:
            send_btn = self._find_visible(page, cfg["send"])
            if send_btn:
                send_btn.click()
            else:
                page.keyboard.press("Enter")

        page.wait_for_timeout(cfg.get("wait_after_send", 2000))

        # 8. 等待并提取回答
        response = self._wait_for_response(page, before_text, cfg, timeout)
        return {"text": response, "platform": cfg.get("url")}

    # ── DOM 操作 ────────────────────────────────────────

    def _find_visible(self, page: Page, selectors: list[str]):
        """依次尝试选择器，返回第一个可见元素"""
        for sel in selectors:
            try:
                els = page.query_selector_all(sel)
                for el in els:
                    if el.is_visible():
                        return el
            except Exception:
                continue
        return None

    def _fill_input(self, page: Page, element, text: str):
        """智能填入 — 兼容 textarea / input / contenteditable"""
        tag = page.evaluate("(el) => el.tagName.toLowerCase()", element)
        if tag in ("textarea", "input"):
            element.fill(text)
        else:
            # contenteditable div
            escaped = text.replace("`", "\\`").replace("${", "\\${")
            element.evaluate(f"(el) => el.textContent = `{escaped}`")
            element.evaluate(
                "(el) => el.dispatchEvent(new Event('input', { bubbles: true }))"
            )

    def _dismiss_modals(self, page: Page):
        """关闭各种弹窗 / 欢迎页"""
        for sel in [
            "button:has-text('接受')",
            "button:has-text('同意')",
            "button:has-text('拒绝')",
            "button:has-text('关闭')",
            "button:has-text('Continue')",
            "button:has-text('Get started')",
            "button:has-text('Stay logged out')",
            "button[aria-label='Close']",
            ".modal-close-btn",
            "[data-testid='close-button']",
        ]:
            try:
                btn = page.query_selector(sel)
                if btn and btn.is_visible():
                    btn.click()
                    page.wait_for_timeout(500)
            except Exception:
                pass

    def _is_login_page(self, page: Page) -> bool:
        """检查当前页面是否处于登录状态"""
        text = page.evaluate(
            "() => document.body.innerText.slice(0, 2000).toLowerCase()"
        )
        keywords = [
            "log in", "sign in", "登录", "手机号",
            "phone number", "验证码", "请输入手机号",
        ]
        return any(k in text for k in keywords)

    def _wait_for_response(
        self, page: Page, before_text: str, cfg: dict, timeout_sec: int
    ) -> str:
        """轮询页面，等 AI 完整回答出现。

        策略：
          1. 用 response 选择器持续提取最佳文本
          2. 满足任一条件即返回：
             a) 停止按钮消失（流式完成信号）
             b) 文本连续 2 轮稳定不变（~3s 无新内容）
          3. els[-1] 拿最后一个元素，避开思考段
        """
        response_selectors = cfg.get("response", [])
        deadline = time.time() + timeout_sec
        best_text = ""
        stable_count = 0

        while time.time() < deadline:
            # ── 用 response 选择器提取 ──
            current_text = ""
            for sel in response_selectors:
                try:
                    els = page.query_selector_all(sel)
                    if els:
                        text = els[-1].text_content().strip()
                        if len(text) > 20:
                            current_text = text
                            break
                except Exception:
                    continue

            if current_text:
                if current_text == best_text:
                    stable_count += 1  # 同一文本，稳定计数+1
                else:
                    best_text = current_text
                    stable_count = 0  # 文本变化了，重置

            # ── 停止按钮消失 → 立即返回 ──
            stop_gone = page.evaluate("""() => {
                const btns = document.querySelectorAll(
                    '[class*="stop"], [aria-label*="stop"], [data-testid*="stop"], '
                    '[class*="Stop"], [aria-label*="Stop"], [class*="StopButton"]'
                );
                return Array.from(btns).every(b => b.offsetParent === null);
            }""")
            if stop_gone and best_text:
                return best_text

            # ── 文本稳定 3s 以上 → 返回（防停止按钮不消失的场景） ──
            if stable_count >= 2 and best_text:
                return best_text

            page.wait_for_timeout(1500)

        # ── 超时 → 返回最后一次匹配到的内容 ──
        return best_text if best_text else "⚠️ 超时"


# ── 单例 ────────────────────────────────────────────────
_engine: Optional[PlaywrightEngine] = None
_engine_lock = threading.Lock()


def get_engine() -> PlaywrightEngine:
    """获取全局 PlaywrightEngine 单例"""
    global _engine
    if _engine is None:
        with _engine_lock:
            if _engine is None:
                _engine = PlaywrightEngine()
    return _engine


def stop_engine():
    """全局清理"""
    global _engine
    with _engine_lock:
        if _engine:
            try:
                _engine.stop()
            except Exception:
                pass
            _engine = None
