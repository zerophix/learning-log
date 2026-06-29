/**
 * Web AI Bridge — Popup UI
 */
const STATUS_DOT = document.getElementById('statusDot');
const BRIDGE_STATUS = document.getElementById('bridgeStatus');
const PLATFORM_LIST = document.getElementById('platformList');
const TAB_LIST = document.getElementById('tabList');

function updateUI(status) {
  // 桥接状态
  if (status.connected) {
    STATUS_DOT.className = 'status-dot connected';
    BRIDGE_STATUS.textContent = '✅ 已连接';
    BRIDGE_STATUS.style.color = '#22c55e';
  } else {
    STATUS_DOT.className = 'status-dot disconnected';
    BRIDGE_STATUS.textContent = status.reconnectAttempt > 0
      ? `⏳ 重连中 (第${status.reconnectAttempt}次)`
      : '❌ 未连接';
    BRIDGE_STATUS.style.color = '#ef4444';
  }

  // 平台列表
  if (status.platforms && status.platforms.length > 0) {
    PLATFORM_LIST.innerHTML = status.platforms.map(p =>
      `<span class="platform-chip active">${platformIcon(p)} ${p}</span>`
    ).join('');
  } else {
    PLATFORM_LIST.innerHTML = '<span style="color: var(--muted)">暂无 — 请打开 AI 页面</span>';
  }

  // 标签页
  if (status.tabs && status.tabs.length > 0) {
    TAB_LIST.innerHTML = status.tabs.map(t =>
      `<div style="margin-bottom: 2px">📄 ${t.platform} (tab #${t.tabId})</div>`
    ).join('');
  } else {
    TAB_LIST.innerHTML = '未检测到 AI 标签页';
  }
}

function platformIcon(name) {
  const icons = {
    deepseek: '🧠', gemini: '✦', chatgpt: '💬',
    huggingchat: '🤗', kimi: '🌙', qianwen: '🌐',
  };
  return icons[name] || '🤖';
}

// 查询状态
function refreshStatus() {
  chrome.runtime.sendMessage({ type: 'get_status' }, (status) => {
    if (chrome.runtime.lastError || !status) {
      STATUS_DOT.className = 'status-dot disconnected';
      BRIDGE_STATUS.textContent = '❌ 扩展错误';
      PLATFORM_LIST.innerHTML = '<span style="color: #ef4444">无法连接 background</span>';
      return;
    }
    updateUI(status);
  });
}

// 重连
document.getElementById('btnReconnect').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'reconnect' });
  BRIDGE_STATUS.textContent = '⏳ 正在重连...';
  BRIDGE_STATUS.style.color = '#f59e0b';
  STATUS_DOT.className = 'status-dot connecting';
  setTimeout(refreshStatus, 1500);
});

document.getElementById('btnRefresh').addEventListener('click', refreshStatus);

// 初始加载
document.addEventListener('DOMContentLoaded', refreshStatus);
