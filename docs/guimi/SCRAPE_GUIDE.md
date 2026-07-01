# 诡秘之主批量抓取 + /读研 自动化手册

## 一句话说明

从 sobqg.com 批量抓取《诡秘之主》全部章节到本地，然后用 `/读研` 逐章生成 Reading Agent 深度阅读记录。

---

## 目录结构

```
scripts/tools/
├── scrape_guimi.py              # 旧版 requests 版（已被反爬拦截）
├── scrape_guimi_playwright.py   # 主力脚本：Playwright 异步批量抓取
docs/
├── SCRAPE_GUIDE.md              # 本文件：操作手册
tmp/
├── guimi_chapters/              # 抓取结果：每章一个 .md 文件
├── guimi_progress.json          # 进度文件（断点续抓用）
├── guimi_scrape.log             # 抓取日志
```

---

## 环境要求

```bash
# Python 依赖（已在 venv 中）
playwright
beautifulsoup4
# Playwright 浏览器（headless Chromium）
playwright install chromium
```

---

## 第一步：批量抓取章节到本地

### 启动抓取（后台运行）

```bash
cd /Users/mingxilv/PycharmProjects/learning-log

# 全量抓取（约1430章，预计30分钟）
nohup python3 scripts/tools/scrape_guimi_playwright.py \
  "https://www.sobqg.com/read/guimizhizhu/17859645.html" \
  2000 \
  > /tmp/guimi_scrape.log 2>&1 &
echo $! > /tmp/guimi_scrape.pid
```

### 查看进度

```bash
# 实时日志
tail -f /tmp/guimi_scrape.log

# 进度摘要
cat /tmp/guimi_progress.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{d[\"total_scraped\"]} 章 | CID:{d[\"last_cid\"]} | 下一章: {d[\"next_url\"]}')"

# 已抓取文件数
ls /tmp/guimi_chapters/*.md | wc -l
```

### 停止抓取

```bash
kill $(cat /tmp/guimi_scrape.pid 2>/dev/null) 2>/dev/null
# 进度已保存在 /tmp/guimi_progress.json，下次启动可续抓
```

### 断点续抓

进度文件记录了最后抓取的 URL，脚本每次启动时读取：

```bash
# 手动修改起始点（如果想跳过节章）
# 编辑 /tmp/guimi_progress.json，修改 next_url 字段
# 然后重新启动脚本
python3 scripts/tools/scrape_guimi_playwright.py \
  "https://www.sobqg.com/read/guimizhizhu/17859701.html" \
  2000
```

### 输出格式

每章一个 Markdown 文件：
```
/tmp/guimi_chapters/0056_17859700_第六十六章_魔女教派.md
```

文件头部包含元信息：
```markdown
# 第六十六章 魔女教派

URL: https://www.sobqg.com/read/guimizhizhu/17859700.html
CID: 17859700

正文内容...
```

---

## 第二步：批量 /读研 处理

抓取完成后，用以下方式逐章执行 `/读研`：

### 手动单章（推荐调试阶段）

```bash
# 查看某一章内容
cat /tmp/guimi_chapters/0056_*.md

# 在 Claude Code 中执行
/读研 "$(cat /tmp/guimi_chapters/0056_*.md)"
```

### 批量自动处理（需另外开发）

需要写一个调用 MCP `deep_record` 工具的脚本来批量处理。核心逻辑：

```python
# 伪代码
for chapter_file in sorted(chapter_files):
    content = read(chapter_file)
    # 1. 调用 Reading Agent 生成六章节分析 + reading_trace
    # 2. 调用 deep_record 入库
    # 3. 记录处理状态到 progress
```

**注意**：批量自动处理需要解决 Context Window 限制（每章约3000-5000字，加上 trace 可能超过限制），建议每批处理5章后人工检查一次。

---

## 关键参数说明

| 参数 | 位置 | 说明 |
|------|------|------|
| 起始 URL | `scrape_guimi_playwright.py` 的 `start_url` | 第11章: `17859645.html` |
| 终点 URL | `17859645.html` 的 `next_url` 递增 | 终结页: `19706594.html` |
| 输出目录 | `OUTPUT_DIR` | `/tmp/guimi_chapters/` |
| 进度文件 | `PROGRESS_FILE` | `/tmp/guimi_progress.json` |
| 每章延迟 | `await asyncio.sleep(0.5)` | 0.5秒，可调 |
| 超时时间 | `page.goto(timeout=30000)` | 30秒/章 |

---

## 当前状态快照

```
后端运行:    否（需要时 CD backend && python3 -m uvicorn app.main:app）
MCP Server:  否（需要时 deploy/run-mcp.sh）
抓取进度:    56/1430 章完成（第11章-第66章）
抓取文件:    /tmp/guimi_chapters/ (57 files)
进度文件:    /tmp/guimi_progress.json
后台PID:     (无，需重新启动)
```

---

## 快速重启命令

```bash
# 1. 查看当前进度
cat /tmp/guimi_progress.json

# 2. 后台继续抓取
cd /Users/mingxilv/PycharmProjects/learning-log
nohup python3 scripts/tools/scrape_guimi_playwright.py \
  "$(python3 -c "import json; print(json.load(open('/tmp/guimi_progress.json'))['next_url'])")" \
  2000 \
  > /tmp/guimi_scrape.log 2>&1 &
echo $! > /tmp/guimi_scrape.pid

# 3. 监控
tail -f /tmp/guimi_scrape.log
```

---

## 与 /读研 SKILL 的配合

每抓取完一章后，可以通过以下流程用 `/读研` 处理：

```bash
# 方案 1：手动（质量最高）
/读研 "$(cat /tmp/guimi_chapters/0056_*.md)"

# 方案 2：半自动（配合 Claude Code 批量处理）
for f in $(ls /tmp/guimi_chapters/0056_*.md); do
  echo "Processing: $f"
  # 将文件内容注入 Claude Code session
done
```

---

## 故障排查

| 问题 | 解决 |
|------|------|
| SSL WRONG_VERSION_NUMBER | 已解决：使用 Playwright 浏览器代替 requests |
| 页面加载超时 | 检查网络，或增大 `page.goto(timeout=...)` |
| 内容为空 | 网站可能改版，检查 `#TextContent` 选择器是否仍然有效 |
| 进度断掉 | 读取 `/tmp/guimi_progress.json`，修改 `next_url` 后重启 |
| Context destroyed | 页面被导航销毁，确保 `extract_chapter` 是 `async` 函数 |
