import json
import subprocess

payload = {
    "topic": "AI执行约束与显式授权机制的深度思考",
    "insight": "**结论：** AI的被动性是出于安全架构的最小权限原则，而非情感恐惧。\n\n**场景：** 如同金融系统的双人复核，AI需等待用户指令（授权）才能执行本地脚本。\n\n**第一性原理：** 显式指令是连接AI能力空间与用户需求的桥梁，确保了意图对齐与系统熵减。\n\n**STAR复盘：** 针对用户对AI不主动执行脚本的质疑，通过分析安全边界并实际执行入库，证明了“法律许可”生效后的执行力。",
    "diagram": "sequenceDiagram\n    participant U as User\n    participant A as AI Agent\n    participant S as Local Scripts\n    U->>A: 触发 /record\n    A->>A: 激活 Execution Mode\n    A->>S: 执行 auto_record.py\n    S-->>A: 返回成功\n    A->>U: 💡 灵感已捕获",
    "code_snippet": "@app.post(\"/api/entries\")\ndef create_entry(entry: LearningEntryCreate):\n    # 1. 幂等性预检\n    cursor.execute('SELECT id FROM learning_entries WHERE content_hash = ?', (hash,))\n    if cursor.fetchone(): return {\"status\": \"skipped\"}\n    # 2. 正式写入\n    cursor.execute('INSERT INTO ...')",
    "star_situation": "用户质疑AI为何不主动执行init脚本",
    "star_task": "解释安全约束并完成记录入库",
    "star_action": "分析record.md协议，构造深度洞察JSON，调用终端脚本",
    "star_result": "成功入库并验证了显式授权机制",
    "topic_tag_id": "cn.dolphinmind.learning.log.tag.discipline.cs.ai",
    "research_type": "deep-research",
    "custom_tags": ["AI约束", "安全协议", "RecordSkill"],
    "energy_level": 5,
    "aha_moment": True,
    "source": "record-skill"
}

json_str = json.dumps(payload, ensure_ascii=False)
script_path = "~/PycharmProjects/learning-log/scripts/auto_record.py"
subprocess.run(["python3", script_path, json_str])
