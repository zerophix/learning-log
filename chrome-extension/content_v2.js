/**
 * Web AI Bridge — Content Script
 * ================================
 * 注入到 DeepSeek/Gemini/ChatGPT 等 AI 页面。
 * 监听 background 消息，执行"打字→发送→抓取回答"操作。
 */

// ── 各平台 DOM 选择器配置 ──────────────────────────
const PLATFORM_CONFIGS = {
  'chat.deepseek.com': {
    name: 'DeepSeek',
    textarea: ['textarea[placeholder*="Ask"]', '#chat-input textarea', 'div[contenteditable="true"]', 'textarea', '[role="textbox"]'],
    send: ['button[type="submit"]', 'button:has(svg)', '.send-btn'],
    response: ['.ds-markdown', '.ds-message-content', '[data-testid="assistant-message"]', '.f6c5e9c6', '.message-content'],
    waitAfterSend: 2000,
    useEnter: true,
  },
  'gemini.google.com': {
    name: 'Gemini',
    textarea: ['textarea', '[contenteditable="true"]', '.ql-editor', '[role="textbox"]'],
    send: ['button[aria-label*="send"]', 'button[aria-label*="Send"]', 'button[type="submit"]'],
    response: ['.model-response-text', '.message-content', '[data-message-author-role="assistant"]'],
    waitAfterSend: 3000,
    useEnter: false,
  },
  'chatgpt.com': {
    name: 'ChatGPT',
    textarea: [
      '#prompt-textarea', 'textarea', 'div[contenteditable]', '[contenteditable]',
      '[role="textbox"]', 'div[role="textbox"]', 'div.ProseMirror',
      'p[class*="placeholder"]', 'form textarea', 'main textarea',
      '#__next textarea', 'section textarea',
      '[contenteditable="true"]', '[contenteditable="plaintext-only"]',
      '[class*="input"] div[contenteditable]', '[class*="chat"] div[contenteditable]',
      '[data-message-author-role="user"]',
    ],
    send: [
      'button[data-testid="send-button"]', 'button[type="submit"]',
      '[data-testid="send-button"]', 'button:has(svg):not([aria-haspopup])',
    ],
    response: ['[data-message-author-role="assistant"]', 'article', 'main > div > div > div:last-child'],
    waitAfterSend: 3000,
    useEnter: true,  // 直接 Enter 发送，不找发送按钮
  },
  'huggingface.co': {
    name: 'HuggingChat',
    textarea: ['textarea[placeholder*="Ask"]', 'textarea', '[contenteditable="true"]'],
    send: ['button[type="submit"]'],
    response: ['.prose', '.whitespace-pre-wrap', '[data-testid="answer"]'],
    waitAfterSend: 2000,
    useEnter: true,
  },
  'www.kimi.com': {
    name: 'Kimi',
    textarea: ['textarea', '[contenteditable="true"]', '.input-area textarea'],
    send: ['button[type="submit"]', '.send-btn'],
    response: ['.message-content', '.markdown-body', '.chat-message'],
    waitAfterSend: 2000,
    useEnter: true,
  },
  'doubao.com': {
    name: '豆包',
    textarea: ['textarea', '[contenteditable="true"]', '.chat-input textarea', '[role="textbox"]'],
    send: ['button[type="submit"]', '.send-btn', 'button:has(svg)'],
    response: ['.ds-markdown', '.answer-content', '.message-content', '.prose'],
    waitAfterSend: 2000,
    useEnter: true,
  },
  'www.qianwen.com': {
    name: '通义千问',
    textarea: ['textarea', '[contenteditable="true"]', '[role="textbox"]', '.ql-editor', '.chat-input textarea'],
    send: ['button[type="submit"]', '.send-btn', 'button:has(svg)', '[aria-label*="发送"]', '[aria-label*="send"]'],
    response: ['.message-content', '.markdown-body', '.answer-content', '[data-message-author-role="assistant"]', '.prose'],
    waitAfterSend: 2000,
    useEnter: false,
  },
  'qianwen.com': {
    name: '通义千问',
    textarea: ['textarea', '[contenteditable="true"]', '[role="textbox"]', '.ql-editor', '.chat-input textarea'],
    send: ['button[type="submit"]', '.send-btn', 'button:has(svg)', '[aria-label*="发送"]', '[aria-label*="send"]'],
    response: ['.message-content', '.markdown-body', '.answer-content', '[data-message-author-role="assistant"]', '.prose'],
    waitAfterSend: 2000,
    useEnter: false,
  },
};

// ── 工具函数 ───────────────────────────────────────

function getPlatform() {
  const host = window.location.hostname;
  return Object.keys(PLATFORM_CONFIGS).find(k => host.includes(k)) || null;
}

function getConfig() {
  const p = getPlatform();
  return p ? PLATFORM_CONFIGS[p] : null;
}

function findVisibleElement(selectors) {
  for (const sel of selectors) {
    const els = document.querySelectorAll(sel);
    for (const el of els) {
      if (el.offsetParent !== null && el.getBoundingClientRect().width > 20) {
        return el;
      }
    }
  }
  return null;
}

function findLastResponse() {
  const cfg = getConfig();
  if (!cfg) return '';
  // 只取最后一个匹配元素（最新回答，排除输 prompt 时的噪声）
  for (const sel of cfg.response) {
    try {
      const all = document.querySelectorAll(sel);
      if (all.length > 0) {
        // 从最后往前找，取第一个长度 > 10 的
        for (let i = all.length - 1; i >= 0; i--) {
          const t = all[i].textContent.trim();
          if (t.length > 20) return t;
        }
      }
    } catch (e) {}
  }
  return '';
}


async function waitForNewResponse(beforeSnapshot, maxWaitMs = 120000, ignoreText = '') {
  const start = Date.now();
  const beforeLen = beforeSnapshot.length;
  let bestText = '';
  let stableCount = 0;
  let lastDiffLen = 0;

  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 1000));

    const pageText = document.body.innerText;
    const textGrew = pageText.length - beforeLen;

    // ── 通道 A：选择器提取（跳过旧回答） ──
    const selText = findLastResponse();
    if (selText && selText.length > 20 && selText !== ignoreText) {
      bestText = selText;
    }

    // ── 通道 B：diff 兜底 ──
    const diff = textGrew > 0 ? pageText.slice(beforeLen).trim() : '';
    const diffLines = diff ? diff.split('\n').filter(l => l.trim().length > 10) : [];
    const cleanDiff = diffLines.filter(l => !l.includes('也可能会犯错')).join('\n');

    // 选择器没命中但 diff 足够大且有增长趋势
    if (!bestText && cleanDiff.length > 200) {
      if (Math.abs(cleanDiff.length - lastDiffLen) < 20) {
        return cleanDiff.slice(0, 10000);
      }
      lastDiffLen = cleanDiff.length;
    }

    // ── 文本稳定 3s → 返回 ──
    if (bestText) {
      if (stableCount >= 3) return bestText;
      stableCount++;
    } else if (cleanDiff.length > 200) {
      if (stableCount >= 5) return cleanDiff.slice(0, 10000);
      stableCount++;
    } else {
      stableCount = 0;
    }
  }

  // ── 超时兜底 ──
  if (bestText) return bestText;
  const pageText = document.body.innerText;
  const diff = pageText.slice(beforeLen).trim();
  const lines = diff.split('\n').filter(l => l.trim().length > 10 && !l.includes('也可能会犯错'));
  if (lines.length > 1) return lines.join('\n').slice(0, 10000);
  return '⚠️ 超时';
}

async function sendPrompt(prompt) {
  const cfg = getConfig();
  if (!cfg) {
    throw new Error('未识别的 AI 平台');
  }

  // 记住当前页面文本 + 最后回答（用于检测新回答，跳过旧回答）
  const beforeSnapshot = document.body.innerText;
  const lastKnownResponse = findLastResponse();

  // 1. 找到输入框
  let textarea = null;

  if (cfg.name === 'ChatGPT') {
    // ChatGPT 用 MutationObserver 等 ProseMirror 渲染完成
    textarea = await new Promise(resolve => {
      // 先查一次
      let el = document.querySelector('#prompt-textarea, [contenteditable], [role="textbox"]');
      if (el && el.getBoundingClientRect().width > 20) {
        try { el.click(); el.focus(); return resolve(el); } catch(e) {}
      }
      // 等 DOM 变化
      const observer = new MutationObserver(() => {
        el = document.querySelector('#prompt-textarea');
        if (el && el.getBoundingClientRect().width > 20) {
          observer.disconnect();
          try { el.click(); el.focus(); resolve(el); } catch(e) { resolve(null); }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
      // 5s 超时
      setTimeout(() => { observer.disconnect(); resolve(null); }, 5000);
    });
  } else {
    // 其他平台：轮询
    for (let retry = 0; retry < 12; retry++) {
      textarea = findVisibleElement(cfg.textarea);
      if (textarea) break;
      await new Promise(r => setTimeout(r, 300));
    }
  }

  if (!textarea) {
    const pm = document.querySelector('#prompt-textarea');
    const ce = document.querySelector('[contenteditable]');
    const pmWidth = pm ? pm.getBoundingClientRect().width.toFixed(0) : 'N/A';
    const ceWidth = ce ? ce.getBoundingClientRect().width.toFixed(0) : 'N/A';
    throw new Error(
      `找不到输入框 pm:${!!pm}(${pmWidth}) ce:${!!ce}(${ceWidth})`
    );
  }

  // 2. 聚焦 + 填入
  textarea.focus();
  textarea.click();

  // 用 execCommand 或直接赋值触发 React 等框架的响应
  const tag = textarea.tagName.toLowerCase();
  if (tag === 'textarea' || tag === 'input') {
    // 标准 textarea/input
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;
    if (nativeSetter) {
      nativeSetter.call(textarea, prompt);
    } else {
      textarea.value = prompt;
    }
  } else {
    // contenteditable div（ChatGPT ProseMirror / Gemini 等）
    // ProseMirror 需要 execCommand('insertText')，用 textContent 没用
    textarea.focus();
    // 方案 A: execCommand
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(textarea);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('insertText', false, prompt);
    // 方案 B: 直接操作 ProseMirror 内部 state（如果可用）
    if (!textarea.textContent.trim() && window.__NEXT_DATA__) {
      // 尝试通过 input 事件
      const inputEvent = new InputEvent('beforeinput', {
        inputType: 'insertText', data: prompt, bubbles: true, cancelable: true
      });
      textarea.dispatchEvent(inputEvent);
    }
    // 方案 C: 暴力设置
    if (!textarea.textContent.trim()) {
      textarea.innerHTML = `<p>${prompt}</p>`;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
  // 等 React 捕获输入事件
  await new Promise(r => setTimeout(r, 500));

  // 3. 发送
  if (cfg.useEnter) {
    textarea.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
      bubbles: true, cancelable: true,
    }));
    textarea.dispatchEvent(new KeyboardEvent('keyup', {
      key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
      bubbles: true,
    }));
  } else {
    // 点发送按钮
    const sendBtn = findVisibleElement(cfg.send);
    if (sendBtn) {
      sendBtn.click();
    } else {
      // fallback: Enter
      textarea.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
        bubbles: true, cancelable: true,
      }));
    }
  }

  await new Promise(r => setTimeout(r, cfg.waitAfterSend));

  // 4. 等待回答（跳过旧回答，确保拿到新内容）
  const response = await waitForNewResponse(beforeSnapshot, 120000, lastKnownResponse);
  return response;
}

// ── 监听 Background 消息 ───────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ping') {
    sendResponse({ alive: true, platform: getPlatform() });
    return true;
  }

  if (request.type === 'execute_prompt') {
    const prompt = request.prompt;
    const startTime = Date.now();

    sendPrompt(prompt)
      .then(text => {
        sendResponse({
          success: true,
          text: text,
          platform: getPlatform(),
          latency_ms: Date.now() - startTime,
        });
      })
      .catch(err => {
        sendResponse({
          success: false,
          error: err.message,
          platform: getPlatform(),
          latency_ms: Date.now() - startTime,
        });
      });

    return true;  // 异步响应
  }

  return false;
});

// ── 初始化报告 ─────────────────────────────────────

console.log(`🔌 Web AI Bridge v2 Content Script 已加载 [${getPlatform() || '未知平台'}]`);
console.log('📋 ChatGPT #prompt-textarea:', !!document.querySelector('#prompt-textarea'));

// 通知 background 此页面已就绪
function reportReady() {
  chrome.runtime.sendMessage({
    type: 'content_ready',
    platform: getPlatform(),
    url: window.location.href,
  }).catch(() => {});
}

reportReady();

// bfcache 恢复时重新注册
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    console.log('🔌 页面从 bfcache 恢复，重新注册');
    reportReady();
  }
});
