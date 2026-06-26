#!/usr/bin/env python3
"""
上下文断点管理工具
用于保存和恢复对话状态，支持 /insight 中断后的快速回归
"""

import json
import os
from datetime import datetime
from typing import Optional, Dict, List

CHECKPOINT_DIR = os.path.expanduser("~/.lingma/checkpoints")
LATEST_CHECKPOINT = os.path.join(CHECKPOINT_DIR, "latest.json")
HISTORY_DIR = os.path.join(CHECKPOINT_DIR, "history")


def save_checkpoint(
    last_topic: str,
    conversation_summary: str,
    pending_questions: List[str] = None,
    semantic_anchors: List[str] = None
) -> Dict:
    """
    保存对话断点
    
    Args:
        last_topic: 最后讨论的话题
        conversation_summary: 对话摘要
        pending_questions: 待回答问题列表
        semantic_anchors: 语义锚点（关键词）
    
    Returns:
        checkpoint 对象
    """
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    os.makedirs(HISTORY_DIR, exist_ok=True)
    
    checkpoint = {
        "id": f"{int(datetime.now().timestamp())}_{os.getpid()}",
        "timestamp": datetime.now().isoformat(),
        "last_topic": last_topic,
        "conversation_summary": conversation_summary,
        "pending_questions": pending_questions or [],
        "semantic_anchors": semantic_anchors or [],
        "metadata": {
            "source": "flash-insight-interruption",
            "version": "1.0"
        }
    }
    
    # 保存到 latest.json（用于快速恢复）
    with open(LATEST_CHECKPOINT, 'w', encoding='utf-8') as f:
        json.dump(checkpoint, f, ensure_ascii=False, indent=2)
    
    # 归档到历史记录
    archive_path = os.path.join(HISTORY_DIR, f"{checkpoint['id']}.json")
    with open(archive_path, 'w', encoding='utf-8') as f:
        json.dump(checkpoint, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 断点已保存: {last_topic}")
    return checkpoint


def load_latest_checkpoint() -> Optional[Dict]:
    """
    加载最近的断点
    
    Returns:
        checkpoint 对象，如果不存在则返回 None
    """
    if not os.path.exists(LATEST_CHECKPOINT):
        return None
    
    try:
        with open(LATEST_CHECKPOINT, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"⚠️ 读取断点失败: {e}")
        return None


def clear_latest_checkpoint():
    """清除最近的断点"""
    if os.path.exists(LATEST_CHECKPOINT):
        os.remove(LATEST_CHECKPOINT)
        print("✅ 断点已清除")


def list_checkpoints(limit: int = 10) -> List[Dict]:
    """
    列出历史断点
    
    Args:
        limit: 最多返回数量
    
    Returns:
        断点列表（按时间倒序）
    """
    if not os.path.exists(HISTORY_DIR):
        return []
    
    checkpoints = []
    for filename in sorted(os.listdir(HISTORY_DIR), reverse=True)[:limit]:
        if filename.endswith('.json'):
            filepath = os.path.join(HISTORY_DIR, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    checkpoints.append(json.load(f))
            except (json.JSONDecodeError, IOError):
                continue
    
    return checkpoints


def format_checkpoint_for_display(checkpoint: Dict) -> str:
    """
    格式化断点信息用于显示
    
    Args:
        checkpoint: 断点对象
    
    Returns:
        格式化后的字符串
    """
    lines = [
        f"📍 断点信息",
        f"   话题: {checkpoint['last_topic']}",
        f"   时间: {checkpoint['timestamp']}",
        f"   摘要: {checkpoint.get('conversation_summary', 'N/A')[:100]}"
    ]
    
    if checkpoint.get('pending_questions'):
        lines.append(f"   待回答问题:")
        for q in checkpoint['pending_questions']:
            lines.append(f"     - {q}")
    
    if checkpoint.get('semantic_anchors'):
        lines.append(f"   关键词: {', '.join(checkpoint['semantic_anchors'][:5])}")
    
    return '\n'.join(lines)


def resume_conversation() -> str:
    """
    恢复对话（供 /resume skill 调用）
    
    Returns:
        恢复提示信息
    """
    checkpoint = load_latest_checkpoint()
    
    if not checkpoint:
        return "⚠️ 未找到中断记录，请手动描述想继续的话题"
    
    # 构建恢复消息
    message = f"🔄 已回归主线：{checkpoint['last_topic']}\n\n"
    
    if checkpoint.get('conversation_summary'):
        message += f"📝 上次进度：\n{checkpoint['conversation_summary']}\n\n"
    
    if checkpoint.get('pending_questions'):
        message += "💡 待回答问题：\n"
        for i, q in enumerate(checkpoint['pending_questions'], 1):
            message += f"   {i}. {q}\n"
        message += "\n是否需要先回答这些问题？\n"
    
    # 清除断点
    clear_latest_checkpoint()
    
    return message


# CLI 接口
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("用法: python3 context_manager.py <command> [args]")
        print("命令:")
        print("  save <topic> <summary>     保存断点")
        print("  load                       加载最近断点")
        print("  resume                     恢复对话")
        print("  list                       列出历史断点")
        print("  clear                      清除最近断点")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "save":
        if len(sys.argv) < 4:
            print("用法: save <topic> <summary>")
            sys.exit(1)
        topic = sys.argv[2]
        summary = sys.argv[3]
        save_checkpoint(topic, summary)
    
    elif command == "load":
        checkpoint = load_latest_checkpoint()
        if checkpoint:
            print(format_checkpoint_for_display(checkpoint))
        else:
            print("未找到断点")
    
    elif command == "resume":
        print(resume_conversation())
    
    elif command == "list":
        checkpoints = list_checkpoints()
        if checkpoints:
            for cp in checkpoints:
                print(format_checkpoint_for_display(cp))
                print("-" * 60)
        else:
            print("没有历史断点")
    
    elif command == "clear":
        clear_latest_checkpoint()
    
    else:
        print(f"未知命令: {command}")
        sys.exit(1)
