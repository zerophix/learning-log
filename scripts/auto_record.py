"""
Auto-Record Learning Script (v6.0 - STAR 法则版)
根据 AI 提取的结构化数据，自动保存到多维标签体系数据库中。

数据格式：STAR 法则 (Situation, Task, Action, Result) + Mermaid 强制图示
"""

import requests
import json
import sys
import os

BACKEND_URL = "http://localhost:8002"

# 标签前缀映射表
TAG_PREFIXES = {
    "cs": "cn.dolphinmind.learning.log.tag.discipline.cs",
    "math": "cn.dolphinmind.learning.log.tag.discipline.math",
    "project.business": "cn.dolphinmind.learning.log.tag.project.business",
    "project.source-code": "cn.dolphinmind.learning.log.tag.project.source-code",
    "project.component": "cn.dolphinmind.learning.log.tag.project.component"
}

def ensure_tag_exists(tag_id, tag_name, category, parent_tag_id=None):
    """检查标签是否存在，不存在则创建"""
    payload = {
        "tag_id": tag_id,
        "tag_name": tag_name,
        "tag_category": category,
        "parent_tag_id": parent_tag_id
    }
    try:
        resp = requests.post(f"{BACKEND_URL}/api/tags", json=payload)
        return resp.json().get("tag_id")
    except:
        return None

def resolve_topic_tag(suggested_category):
    """将 AI 建议的分类路径解析为数据库中的 topic_tag_id"""
    if not suggested_category:
        return None
    
    parts = suggested_category.split('.')
    current_prefix = ""
    current_parent = None
    final_id = None
    
    for i, part in enumerate(parts):
        if i == 0 and part in TAG_PREFIXES:
            current_prefix = TAG_PREFIXES[part]
        else:
            current_prefix = f"{current_prefix}.{part}" if current_prefix else part
            
        tag_name = part.replace('-', ' ').title()
        category = "discipline" if suggested_category.startswith("cs") or suggested_category.startswith("math") else "topic"
        
        tid = ensure_tag_exists(current_prefix, tag_name, category, current_parent)
        if tid:
            final_id = tid
            current_parent = tid
            
    return final_id

def save_learning_record(data):
    """
    保存学习记录到后端
    
    Args:
        data (dict): 包含 STAR 字段、diagram、code_snippet、topic_tag_id 等
    """
    url = f"{BACKEND_URL}/api/entries"
    
    try:
        # 1. 标签自动映射
        if data.get('suggested_category') and not data.get('topic_tag_id'):
            data['topic_tag_id'] = resolve_topic_tag(data['suggested_category'])
            
        # 2. Mermaid 格式严格校验
        diagram = data.get('diagram')
        if diagram:
            valid_starts = ['flowchart TD', 'flowchart LR', 'sequenceDiagram', 'graph TD', 'graph LR']
            if not any(diagram.strip().startswith(s) for s in valid_starts):
                print("⚠️ Diagram 格式不符合 Mermaid 严格契约，已自动丢弃。")
                data['diagram'] = None
        else:
            print("⚠️ 未提供 Diagram，STAR 记录建议配图。")
        
        # 3. 移除旧字段，确保只传新 Schema
        data.pop('code_example', None)
        data.pop('suggested_category', None)
        
        # 4. 发送保存请求
        response = requests.post(url, json=data)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 灵感记录已保存: {data['topic']}")
            print(f"   ID: {result.get('id')}")
            print(f"   研究类型: {data.get('research_type')}")
            if data.get('project_tag_id'):
                print(f"   项目载体: {data.get('project_tag_id')}")
            return result
        else:
            print(f"❌ 保存失败: {response.status_code}")
            print(response.text)
            return None
            
    except Exception as e:
        print(f"❌ 网络错误: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) > 1:
        json_str = sys.argv[1]
    else:
        json_str = sys.stdin.read()
    
    try:
        data = json.loads(json_str)
        save_learning_record(data)
    except json.JSONDecodeError:
        print("❌ 无效的 JSON 输入")
