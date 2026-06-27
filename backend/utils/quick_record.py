#!/usr/bin/env python3
"""
Quick Learning Record Tool (v2.0 - Tag System)
快速记录学习内容，支持标签管理系统

用法:
    python3 quick_record.py
"""
import requests
import json
from datetime import datetime

BACKEND_URL = "http://localhost:8002"
TAG_PREFIX = "cn.dolphinmind.learning.log.tag"

def check_backend():
    """检查后端服务是否运行"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/stats", timeout=2)
        return response.status_code == 200
    except:
        return False

def get_existing_tags():
    """获取已有标签列表"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/tags", timeout=3)
        if response.status_code == 200:
            return response.json()
        return []
    except:
        return []

def display_tags(tags):
    """显示已有标签"""
    if not tags:
        print("\n⚠️  系统中暂无标签，将自动创建新标签")
        return
    
    # 按分类分组
    categories = {}
    for tag in tags:
        cat = tag.get('tag_category', 'other')
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(tag)
    
    print("\n📋 已有标签 (按分类):")
    print("="*60)
    for cat, cat_tags in sorted(categories.items()):
        print(f"\n  [{cat}]")
        for tag in cat_tags:
            print(f"    • {tag['tag_name']} ({tag['tag_id']})")
    print("="*60)

def find_or_create_tag(tag_name, tag_category, tags):
    """查找或创建标签"""
    # 先查找是否已存在
    for tag in tags:
        if tag['tag_name'].lower() == tag_name.lower() and tag['tag_category'] == tag_category:
            return tag['tag_id'], False  # 已存在
    
    # 不存在则创建
    # 生成 tag_id: cn.dolphinmind.learning.log.tag.{category}.{name}
    tag_id = f"{TAG_PREFIX}.{tag_category}.{tag_name.lower().replace(' ', '-')}"
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/tags",
            json={
                "tag_id": tag_id,
                "tag_name": tag_name,
                "tag_category": tag_category,
                "energy_level": 3
            },
            timeout=3
        )
        
        if response.status_code == 200:
            print(f"✅ 新标签已创建: {tag_name} ({tag_category})")
            return tag_id, True
        elif response.status_code == 409:
            # 标签已存在（并发情况），重新获取
            print(f"ℹ️  标签已存在: {tag_name}")
            new_tags = get_existing_tags()
            for t in new_tags:
                if t['tag_name'].lower() == tag_name.lower():
                    return t['tag_id'], False
            return tag_id, False
        else:
            print(f"⚠️  标签创建失败: {response.text}")
            return tag_id, False
    except Exception as e:
        print(f"⚠️  标签创建异常: {e}")
        return tag_id, False

def create_tag_link(source_id, target_id, link_type, description):
    """创建标签关联"""
    if not source_id or not target_id:
        return
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/tag-links",
            json={
                "source_tag_id": source_id,
                "target_tag_id": target_id,
                "link_type": link_type,
                "link_description": description
            },
            timeout=3
        )
        
        if response.status_code == 200:
            print(f"🔗 关联已创建: {link_type}")
        elif response.status_code == 409:
            print(f"ℹ️  关联已存在: {link_type}")
        else:
            print(f"⚠️  关联创建失败: {response.text}")
    except Exception as e:
        print(f"⚠️  关联创建异常: {e}")

def interactive_input():
    """交互式输入学习记录"""
    print("\n" + "="*60)
    print("📝 学习记录工具 (v2.0 - 标签系统)")
    print("="*60)
    
    # 获取已有标签
    tags = get_existing_tags()
    display_tags(tags)
    
    topic = input("\n🎯 主题 (10字内): ").strip()
    if not topic:
        print("❌ 主题不能为空")
        return None
    
    insight = input("\n💡 关键洞察 (可多行，输入空行结束):\n").strip()
    lines = [insight]
    while True:
        line = input()
        if line == "":
            break
        lines.append(line)
    insight = "\n".join(lines)
    
    # 深度内化字段
    analogy = input("\n 生活类比 (右脑记忆，可选): ").strip()
    transfer = input("🔄 可迁移模式 (通用方案，可选): ").strip()
    
    energy = input("\n⚡ 精力消耗 (1-5, 默认 3): ").strip()
    energy_level = int(energy) if energy.isdigit() and 1 <= int(energy) <= 5 else 3
    
    aha = input("✨ 有顿悟感吗? (y/n, 默认 n): ").strip().lower()
    aha_moment = (aha == 'y')
    
    # 标签选择
    print("\n🏷️  标签分类:")
    print("1. framework (框架)  2. database (数据库)  3. middleware (中间件)")
    print("4. base (基础)  5. language (语言)  6. architecture (架构)")
    print("7. tool (工具)  8. cache (缓存)  9. mq (消息队列)")
    print("10. gateway (网关)  11. security (安全)  12. monitor (监控)")
    print("13. test (测试)  14. other (其他)")
    
    cat_choice = input("\n选择分类 (数字): ").strip()
    category_map = {
        "1": "framework", "2": "database", "3": "middleware",
        "4": "base", "5": "language", "6": "architecture",
        "7": "tool", "8": "cache", "9": "mq",
        "10": "gateway", "11": "security", "12": "monitor",
        "13": "test", "14": "other"
    }
    tag_category = category_map.get(cat_choice, "other")
    
    # 主标签
    primary_tag_name = input(f"主标签名称 (如 SpringBoot): ").strip()
    if not primary_tag_name:
        primary_tag_name = topic
    
    # 关联标签
    print("\n是否有前置/关联标签? (如: 学习 SpringBoot 关联 Spring)")
    has_related = input("添加关联标签? (y/n, 默认 n): ").strip().lower()
    
    related_tag_id = None
    link_type = "related"
    
    if has_related == 'y':
        print("\n选择关联类型:")
        print("1. prerequisite (前置依赖)  2. alternative (替代方案)")
        print("3. contains (包含关系)  4. related (相关)")
        link_choice = input("选择 (1-4, 默认 4): ").strip()
        link_map = {"1": "prerequisite", "2": "alternative", "3": "contains", "4": "related"}
        link_type = link_map.get(link_choice, "related")
        
        related_tag_name = input("关联标签名称: ").strip()
        if related_tag_name:
            # 查找或创建关联标签（使用相同分类）
            related_tag_id, _ = find_or_create_tag(related_tag_name, tag_category, tags)
    
    # 创建主标签
    primary_tag_id, is_new = find_or_create_tag(primary_tag_name, tag_category, tags)
    
    # 如果有前置关系，创建标签关联
    if related_tag_id:
        if link_type == "prerequisite":
            create_tag_link(related_tag_id, primary_tag_id, "prerequisite", f"{related_tag_name} 是 {primary_tag_name} 的基础")
        elif link_type == "alternative":
            create_tag_link(primary_tag_id, related_tag_id, "alternative", f"{primary_tag_name} 与 {related_tag_name} 是替代方案")
        else:
            create_tag_link(primary_tag_id, related_tag_id, link_type, "")
    
    # 可选字段
    code_example = input("\n💻 代码示例 (可选，直接回车跳过): ").strip()
    
    diagram = input("\n📊 Mermaid 图表代码 (可选): ").strip()
    
    return {
        "topic": topic,
        "insight": insight,
        "summary": None,
        "analogy": analogy if analogy else None,
        "transfer_pattern": transfer if transfer else None,
        "energy_level": energy_level,
        "aha_moment": aha_moment,
        "code_example": code_example if code_example else None,
        "diagram": diagram if diagram else None,
        "primary_tag_id": primary_tag_id,
        "related_tag_ids": [related_tag_id] if related_tag_id else [],
        "custom_tags": [],
        "source": "manual-input",
        "confidence_rating": None
    }

def save_entry(entry_data):
    """保存学习记录"""
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/entries",
            json=entry_data,
            timeout=5
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ 保存失败: {response.text}")
            return None
    except Exception as e:
        print(f"❌ 网络错误: {e}")
        return None

def main():
    if not check_backend():
        print("❌ 后端服务未运行")
        print("请先启动: cd backend && python3 main.py")
        return
    
    entry_data = interactive_input()
    if not entry_data:
        return
    
    # 确认
    print("\n" + "="*60)
    print("确认保存？")
    print(f"📌 主题: {entry_data['topic']}")
    print(f"🏷️  主标签: {entry_data['primary_tag_id']}")
    print(f"🔗 关联标签: {len(entry_data['related_tag_ids'])} 个")
    confirm = input("\n保存? (y/n): ").strip().lower()
    
    if confirm != 'y':
        print("已取消")
        return
    
    result = save_entry(entry_data)
    
    if result:
        print("\n" + "="*60)
        print("✅ 学习记录已保存!")
        print(f"ID: {result['id']}")
        print(f"Session: {result['session_id']}")
        print(f"\n💡 访问 http://localhost:3000 查看图谱")
        print("="*60)
    else:
        print("\n❌ 保存失败")

if __name__ == "__main__":
    main()
