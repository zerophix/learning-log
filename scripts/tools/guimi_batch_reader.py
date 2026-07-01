#!/usr/bin/env python3
"""
guimi_batch_reader.py — 批次阅读处理器
========================================
用法:
  # 查看待处理队列
  python3 guimi_batch_reader.py queue

  # 处理 n 章（默认 5 章）
  python3 guimi_batch_reader.py process [n]

  # 处理单章（直接指定文件）
  python3 guimi_batch_reader.py once /tmp/guimi_chapters/0003_17859647_第十三章_值夜者.md

  # 标记某 CID 已完成
  python3 guimi_batch_reader.py mark <cid>

  # 重置已处理记录
  python3 guimi_batch_reader.py reset

状态文件: /tmp/guimi_pipeline_state.json  (process.last_processed_cid)
章节目录: /tmp/guimi_chapters/
"""
import json, os, sys, re, time, hashlib, urllib.request, urllib.error
from pathlib import Path
from datetime import datetime

BASE = Path("/tmp")
STATE_FILE = BASE / "guimi_pipeline_state.json"
CHAPTER_DIR = BASE / "guimi_chapters"
API_BASE = os.getenv("LL_API_BASE", "http://localhost:8002")
START_CID = 17859645

# ── state helpers ──────────────────────────────────────────

def load_state():
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except Exception:
            pass
    return {"scrape": {}, "process": {"last_processed_cid": None, "total_processed": 0, "failed": []}, "meta": {}}

def save_state(state):
    state.setdefault("meta", {})["last_updated"] = datetime.now().isoformat()
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2))

def cid_of(path: Path) -> int:
    m = re.search(r"(\d{8})_", path.name)
    return int(m.group(1)) if m else 0

def chapter_num_of(path: Path) -> str:
    return path.stem.split("_")[0]

def title_of(path: Path) -> str:
    parts = path.stem.split("_", 2)
    return parts[2] if len(parts) == 3 else path.stem

def sorted_chapters():
    files = [(cid_of(p), p) for p in CHAPTER_DIR.glob("*.md") if cid_of(p) > 0]
    files.sort(key=lambda x: x[0])
    return files

# ── completion tracking ────────────────────────────────────
# Uses a separate completion log so we can skip already-done entries
COMPLETE_FILE = BASE / "guimi_completed.json"

def load_completed():
    if COMPLETE_FILE.exists():
        try:
            return set(json.loads(COMPLETE_FILE.read_text()))
        except Exception:
            return set()
    return set()

def save_completed(completed: set):
    COMPLETE_FILE.write_text(json.dumps(sorted(completed), ensure_ascii=False))

def mark_done(cid: int):
    c = load_completed()
    c.add(str(cid))
    save_completed(c)
    state = load_state()
    state["process"]["last_processed_cid"] = cid
    state["process"]["total_processed"] = state["process"].get("total_processed", 0) + 1
    save_state(state)

# ── REST API ───────────────────────────────────────────────

from quality_gate import (
    check_sections as _qg_check,
    validate as _qg_validate,
    enforce_sections as _qg_enforce,
    can_auto_repair as _qg_can_repair,
    type_report as _qg_report,
    SECTION_REQUIREMENTS,
    DEFAULT_TYPE,
)
ALL_SECTIONS = list(SECTION_REQUIREMENTS[DEFAULT_TYPE]["required"]) + list(SECTION_REQUIREMENTS[DEFAULT_TYPE]["optional"])
REQUIRED_SECTIONS = set(SECTION_REQUIREMENTS[DEFAULT_TYPE]["required"])

def check_sections(insight: str) -> dict:
    return _qg_check(insight, research_type=DEFAULT_TYPE)

def enforce_sections(insight: str, title: str) -> str:
    return _qg_enforce(insight, title=title, research_type=DEFAULT_TYPE)

def validate_before_post(insight: str, title: str) -> tuple:
    return _qg_validate(insight, research_type=DEFAULT_TYPE)

def repair_and_post(topic: str, raw_insight: str, energy: int = 5, source: str = "deep-record", aha: bool = False) -> dict:
    repaired = enforce_sections(raw_insight, topic)
    check = check_sections(repaired)
    still_missing_required = check["missing_required"]
    if still_missing_required:
        raise RuntimeError(f"repair hook 无法补全必选章节 {still_missing_required}，人工干预")
    patch = {
        "⚠️ 已自动补注": True,
        "🔄 原始字数": len(raw_insight),
        "✅ 修复后字数": len(repaired),
    }
    return create_entry_via_api(topic, repaired, energy, source, aha, patch)


def create_entry_via_api(
    topic: str,
    insight: str,
    energy: int = 5,
    source: str = "deep-record",
    aha: bool = False,
    _patch: dict = None,
) -> dict:
    payload = json.dumps({
        "topic": topic,
        "insight": insight,
        "energy_level": energy,
        "source": source,
        "aha_moment": aha,
        "research_type": "deep-research",
        "custom_tags": ["novel-reading", "诡秘之主", "reading-trace"],
        "project_tag_id": "learning.log.project.guimi",
        "_quality_patch": _patch or {},
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{API_BASE}/api/entries",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        raise RuntimeError(f"API {e.code}: {body}")
    except Exception as e:
        raise RuntimeError(f"API error: {e}")

# ── queue display ──────────────────────────────────────────

def print_queue():
    done = load_completed()
    files = sorted_chapters()
    pending = [(cid, p) for cid, p in files if str(cid) not in done]
    total = len(files)
    print(f"\n{'='*60}")
    print(f"📚 诡秘之主 阅读处理队列")
    print(f"{'='*60}")
    print(f"已落盘: {total} 章 | 已完成: {len(done)} 章 | 待处理: {len(pending)} 章")
    print()
    for cid, p in pending[:20]:
        num = chapter_num_of(p)
        title = title_of(p)
        print(f"  ⏳ CID {cid} [{num}] {title}")
    if len(pending) > 20:
        print(f"  ... 还有 {len(pending)-20} 章")
    print(f"\nRun: python3 guimi_batch_reader.py process [N]")

# ── process n chapters ─────────────────────────────────────

def process_batch(n: int = 5):
    done = load_completed()
    files = sorted_chapters()
    pending = [(cid, p) for cid, p in files if str(cid) not in done]

    if not pending:
        print("✅ 所有章节已处理完毕")
        return

    batch = pending[:n]
    print(f"\n{'='*60}")
    print(f"🤖 处理批次（共 {len(batch)} 章）")
    print(f"{'='*60}\n")

    success = 0
    failed = 0
    for cid, path in batch:
        num = chapter_num_of(path)
        title = title_of(path)
        print(f"[{num}] {title} (CID:{cid}) ... ", end="", flush=True)

        content = path.read_text(encoding="utf-8")
        lines = [l for l in content.split("\n")
                 if not l.startswith("URL:") and not l.startswith("CID:") and l.strip()]
        chapter_text = "\n".join(lines).strip()

        topic = f"Novel Reading Trace: 诡秘之主 {num} {title}"
        insight = chapter_text[:8000]

    try:
        _result = None  # placeholder for repaired result
        check = check_sections(insight)
        if not check["all_present"]:
            missing_all = check["missing_required"] + check["missing_optional"]
            print(f"⚠️ 入库缺节 {missing_all}，", end="")
            if check["missing_required"]:
                print(f"必选节 {check['missing_required']} 缺失，无法自动修复，跳过")
                raise ValueError(f"缺失必选节: {check['missing_required']}")
            print("可修复，尝试自动修复...")
            _result = repair_and_post(topic, insight, energy, source, aha)
            mark_done(cid)
            success += 1
            print(f"🔧 修复+入库完成，ID={_result['id']}")
        else:
            _result = create_entry_via_api(topic, insight, energy, source, aha)
            mark_done(cid)
            success += 1
            print(f"✅ ID={_result['id']} (校验通过)")
        time.sleep(0.3)
    except ValueError as ve:
        print(f"❌ 入库拦截: {ve}")
        failed += 1
        state = load_state()
        state["process"].setdefault("failed", []).append({"cid": cid, "error": str(ve)})
        save_state(state)
    except RuntimeError as re_err:
        print(f"❌ 修复失败: {re_err}，请人工修正")
        failed += 1
        state = load_state()
        state["process"].setdefault("failed", []).append({"cid": cid, "error": str(re_err)})
        save_state(state)
    except Exception as e:
        print(f"❌ {e}")
        failed += 1
        state = load_state()
        state["process"].setdefault("failed", []).append({"cid": cid, "error": str(e)})
        save_state(state)

    print(f"\n{'='*60}")
    print(f"完成: {success} 成功, {failed} 失败, 总计 {len(pending)} 待处理")
    print(f"{'='*60}")

# ── once (single file) ────────────────────────────────────

def process_once(path_str: str):
    path = Path(path_str)
    cid = cid_of(path)
    num = chapter_num_of(path)
    title = title_of(path)
    content = path.read_text(encoding="utf-8")
    lines = [l for l in content.split("\n")
             if not l.startswith("URL:") and not l.startswith("CID:") and l.strip()]
    chapter_text = "\n".join(lines).strip()
    topic = f"Novel Reading Trace: 诡秘之主 {num} {title}"
    result = create_entry_via_api(topic, chapter_text)
    mark_done(cid)
    print(f"✅ [{num}] ID={result['id']} CID={cid}")
    return result

# ── mark/force ─────────────────────────────────────────────

def mark_cmd(cid_str: str):
    cid = int(cid_str)
    mark_done(cid)
    print(f"✅ CID {cid} 已标记完成")

def reset_cmd():
    for f in [STATE_FILE, COMPLETE_FILE]:
        if f.exists():
            f.unlink()
    print("✅ 已重置所有进度")

# ── main ───────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1].lower()
    if cmd == "queue":
        print_queue()
    elif cmd == "process":
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 5
        process_batch(n)
    elif cmd == "once":
        if len(sys.argv) < 3:
            print("用法: guimi_batch_reader.py once <chapter_file>")
            sys.exit(1)
        process_once(sys.argv[2])
    elif cmd == "mark":
        mark_cmd(sys.argv[2])
    elif cmd == "reset":
        reset_cmd()
    else:
        print(f"未知命令: {cmd}")
        print(__doc__)

if __name__ == "__main__":
    main()
