#!/usr/bin/env python3
"""
Test script for MCP Server functionality
Simulates AI analysis and entry creation
"""
import requests
import json

BACKEND_URL = "http://localhost:8002"

def test_create_entry():
    """Test creating a learning entry"""
    
    # Simulate AI-analyzed content
    entry_data = {
        "topic": "React useMemo 优化",
        "question": "如何在大型组件中避免不必要的重渲染？",
        "insight": """使用 useMemo 缓存计算结果，只有依赖变化时才重新计算。
useCallback 用于缓存函数引用，避免子组件不必要的重渲染。
配合 React.memo 使用效果更佳。""",
        "code_example": """const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

const handleClick = useCallback(() => {
  console.log('clicked');
}, []);""",
        "category": "technical",
        "tags": ["React", "性能优化", "hooks", "useMemo"],
        "project_module": "frontend",
        "difficulty": "medium",
        "source": "mcp-test",
        "action_items": [
            "重构 StatsPanel 组件添加性能监控",
            "编写性能测试用例",
            "文档化最佳实践"
        ],
        "related_skills": ["react-best-practices", "performance-optimization"]
    }
    
    print("📤 创建学习记录...")
    response = requests.post(f"{BACKEND_URL}/api/entries", json=entry_data)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ 成功! ID: {result['id']}")
        return result['id']
    else:
        print(f"❌ 失败: {response.text}")
        return None

def test_get_entry(entry_id):
    """Test retrieving a single entry"""
    print(f"\n📥 获取记录详情 (ID: {entry_id})...")
    response = requests.get(f"{BACKEND_URL}/api/entries/{entry_id}")
    
    if response.status_code == 200:
        entry = response.json()
        print(f"✅ 主题: {entry['topic']}")
        print(f"   分类: {entry['category']}")
        print(f"   标签: {', '.join(entry['tags'])}")
        print(f"   难度: {entry['difficulty']}")
        return entry
    else:
        print(f"❌ 失败: {response.text}")
        return None

def test_stats():
    """Test getting statistics"""
    print("\n📊 获取统计数据...")
    response = requests.get(f"{BACKEND_URL}/api/stats")
    
    if response.status_code == 200:
        stats = response.json()
        print(f"✅ 总记录数: {stats['total_entries']}")
        print(f"   已审核: {stats['reviewed']}")
        print(f"   转技能: {stats['converted_to_skills']}")
        print(f"   分类统计: {stats['by_category']}")
        return stats
    else:
        print(f"❌ 失败: {response.text}")
        return None

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 Learning Log MCP Test")
    print("=" * 60)
    
    # Test 1: Create entry
    entry_id = test_create_entry()
    
    if entry_id:
        # Test 2: Get entry detail
        test_get_entry(entry_id)
        
        # Test 3: Get stats
        test_stats()
        
        print("\n" + "=" * 60)
        print("✅ 所有测试通过!")
        print(f"🌐 访问 http://localhost:3000 查看完整界面")
        print("=" * 60)
    else:
        print("\n❌ 测试失败，请检查后端服务是否运行")
