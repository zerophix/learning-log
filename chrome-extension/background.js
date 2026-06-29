/**
 * Web AI Bridge — Background Service Worker
 * ===========================================
 * 连接 bridge_server (WebSocket)，管理各 AI 标签页，
 * 通过 chrome.scripting.executeScript 直接注入执行代码。
 */

// ── 配置 ────────────────────────────────────────────
const BRIDGE_URL = 'ws://localhost:9876';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_DELAY = 30000;
const KEEPALIVE_INTERVAL = 10000;

// ── 状态 ────────────────────────────────────────────
let ws = null;
let reconnectTimer = null;
let reconnectAttempt = 0;
let keepaliveTimer = null;
let registeredPlatforms = new Set();
let tabPlatformMap = new Map();
let pendingPrompts = new Map();

// ── WebSocket 连接管理 ─────────────────────────────

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  console.log(`🔌 Web AI Bridge: 连接 ${BRIDGE_URL}...`);
  try { ws = new WebSocket(BRIDGE_URL); } catch (e) { console.error('❌ 创建 WebSocket 失败:', e); scheduleReconnect(); return; }

  ws.onopen = () => {
    console.log('✅ Web AI Bridge: 已连接'); reconnectAttempt = 0;
    updateBadge('🟢'); registerPlatforms(); startKeepalive();
  };
  ws.onmessage = (event) => { try { handleBridgeMessage(JSON.parse(event.data)); } catch (e) { console.error('❌ 消息解析失败:', e); } };
  ws.onclose = () => { console.log('🔌 Web AI Bridge: 断开'); ws = null; updateBadge('🔴'); stopKeepalive(); scheduleReconnect(); };
  ws.onerror = () => {};
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  const delay = Math.min(RECONNECT_DELAY * Math.pow(1.5, reconnectAttempt), MAX_RECONNECT_DELAY);
  reconnectAttempt++;
  updateBadge('⏳');
  reconnectTimer = setTimeout(() => { reconnectTimer = null; connect(); }, delay);
}

function sendToBridge(data) { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); }

function registerPlatforms() {
  const platforms = Array.from(registeredPlatforms);
  if (platforms.length > 0) sendToBridge({ type: 'register', platforms, userAgent: navigator.userAgent });
}

function startKeepalive() { stopKeepalive(); keepaliveTimer = setInterval(() => { sendToBridge({ type: 'ping' }); sendToBridge({ type: 'status', platforms: Array.from(registeredPlatforms) }); }, KEEPALIVE_INTERVAL); }
function stopKeepalive() { if (keepaliveTimer) { clearInterval(keepaliveTimer); keepaliveTimer = null; } }

function updateBadge(text) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: text === '🟢' ? '#22c55e' : text === '🔴' ? '#ef4444' : '#f59e0b' });
}

// ── Bridge Server 消息处理 ─────────────────────────

async function handleBridgeMessage(msg) {
  switch (msg.type) {
    case 'registered':
      console.log(`✅ Bridge 注册确认: ${msg.platforms?.join(', ')}`); updateBadge('🟢'); break;
    case 'execute': {
      const { id, platform, prompt, timeout, stream_id: sid } = msg;
      console.log(`📨 执行 prompt [${platform}]: "${prompt.slice(0, 50)}..."`);
      try {
        const result = await executePrompt(platform, prompt, timeout || 120, sid);
        sendToBridge({ type: 'response', id, text: result.text, platform, latency_ms: result.latency_ms, model: result.model || platform });
      } catch (err) {
        sendToBridge({ type: 'response', id, error: err.message, platform, latency_ms: 0 });
      }
      break;
    }
    case 'ping': sendToBridge({ type: 'pong' }); break;
    default: console.log('📩 未处理消息:', msg.type);
  }
}

// ── 执行 prompt（单次 executeScript，原子操作）─────────

async function executePrompt(platform, prompt, timeoutSec = 120, streamId = '') {
  // 1. 找到标签页
  let tab = null;
  for (const [tabId, p] of tabPlatformMap) {
    if (p === platform) {
      try { tab = await chrome.tabs.get(tabId); if (tab.url?.includes(platform.split('.')[0])) break; } catch (e) { tabPlatformMap.delete(tabId); }
    }
  }
  if (!tab) {
    const tabs = await chrome.tabs.query({ url: platformMapToHostname(platform) });
    if (tabs.length > 0) { tab = tabs[0]; tabPlatformMap.set(tab.id, platform); }
  }
  if (!tab) throw new Error(`❌ ${platform} 未找到标签页`);

  const startTime = Date.now();

  // 2. 单次 executeScript：发 → 收 全部在页面内完成
  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: (txt, maxSec) => {
      // ── 在 MAIN world 原子执行 ──
      const typeAndSend = () => {
        const el = document.querySelector('#prompt-textarea');
        if (!el || el.getBoundingClientRect().width <= 10) return false;
        el.focus();
        const sel = window.getSelection(), rng = document.createRange();
        rng.selectNodeContents(el); sel.removeAllRanges(); sel.addRange(rng);
        document.execCommand('insertText', false, txt);
        if (!el.textContent.trim()) {
          try { el.innerHTML = '<p>' + txt.replace(/</g,'&lt;') + '</p>'; el.dispatchEvent(new Event('input', {bubbles:true})); } catch(e) { el.textContent = txt; }
        }
        el.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', code:'Enter', keyCode:13, bubbles:true, cancelable:true}));
        return true;
      };
      // 等输入框（4s 超时）
      const waitInput = () => new Promise(r => {
        if (typeAndSend()) return r(true);
        let n = 0; const iv = setInterval(() => { n++; if (typeAndSend() || n >= 10) { clearInterval(iv); r(typeAndSend()); } }, 400);
      });
      // 轮询回答
      const pollResp = (beforeCount, deadline) => new Promise(r => {
        let best = '', stable = 0;
        const poll = () => {
          if (Date.now() > deadline) return r(best || '');
          const count = document.querySelectorAll('[data-message-author-role="assistant"]').length;
          const asst = document.querySelectorAll('[data-message-author-role="assistant"]');
          const text = asst.length ? asst[asst.length - 1].textContent.trim() : '';
          const stop = document.querySelector('[class*="stop"],[data-testid*="stop"]');
          const stopGone = !stop || stop.offsetParent === null;
          if (count > beforeCount && text.length > 20) {
            if (text !== best) { best = text; stable = 0; } else { stable++; }
            const sk = '__wab_p_' + Date.now();
            try { sessionStorage.setItem(sk, JSON.stringify({text: best, done: stopGone || stable >= 2})); } catch(e) {}
            if (best && (stopGone || stable >= 2)) return r(best);
          }
          setTimeout(poll, 300);
        }; poll();
      });
      return waitInput().then(found => {
        if (!found) return '{"error":"找不到ChatGPT输入框"}';
        const bc = document.querySelectorAll('[data-message-author-role="assistant"]').length;
        return pollResp(bc, Date.now() + maxSec * 1000).then(text => {
          if (text) return JSON.stringify({text});
          return '{"error":"超时"}';
        });
      });
    },
    args: [prompt, Math.min(timeoutSec, 90)],
  });

  const data = JSON.parse(result?.result || '{}');
  if (data.error) throw new Error(data.error);

  // 预聚焦 + 返回
  warmupTab(tab.id).catch(() => {});
  return { text: data.text || '', latency_ms: Date.now() - startTime, model: platform };
}


// ── Tab 温保 ─────────────────────────────────────────

async function warmupTab(tabId) {
  try { await chrome.scripting.executeScript({ target: { tabId }, world: "MAIN", func: () => { const el = document.querySelector('#prompt-textarea'); if (el) { el.focus(); return true; } return false; } }); } catch(e) {}
}

// 每 30s 保活
setInterval(() => {
  for (const [tabId, platform] of tabPlatformMap) {
    if (platform === 'chatgpt') warmupTab(tabId).catch(() => tabPlatformMap.delete(tabId));
  }
}, 30000);

function platformMapToHostname(platform) {
  const map = { 'deepseek': '*://chat.deepseek.com/*', 'gemini': '*://gemini.google.com/*', 'chatgpt': '*://chatgpt.com/*', 'huggingchat': '*://huggingface.co/chat/*', 'kimi': '*://www.kimi.com/*', 'qianwen': '*://www.qianwen.com/*' };
  return map[platform] || `*://${platform}/*`;
}

// ── 标签页管理 ─────────────────────────────────────

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    for (const [host, name] of Object.entries(PLATFORM_HOSTS)) {
      if (tab.url.includes(host)) { tabPlatformMap.set(tabId, name); registeredPlatforms.add(name); registerPlatforms(); console.log(`📌 检测到 ${name} 标签页 [${tabId}]`); break; }
    }
  }
});
chrome.tabs.onRemoved.addListener((tabId) => { const platform = tabPlatformMap.get(tabId); if (platform) { tabPlatformMap.delete(tabId); checkPlatformAvailability(platform); } });

async function checkPlatformAvailability(platform) {
  const tabs = await chrome.tabs.query({ url: platformMapToHostname(platform) });
  if (tabs.length === 0) { registeredPlatforms.delete(platform); registerPlatforms(); console.log(`📭 ${platform} 无可用标签页`); }
}

const PLATFORM_HOSTS = { 'chat.deepseek.com': 'deepseek', 'gemini.google.com': 'gemini', 'chatgpt.com': 'chatgpt', 'huggingface.co': 'huggingchat', 'www.kimi.com': 'kimi', 'doubao.com': 'doubao', 'www.qianwen.com': 'qianwen', 'qianwen.com': 'qianwen' };

// ── 初始化 ─────────────────────────────────────────

connect();
chrome.storage.local.get(['platforms'], (result) => { if (result.platforms) result.platforms.forEach(p => registeredPlatforms.add(p)); });
chrome.tabs.query({}, (tabs) => {
  for (const tab of tabs) {
    if (!tab.url) continue;
    for (const [host, name] of Object.entries(PLATFORM_HOSTS)) { if (tab.url.includes(host)) { tabPlatformMap.set(tab.id, name); registeredPlatforms.add(name); break; } }
  }
  if (registeredPlatforms.size > 0) registerPlatforms();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'get_status') { sendResponse({ connected: ws?.readyState === WebSocket.OPEN, platforms: Array.from(registeredPlatforms), tabs: Array.from(tabPlatformMap.entries()).map(([id, p]) => ({ tabId: id, platform: p })), reconnectAttempt }); return true; }
  if (request.type === 'reconnect') { if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; } reconnectAttempt = 0; connect(); sendResponse({ reconnecting: true }); return true; }
  return false;
});

console.log('🔌 Web AI Bridge Background 已启动');
