#!/usr/bin/env python3
"""
诡秘之主章节抓取器
用法: python3 scrape_guimi.py <起始URL> [最大章节数]
示例: python3 scrape_guimi.py https://www.sobqg.com/read/guimizhizhu/17859645.html 5
"""
import sys
import os
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

BASE_URL = "https://www.sobqg.com"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.sobqg.com/",
}

def extract_chapter(html, url):
    soup = BeautifulSoup(html, "html.parser")
    h1 = soup.select_one("#mlfy_main_text h1")
    title = h1.get_text(strip=True) if h1 else "未知章节"
    content_div = soup.select_one("#TextContent")
    if not content_div:
        return None, None, None
    paragraphs = []
    for p in content_div.find_all("p"):
        text = p.get_text(strip=True)
        if text:
            paragraphs.append(text)
    content = "\n\n".join(paragraphs)
    next_link = soup.select_one("#nexturl")
    next_url = urljoin(BASE_URL, next_link["href"]) if next_link and next_link.get("href") else None
    return title, content, next_url

def scrape_chapter(url):
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.encoding = "utf-8"
        if resp.status_code == 200:
            return resp.text
        print(f"  [WARN] HTTP {resp.status_code} for {url}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  [ERROR] {e}", file=sys.stderr)
        return None

def save_chapter(chapter_num, title, content, output_dir):
    safe_title = title.replace("/", "_").replace(" ", "_")[:60]
    filename = f"{chapter_num:04d}_{safe_title}.md"
    filepath = os.path.join(output_dir, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(f"# {title}\n\n{content}\n")
    return filepath

def main():
    if len(sys.argv) < 2:
        print("用法: python3 scrape_guimi.py <起始URL> [最大章节数]")
        print("示例: python3 scrape_guimi.py https://www.sobqg.com/read/guimizhizhu/17859645.html 5")
        sys.exit(1)

    start_url = sys.argv[1]
    max_chapters = int(sys.argv[2]) if len(sys.argv) > 2 else 999
    output_dir = "/tmp/guimi_chapters"
    os.makedirs(output_dir, exist_ok=True)

    current_url = start_url
    chapter_num = 1
    scraped = []

    print(f"[INFO] 开始抓取: {start_url}")
    print(f"[INFO] 输出目录: {output_dir}")

    while current_url and chapter_num <= max_chapters:
        print(f"[{chapter_num}/{max_chapters}] 抓取: {current_url}")
        html = scrape_chapter(current_url)
        if not html:
            print(f"  [ERROR] 抓取失败，跳过: {current_url}", file=sys.stderr)
            break

        title, content, next_url = extract_chapter(html, current_url)
        if not content:
            print(f"  [ERROR] 内容提取失败: {current_url}", file=sys.stderr)
            break

        filepath = save_chapter(chapter_num, title, content, output_dir)
        print(f"  → 已保存: {os.path.basename(filepath)} ({len(content)} 字)")
        scraped.append({"num": chapter_num, "title": title, "file": filepath, "url": current_url})

        if not next_url:
            print(f"[INFO] 已到最后一章，共抓取 {chapter_num} 章")
            break

        current_url = next_url
        chapter_num += 1
        time.sleep(1)

    print(f"\n[INFO] 抓取完成，共 {len(scraped)} 章")
    print(f"[INFO] 文件保存在: {output_dir}")
    print(f"[INFO] 使用 /读研 逐章处理，命令示例:")
    print(f'  /读研 "$(cat {output_dir}/0001_*.md)"')
    return scraped

if __name__ == "__main__":
    main()
