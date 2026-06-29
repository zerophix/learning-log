/**
 * Chrome Setup Helper — one-time login to AI platforms
 * ======================================================
 * 被 web-ai --setup 调用。启动可见 Chrome，让用户登录各 AI 平台。
 * 登录态保存在 profile 中，后续自动复用。
 */
const CHROME_PROFILE = '/tmp/web-ai-chrome-profile';
const EXTENSION_PATH = '/Users/mingxilv/PycharmProjects/learning-log/chrome-extension';
const AI_SITES = [
  'https://chat.deepseek.com',
  'https://huggingface.co/chat',
];

console.log('\n🔐 Web AI Bridge — 一次性登录设置');
console.log('='.repeat(50));
console.log('即将打开 Chrome，请登录以下 AI 平台：');
AI_SITES.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
console.log('\n⚠️  登录完成后，关闭浏览器即可保存会话');
console.log('='.repeat(50));
