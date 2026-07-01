#!/usr/bin/env python3
"""
诡秘之主章节批量抓取器 (Playwright 版，绕过 SSL 反爬)
用法: python3 scrape_guimi_playwright.py <起始URL> [最大章节数]
示例: python3 scrape_guimi_playwright.py https://www.sobqg.com/read/guimizhizhu/17859645.html 1430
       (1430 是诡秘之主大约总章节数)
"""
import asyncio
import os
import sys
import time
import json
from urllib.parse import urljoin

OUTPUT_DIR = "/tmp/guimi_chapters"
PROGRESS_FILE = "/tmp/guimi_progress.json"
MAX_CHAPTERS = 2000  # 默认上限

async def extract_chapter(page):
    result = await page.evaluate("""() => {
        const title = document.querySelector('#mlfy_main_text h1')?.textContent?.trim() || '未知';
        const paragraphs = [...document.querySelectorAll('#TextContent p')]
            .map(p => p.textContent.trim())
            .filter(Boolean);
        const content = paragraphs.join('\\n\\n');
        const nextEl = document.querySelector('#nexturl');
        const nextUrl = nextEl ? nextEl.href : null;
        const cid = document.getElementById('artWrap')?.dataset?.cid || '';
        return { title, content, nextUrl, cid, length: content.length };
    }""")
    return result

async def scrape(start_url, max_count=MAX_CHAPTERS):
    from playwright.async_api import async_playwright

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 900}
        )
        page = await context.new_page()

        current_url = start_url
        chapter_num = 1
        scraped = []
        start_time = time.time()

        while current_url and chapter_num <= max_count:
            print(f"[{chapter_num}/{max_count}] 抓取: {current_url}", flush=True)
            try:
                await page.goto(current_url, wait_until="domcontentloaded", timeout=30000)
                await page.wait_for_selector("#TextContent", timeout=10000)
            except Exception as e:
                print(f"  [ERROR] 页面加载失败: {e}", flush=True)
                break

            data = await extract_chapter(page)
            title = data["title"]
            content = data["content"]
            next_url = data["nextUrl"]
            cid = data["cid"]
            length = data["length"]

            if not content or length < 50:
                print(f"  [SKIP] 反爬空页，跳过: {current_url} (CID:{cid})", flush=True)
                scraped.append({
                    "num": chapter_num,
                    "title": title or f"跳过_{cid}",
                    "cid": cid,
                    "url": current_url,
                    "file": None,
                    "next_url": next_url,
                    "length": length,
                    "skipped": True
                })
                if not next_url:
                    print(f"\n[DONE] 已是最后一章: {current_url}", flush=True)
                    break
                current_url = next_url
                chapter_num += 1
                await asyncio.sleep(1)
                continue

            safe_title = title.replace("/", "_").replace(" ", "_")[:50]
            filename = f"{chapter_num:04d}_{cid}_{safe_title}.md"
            filepath = os.path.join(OUTPUT_DIR, filename)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(f"# {title}\n\nURL: {current_url}\nCID: {cid}\n\n{content}\n")

            scraped.append({
                "num": chapter_num,
                "title": title,
                "cid": cid,
                "url": current_url,
                "file": filepath,
                "next_url": next_url,
                "length": length
            })
            print(f"  ✓ {title} ({length}字)", flush=True)

            # 保存进度
            with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
                json.dump({
                    "last_url": current_url,
                    "last_cid": cid,
                    "chapter_num": chapter_num,
                    "next_url": next_url,
                    "total_scraped": len(scraped)
                }, f, ensure_ascii=False, indent=2)

            if not next_url:
                print(f"\n[DONE] 已到最后一章: {title}", flush=True)
                break

            # 检查是否到达终结页
            next_num = next_url.split("/")[-1].replace(".html", "")
            if next_num == "19706594":
                print(f"\n[DONE] 到达终结页: {next_url}", flush=True)
                # 再抓最后一章
                current_url = next_url
                chapter_num += 1
                continue

            current_url = next_url
            chapter_num += 1
            await asyncio.sleep(0.5)

        elapsed = time.time() - start_time
        print(f"\n[SUMMARY] 共抓取 {len(scraped)} 章，耗时 {elapsed:.1f}s")
        print(f"[SUMMARY] 文件目录: {OUTPUT_DIR}")
        return scraped

    await browser.close()

def main():
    start_url = sys.argv[1] if len(sys.argv) > 1 else "https://www.sobqg.com/read/guimizhizhu/17859645.html"
    max_count = int(sys.argv[2]) if len(sys.argv) > 2 else MAX_CHAPTERS

    print(f"[START] 抓取诡秘之主全部章节")
    print(f"[START] 起始: {start_url}")
    print(f"[START] 上限: {max_count} 章")
    print(f"[START] 终结页: https://www.sobqg.com/read/guimizhizhu/19706594.html")
    print()

    results = asyncio.run(scrape(start_url, max_count))

    print(f"\n[ALL DONE] 共 {len(results)} 章")
    print(f"[ALL DONE] 进度文件: {PROGRESS_FILE}")

if __name__ == "__main__":
    main()
