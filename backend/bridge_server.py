#!/usr/bin/env python3
"""
Web AI Bridge Server — Chrome Extension ↔ CLI 的中继
=====================================================
- :9876 WebSocket — Extension 持久连接
- :9877 HTTP API — CLI 发 ask 请求

用法:
  python3 backend/bridge_server.py
  BRIDGE_WS_PORT=9877 BRIDGE_HTTP_PORT=9878 python3 backend/bridge_server.py
"""

import asyncio
import concurrent.futures
import json
import logging
import os
import sys
import time
import uuid
import threading
from datetime import datetime
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

import websockets

# Playwright 引擎专用单线程执行器（Sync API 不能跨线程）
_engine_executor = concurrent.futures.ThreadPoolExecutor(
    max_workers=1, thread_name_prefix="engine"
)

# ── Playwright Engine 自动降级 ────────────────────────
from bridge_engine import get_engine, stop_engine, PLATFORM_CONFIGS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("bridge")

# ── 配置 ────────────────────────────────────────────────
WS_PORT = int(os.environ.get("BRIDGE_WS_PORT", "9876"))
HTTP_PORT = int(os.environ.get("BRIDGE_HTTP_PORT", "9877"))
REQUEST_TIMEOUT = 120  # 请求超时（秒）
MAX_PENDING = 100

# ── 线程安全的状态 ─────────────────────────────────────
_state_lock = threading.Lock()
# platform -> set of websocket connections
connected_providers: dict[str, set] = {}
# req_id -> {"event": asyncio.Event, "result": dict}
pending_requests: dict[str, dict] = {}
# stream_id -> {"progress": str, "done": bool, "result": dict}
streaming_results: dict[str, dict] = {}
# prompt_fingerprint -> {"prompt": str, "platform": str, "result": dict, "timestamp": float}
# 防重提交：相同 prompt + platform 在 60s 内不重复发送
prompt_cache: dict[str, dict] = {}
PROMPT_CACHE_TTL = 60  # 秒
# ws_id -> metadata
provider_meta: dict[str, dict] = {}
_main_event_loop: asyncio.AbstractEventLoop | None = None
_start_time = time.time()


def _log(msg: str):
    logger.info(msg)


def _make_fingerprint(prompt: str, platform: str) -> str:
    """生成 prompt 指纹（归一化后取 hash）"""
    normalized = " ".join(prompt.strip().lower().split())
    return f"{platform}:::{normalized}"


def _check_dedup(prompt: str, platform: str) -> dict | None:
    """防重检查：相同 prompt+platform 在 TTL 内是否已有结果

    返回已有结果 dict 或 None（表示不重复）。
    """
    fp = _make_fingerprint(prompt, platform)
    with _state_lock:
        now = time.time()
        # 清理过期缓存
        expired = [k for k, v in prompt_cache.items() if now - v["timestamp"] > PROMPT_CACHE_TTL]
        for k in expired:
            del prompt_cache[k]
        # 检查
        entry = prompt_cache.get(fp)
        if entry and entry.get("result") and "text" in entry["result"]:
            _log(f"  🔁 防重命中: {fp[:60]}...")
            return entry["result"]
    return None


def _set_dedup(prompt: str, platform: str, result: dict):
    """记录 prompt 指纹到缓存"""
    fp = _make_fingerprint(prompt, platform)
    with _state_lock:
        prompt_cache[fp] = {"prompt": prompt, "platform": platform, "result": result, "timestamp": time.time()}


# ── WebSocket 部分 ─────────────────────────────────────

async def handle_message(websocket, message: str, ws_id: str):
    try:
        data = json.loads(message)
    except json.JSONDecodeError:
        return

    msg_type = data.get("type", "")

    if msg_type == "register":
        platforms = data.get("platforms", [])
        with _state_lock:
            for p in platforms:
                connected_providers.setdefault(p, set()).add(websocket)
            provider_meta[ws_id] = {
                "platforms": platforms, "connected_at": time.time(),
            }
        _log(f"  ✅ Extension 注册: {', '.join(platforms)} [{ws_id[:8]}]")
        await websocket.send(json.dumps({
            "type": "registered", "platforms": platforms, "serverTime": time.time(),
        }))

    elif msg_type == "response":
        req_id = data.get("id", "")
        with _state_lock:
            entry = pending_requests.get(req_id)
            if entry:
                entry["result"] = data
                entry["event"].set()
        if entry:
            _log(f"  📬 回答: req={req_id[:8]} ({len(data.get('text',''))} 字符)")

    elif msg_type in ("pong",):
        pass

    elif msg_type == "progress":
        # Extension 推送的流式进度
        stream_id = data.get("stream_id", "")
        text = data.get("text", "")
        done = data.get("done", False)
        if stream_id:
            with _state_lock:
                if stream_id in streaming_results:
                    streaming_results[stream_id]["progress"] = text
                    streaming_results[stream_id]["updated"] = True
                    if done:
                        streaming_results[stream_id]["done"] = True
                        # 防重：记录完整结果
                        prompt_text = streaming_results[stream_id].get("prompt", "")
                        platform = streaming_results[stream_id].get("platform", "")
                        if prompt_text and platform:
                            _set_dedup(prompt_text, platform, {"text": text})

    elif msg_type == "status":
        platforms = data.get("platforms", [])
        with _state_lock:
            for p in platforms:
                connected_providers.setdefault(p, set()).add(websocket)
            if ws_id in provider_meta:
                provider_meta[ws_id]["platforms"] = platforms

    elif msg_type == "ask":
        # CLI 直接连 WebSocket 提问
        asyncio.create_task(_handle_cli_ask(websocket, data, ws_id))

    elif msg_type == "ping":
        await websocket.send(json.dumps({"type": "pong"}))

    else:
        _log(f"  ⚠️ 未知消息: {msg_type}")


async def _handle_cli_ask(websocket, data: dict, ws_id: str):
    platform = data.get("platform", "")
    prompt = data.get("prompt", "")
    timeout = data.get("timeout", REQUEST_TIMEOUT)
    if not platform or not prompt:
        await websocket.send(json.dumps({"type": "error", "message": "需要 platform 和 prompt"}))
        return
    result = await ask_platform(platform, prompt, timeout)
    await websocket.send(json.dumps({"type": "response", "id": data.get("id", ""), **result}))


async def ws_handler(websocket):
    ws_id = str(uuid.uuid4())
    _log(f"🔌 新连接 [{ws_id[:8]}]")
    try:
        async for message in websocket:
            await handle_message(websocket, message, ws_id)
    except websockets.ConnectionClosed:
        pass
    except Exception as e:
        _log(f"🔌 异常 [{ws_id[:8]}]: {e}")
    finally:
        with _state_lock:
            for p in list(connected_providers.keys()):
                connected_providers[p].discard(websocket)
                if not connected_providers[p]:
                    del connected_providers[p]
            provider_meta.pop(ws_id, None)
        _log(f"  🧹 已清理 [{ws_id[:8]}]")


async def ask_platform(platform: str, prompt: str, timeout: int = REQUEST_TIMEOUT, stream_id: str = "") -> dict:
    """向 AI 平台提问。

    stream_id 不为空时，在等待过程中将 Extension 推送的进度
    实时写入 streaming_results，供 /ask/progress 端点轮询。
    """

    # ── 1. 优先 Extension ──────────────────────────────
    with _state_lock:
        providers = connected_providers.get(platform, set())
        has_provider = bool(providers)
        if has_provider:
            provider = next(iter(providers))
        else:
            provider = None

    if not has_provider and stream_id:
        # 流式模式无 Extension 连接 → 立即标记完成
        with _state_lock:
            if stream_id in streaming_results:
                streaming_results[stream_id]["progress"] = "❌ ChatGPT 未连接，请先打开 ChatGPT 页面"
                streaming_results[stream_id]["done"] = True
        return {"error": "无 Extension 连接"}

    if provider:
        req_id = str(uuid.uuid4())
        event = threading.Event()
        with _state_lock:
            now = time.time()
            expired = [k for k, v in pending_requests.items() if now - v["timestamp"] > REQUEST_TIMEOUT]
            for k in expired:
                del pending_requests[k]
            pending_requests[req_id] = {"event": event, "result": None, "timestamp": now}

        # Extension 超时：ChatGPT 通常 10-20s 才能回答完全
        ext_timeout = min(timeout, 60)
        try:
            msg = {
                "type": "execute", "id": req_id, "platform": platform,
                "prompt": prompt, "timeout": ext_timeout,
            }
            if stream_id:
                msg["stream_id"] = stream_id
            await provider.send(json.dumps(msg))

            deadline = time.time() + ext_timeout
            while not event.is_set():
                if time.time() > deadline:
                    _log(f"  ⏰ Extension {ext_timeout}s 超时，降级到引擎")
                    break
                # 如果是流式模式，实时推送进度
                if stream_id:
                    with _state_lock:
                        progress = streaming_results.get(stream_id, {})
                        if progress.get("updated", False):
                            # 标记已消费
                            streaming_results[stream_id]["updated"] = False
                await asyncio.sleep(0.2)

            result = pending_requests.get(req_id, {}).get("result", {})
            if result and result.get("text"):
                final = {
                    "id": result.get("id"), "text": result["text"],
                    "platform": result.get("platform", platform),
                    "latency_ms": result.get("latency_ms", 0),
                    "model": result.get("model", platform),
                }
                if stream_id:
                    with _state_lock:
                        if stream_id in streaming_results:
                            streaming_results[stream_id]["progress"] = result["text"]
                            streaming_results[stream_id]["done"] = True
                return final
            if result and result.get("error"):
                _log(f"  ⚠️ Extension 错误，降级到引擎: {result['error']}")
            else:
                _log("  ⚠️ Extension 无回答，降级到引擎")
        except websockets.ConnectionClosed:
            _log("  ⚠️ Extension 断开，降级到引擎")
            with _state_lock:
                connected_providers.get(platform, set()).discard(provider)
        finally:
            with _state_lock:
                pending_requests.pop(req_id, None)

    # ── 2. 降级到 Playwright Engine ────────────────────
    _log(f"  🎯 使用引擎 [{platform}] ...")
    for engine_retry in range(2):
        try:
            engine = get_engine()
            loop = asyncio.get_running_loop()
            # 单线程执行器：Playwright Sync API 绑定线程，不能跨线程
            result = await loop.run_in_executor(
                _engine_executor, engine.execute, platform, prompt, timeout
            )
            return result
        except Exception as e:
            _log(f"  ❌ 引擎失败 (第{engine_retry+1}次): {e}")
            if engine_retry == 0:
                _log("  🔄 重置引擎并重试...")
                stop_engine()
            else:
                return {"error": f"❌ 引擎错误: {e}", "platform": platform}


async def run_ws_server():
    global _main_event_loop
    _main_event_loop = asyncio.get_running_loop()
    _log(f"🚀 WebSocket Server :{WS_PORT} (Extension 接入)")
    async with websockets.serve(ws_handler, "localhost", WS_PORT,
                                 ping_interval=15, ping_timeout=10):
        await asyncio.Future()  # 永远运行


# ── HTTP 部分（单独线程）──────────────────────────────

class BridgeHTTPHandler(BaseHTTPRequestHandler):
    """简单 HTTP API，用于 CLI 查询状态/发请求"""

    def log_message(self, fmt, *args):
        _log(f"  HTTP: {fmt % args}")

    def _json_response(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode())

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/health":
            self._json_response({"status": "ok", "uptime": time.time() - _start_time})

        elif path == "/status":
            with _state_lock:
                platforms = {
                    p: {"connected": len(ps) > 0, "providers": len(ps)}
                    for p, ps in connected_providers.items()
                }
                pending = len(pending_requests)
            engine_status = {}
            try:
                engine_status = get_engine().status()
            except Exception:
                engine_status = {"ready": False, "error": "engine not available"}
            self._json_response({
                "platforms": platforms,
                "pending_requests": pending,
                "engine": engine_status,
                "uptime_sec": int(time.time() - _start_time),
                "ws_port": WS_PORT,
                "http_port": HTTP_PORT,
                "mode": "Extension + Engine（自动降级）",
            })

        elif path == "/platforms":
            with _state_lock:
                plist = list(connected_providers.keys())
            engine_platforms = list(PLATFORM_CONFIGS.keys())
            self._json_response({
                "platforms": plist,
                "extension_count": len(plist),
                "engine_available": engine_platforms,
                "engine_count": len(engine_platforms),
            })

        elif path == "/ask/progress":
            from urllib.parse import parse_qs
            params = parse_qs(parsed.query)
            stream_id = params.get("stream_id", [""])[0]
            if not stream_id:
                self._json_response({"error": "need stream_id"}, 400)
                return
            with _state_lock:
                entry = streaming_results.get(stream_id)
            if not entry:
                self._json_response({"error": "stream not found", "done": True}, 404)
                return
            self._json_response({
                "text": entry.get("progress", ""),
                "done": entry.get("done", False),
            })

        elif path == "/ask/stream" and self.command == "GET":
            from urllib.parse import parse_qs
            params = parse_qs(parsed.query)
            stream_id = params.get("stream_id", [""])[0]
            if not stream_id:
                self._json_response({"error": "need stream_id"}, 400)
                return

            # SSE: 长连接推送
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            last_len = 0
            while True:
                with _state_lock:
                    entry = streaming_results.get(stream_id)
                if not entry:
                    self._sse_send("error", "stream not found")
                    break
                text = entry.get("progress", "")
                done = entry.get("done", False)
                if len(text) > last_len:
                    chunk = text[last_len:]
                    last_len = len(text)
                    self._sse_send("message", chunk)
                if done:
                    self._sse_send("done", "")
                    break
                time.sleep(0.5)

        else:
            self._json_response({"error": "not found"}, 404)

    def _sse_send(self, event: str, data: str):
        try:
            self.wfile.write(f"event: {event}\ndata: {data}\n\n".encode("utf-8"))
            self.wfile.flush()
        except BrokenPipeError:
            pass

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path in ("/ask", "/ask/start"):
            length = int(self.headers.get("Content-Length", 0))
            if length == 0:
                self._json_response({"error": "empty body"}, 400)
                return
            body = json.loads(self.rfile.read(length))
            platform = body.get("platform", "deepseek")
            prompt = body.get("prompt", "")
            timeout = body.get("timeout", REQUEST_TIMEOUT)
            use_stream = path == "/ask/start"

            if not prompt:
                self._json_response({"error": "need prompt"}, 400)
                return

            # 防重检查
            cached = _check_dedup(prompt, platform)
            if cached:
                if use_stream:
                    stream_id = str(uuid.uuid4())
                    with _state_lock:
                        streaming_results[stream_id] = {"progress": cached.get("text", ""), "done": True}
                    self._json_response({"stream_id": stream_id, "cached": True})
                else:
                    self._json_response(cached)
                return

            if use_stream:
                # 流式：异步执行，立即返回 stream_id
                stream_id = str(uuid.uuid4())
                with _state_lock:
                    streaming_results[stream_id] = {
                        "progress": "", "done": False, "updated": False,
                        "prompt": prompt, "platform": platform,
                    }

                # 在主事件循环上调度 ask_platform
                main_loop = _main_event_loop
                if main_loop:
                    asyncio.run_coroutine_threadsafe(
                        ask_platform(platform, prompt, timeout, stream_id),
                        main_loop,
                    )
                else:
                    # 没有主循环，降级到同步
                    asyncio.run(ask_platform(platform, prompt, timeout, stream_id))

                self._json_response({"stream_id": stream_id})
                return
            else:
                # 同步等待
                result = asyncio.run(ask_platform(platform, prompt, timeout))
                if result and result.get("text"):
                    _set_dedup(prompt, platform, result)
                self._json_response(result)
                return

        self._json_response({"error": "not found"}, 404)


def run_http_server():
    server = ThreadingHTTPServer(("localhost", HTTP_PORT), BridgeHTTPHandler)
    server.timeout = 0.5  # 允许线程接收信号
    _log(f"🌐 HTTP API :{HTTP_PORT} (CLI 调用)")
    _log(f"   GET  /status     — 查看连接 + 引擎状态")
    _log(f"   GET  /platforms  — 列出可用平台")
    _log(f"   POST /ask        — 提问")
    _log(f"")
    _log(f"{'='*50}")
    _log(f"   Extension 连接 ws://localhost:{WS_PORT}  ← 快通道")
    _log(f"   Playwright 引擎自动降级                  ← 无需手动开页面")
    _log(f"   CLI 调用  http://localhost:{HTTP_PORT}/ask")
    _log(f"{'='*50}\n")
    server.serve_forever()


# ── 主入口 ────────────────────────────────────────────

def main():
    global _start_time
    _start_time = time.time()

    engine_platforms = ", ".join(PLATFORM_CONFIGS.keys())
    _log(f"🤖 Playwright 引擎加载（支持: {engine_platforms}）")
    _log(f"   💡 无需手动打开 AI 页面 — 引擎会自动降级执行")

    # 启动 HTTP 线程（等主事件循环就绪后再对外服务）
    http_ready = threading.Event()
    http_thread = threading.Thread(
        target=lambda: (http_ready.wait(), run_http_server()),
        daemon=True,
    )
    http_thread.start()

    # 启动 WebSocket（主线程 asyncio）
    async def _run_with_loop():
        global _main_event_loop
        _main_event_loop = asyncio.get_running_loop()
        http_ready.set()
        await run_ws_server()

    try:
        asyncio.run(_run_with_loop())
    except KeyboardInterrupt:
        _log("👋 关闭")
    except OSError as e:
        _log(f"❌ 端口 {WS_PORT} 被占用: {e}")
        sys.exit(1)
    finally:
        stop_engine()
        _log("🧹 引擎已清理")


if __name__ == "__main__":
    main()
