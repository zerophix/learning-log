/**
 * Web AI Bridge — Background Service Worker
 * ===========================================
 * 连接 bridge_server (WebSocket)，管理各 AI 标签页，
 * 在 Content Script ↔ Bridge Server 之间中转消息。
 */

// ── 配置 ────────────────────────────────────────────
const BRIDGE_URL = 'ws://localhost:9876';
const RECONNECT_DELAY = 3000;   // 重连间隔
const MAX_RECONNECT_DELAY = 30000;
const KEEPALIVE_INTERVAL = 10000;

// ── 状态 ────────────────────────────────────────────
let ws = null;
let reconnectTimer = null;
let reconnectAttempt = 0;
let keepaliveTimer = null;
let registeredPlatforms = new Set();
let tabPlatformMap = new Map();   // tabId -> platform
let pendingPrompts = new Map();   // msgId -> {resolve, reject, timeout}

// ── WebSocket 连接管理 ─────────────────────────────

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  console.log(`🔌 Web AI Bridge: 连接 ${BRIDGE_URL}...`);

  try {
    ws = new WebSocket(BRIDGE_URL);
  } catch (e) {
    console.error('❌ 创建 WebSocket 失败:', e);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    console.log('✅ Web AI Bridge: 已连接');
    reconnectAttempt = 0;
    updateBadge('🟢');
    registerPlatforms();
    startKeepalive();
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleBridgeMessage(msg);
    } catch (e) {
      console.error('❌ 消息解析失败:', e);
    }
  };

  ws.onclose = (event) => {
    console.log(`🔌 Web AI Bridge: 断开 (code=${event.code})`);
    ws = null;
    updateBadge('🔴');
    stopKeepalive();
    scheduleReconnect();
  };

  ws.onerror = (error) => {
    console.error('❌ Web AI Bridge 错误:', error);
    // onclose 会被自动触发
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  const delay = Math.min(
    RECONNECT_DELAY * Math.pow(1.5, reconnectAttempt),
    MAX_RECONNECT_DELAY
  );
  reconnectAttempt++;
  console.log(`⏳ ${reconnectAttempt} 次重连, 等待 ${delay}ms...`);
  updateBadge('⏳');
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

function sendToBridge(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function registerPlatforms() {
  const platforms = Array.from(registeredPlatforms);
  if (platforms.length > 0) {
    sendToBridge({
      type: 'register',
      platforms: platforms,
      userAgent: navigator.userAgent,
    });
  }
}

function startKeepalive() {
  stopKeepalive();
  keepaliveTimer = setInterval(() => {
    sendToBridge({ type: 'ping' });
    // 同时上报当前平台状态
    sendToBridge({
      type: 'status',
      platforms: Array.from(registeredPlatforms),
    });
  }, KEEPALIVE_INTERVAL);
}

function stopKeepalive() {
  if (keepaliveTimer) {
    clearInterval(keepaliveTimer);
    keepaliveTimer = null;
  }
}

function updateBadge(text) {
  chrome.action.setBadgeText({ text });
  const color = text === '🟢' ? '#22c55e' : text === '🔴' ? '#ef4444' : '#f59e0b';
  chrome.action.setBadgeBackgroundColor({ color });
}

// ── Bridge Server 消息处理 ─────────────────────────

async function handleBridgeMessage(msg) {
  switch (msg.type) {
    case 'registered':
      console.log(`✅ Bridge 注册确认: ${msg.platforms?.join(', ')}`);
      updateBadge('🟢');
      break;

    case 'execute': {
      // 收到执行 prompt 的指令
      const { id, platform, prompt, timeout, stream_id: extStreamId } = msg;
      console.log(`📨 执行 prompt [${platform}]: "${prompt.slice(0, 50)}..."`);

      try {
        const result = await executePrompt(platform, prompt, timeout || 120, extStreamId);
        sendToBridge({
          type: 'response',
          id: id,
          text: result.text,
          platform: platform,
          latency_ms: result.latency_ms,
          model: result.model || platform,
        });
      } catch (err) {
        sendToBridge({
          type: 'response',
          id: id,
          error: err.message,
          platform: platform,
          latency_ms: 0,
        });
      }
      break;
    }

    case 'ping':
      sendToBridge({ type: 'pong' });
      break;

    default:
      console.log('📩 未处理消息:', msg.type);
  }
}

// ── 在 AI 页面上执行 prompt ────────────────────────

async function executePrompt(platform, prompt, timeoutSec = 120, streamId = '') {
  // 1. 找到对应 platform 的标签页
  let tab = null;
  for (const [tabId, p] of tabPlatformMap) {
    if (p === platform) {
      try {
        tab = await chrome.tabs.get(tabId);
        if (tab.url && tab.url.includes(platform.split('.')[0])) { break; }
      } catch (e) { tabPlatformMap.delete(tabId); }
    }
  }
  if (!tab) {
    const hostname = platformMapToHostname(platform);
    const tabs = await chrome.tabs.query({ url: hostname });
    if (tabs.length > 0) { tab = tabs[0]; tabPlatformMap.set(tab.id, platform); }
  }
  if (!tab) {
    throw new Error(`❌ ${platform} 未找到标签页`);
  }

  const startTime = Date.now();

  // 2. Phase 1: 注入 prompt 并发送
  let textareaFound = false;
  try {
    const [r] = await chrome.scripting.executeScript({
      target: { tabId: tab.id }, world: "MAIN",
      func: (txt) => {
        const findAndSend = () => {
          const el = document.querySelector('#prompt-textarea');
          if (!el || el.getBoundingClientRect().width <= 10) return false;
          el.focus();
          const s = window.getSelection(), r = document.createRange();
          r.selectNodeContents(el); s.removeAllRanges(); s.addRange(r);
          document.execCommand('insertText', false, txt);
          if (!el.textContent.trim()) {
            try {
              el.innerHTML = '<p>' + txt.replace(/</g,'&lt;') + '</p>';
              el.dispatchEvent(new Event('input', {bubbles:true}));
            } catch(e) { el.textContent = txt; }
          }
          el.dispatchEvent(new KeyboardEvent('keydown', {
            key:'Enter', code:'Enter', keyCode:13, bubbles:true, cancelable:true
          }));
          return true;
        };
        // 重试 10s 找输入框
        return new Promise(res => {
          if (findAndSend()) return res(true);
          let n = 0; const iv = setInterval(() => {
            n++;
            if (findAndSend() || n > 25) { clearInterval(iv); res(findAndSend()); }
          }, 400);
        });
      },
      args: [prompt],
    });
    textareaFound = r?.result === true;
  } catch (e) {
    console.log('Phase 1 注入失败:', e.message);
  }

  if (!textareaFound) throw new Error('找不到 ChatGPT 输入框');

  // 3. Phase 2: 轮询回答 + WS 进度推送
  const deadline = Date.now() + Math.min(timeoutSec, 90) * 1000;
  let bestText = '', stableCount = 0, lastText = '';

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 800));

    // 读取页面最新回答
    let currentText = '';
    try {
      const [r] = await chrome.scripting.executeScript({
        target: { tabId: tab.id }, world: "MAIN",
        func: () => {
          const asst = document.querySelectorAll('[data-message-author-role="assistant"]');
          const t = asst.length ? asst[asst.length - 1].textContent.trim() : '';
          const stop = document.querySelector('[class*="stop"],[data-testid*="stop"]');
          const bodyNow = document.body.innerText.length;
          const stopGone = !stop || stop.offsetParent === null;
          return JSON.stringify({ text: t, stopGone, bodyLen: bodyNow });
        },
      });
      if (r?.result) {
        const { text, stopGone } = JSON.parse(r.result);
        currentText = text || '';
        // 文本有实质性增长才更新
        if (currentText.length > 50) {
          if (currentText !== bestText) {
            bestText = currentText;
            stableCount = 0;
            // 推送进度到 bridge
            if (streamId && currentText !== lastText) {
              lastText = currentText;
              sendToBridge({ type: 'progress', stream_id: streamId, text: currentText, done: false });
            }
          } else {
            stableCount++;
          }
          // 完成条件：停止按钮消失 或 文本稳定 3s+
          if ((stopGone || stableCount >= 4) && bestText) {
            if (streamId) {
              sendToBridge({ type: 'progress', stream_id: streamId, text: bestText, done: true });
            }
            return {
              text: bestText,
              latency_ms: Date.now() - startTime,
              model: platform,
            };
          }
        }
      }
    } catch (e) {
      console.log('Phase 2 轮询错误:', e.message);
    }
  }

  // 超时兜底
  if (bestText) {
    if (streamId) sendToBridge({ type: 'progress', stream_id: streamId, text: bestText, done: true });
    return { text: bestText, latency_ms: Date.now() - startTime, model: platform };
  }
  throw new Error(`⏰ ${platform} 回答超时`);
}

function platformMapToHostname(platform) {
  const map = {
    'deepseek': '*://chat.deepseek.com/*',
    'gemini': '*://gemini.google.com/*',
    'chatgpt': '*://chatgpt.com/*',
    'huggingchat': '*://huggingface.co/chat/*',
    'kimi': '*://www.kimi.com/*',
    'qianwen': '*://www.qianwen.com/*',
  };
  return map[platform] || `*://${platform}/*`;
}

// ── 标签页管理 ─────────────────────────────────────

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 识别 AI 平台
    for (const [host, name] of Object.entries(PLATFORM_HOSTS)) {
      if (tab.url.includes(host)) {
        tabPlatformMap.set(tabId, name);
        registeredPlatforms.add(name);
        registerPlatforms();
        console.log(`📌 检测到 ${name} 标签页 [${tabId}]`);
        break;
      }
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const platform = tabPlatformMap.get(tabId);
  if (platform) {
    tabPlatformMap.delete(tabId);
    // 检查是否还有其他标签页提供此平台
    checkPlatformAvailability(platform);
  }
});

async function checkPlatformAvailability(platform) {
  const hostname = platformMapToHostname(platform);
  const tabs = await chrome.tabs.query({ url: hostname });
  if (tabs.length === 0) {
    registeredPlatforms.delete(platform);
    registerPlatforms();
    console.log(`📭 ${platform} 无可用标签页`);
  }
}

const PLATFORM_HOSTS = {
  'chat.deepseek.com': 'deepseek',
  'gemini.google.com': 'gemini',
  'chatgpt.com': 'chatgpt',
  'huggingface.co': 'huggingchat',
  'www.kimi.com': 'kimi',
  'doubao.com': 'doubao',
'www.qianwen.com': 'qianwen',
  'qianwen.com': 'qianwen',
};

// ── 初始化 ─────────────────────────────────────────

// 启动时连接
connect();

// 从 storage 恢复上次的平台列表
chrome.storage.local.get(['platforms'], (result) => {
  if (result.platforms) {
    result.platforms.forEach(p => registeredPlatforms.add(p));
  }
});

// 查找已有的 AI 标签页
chrome.tabs.query({}, (tabs) => {
  for (const tab of tabs) {
    if (!tab.url) continue;
    for (const [host, name] of Object.entries(PLATFORM_HOSTS)) {
      if (tab.url.includes(host)) {
        tabPlatformMap.set(tab.id, name);
        registeredPlatforms.add(name);
        break;
      }
    }
  }
  if (registeredPlatforms.size > 0) {
    registerPlatforms();
  }
});

// 监听来自 popup 的状态查询
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'get_status') {
    sendResponse({
      connected: ws?.readyState === WebSocket.OPEN,
      platforms: Array.from(registeredPlatforms),
      tabs: Array.from(tabPlatformMap.entries()).map(([id, p]) => ({ tabId: id, platform: p })),
      reconnectAttempt,
    });
    return true;
  }
  if (request.type === 'reconnect') {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    reconnectAttempt = 0;
    connect();
    sendResponse({ reconnecting: true });
    return true;
  }
  return false;
});

console.log('🔌 Web AI Bridge Background 已启动');
