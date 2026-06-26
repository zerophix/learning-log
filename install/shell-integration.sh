# ───────────────────────────────────────────────────
# Learning Log Shell 集成
# 在 ~/.zshrc 中添加: source ~/PycharmProjects/learning-log/access/shell-integration.sh
# ───────────────────────────────────────────────────

export LEARNLOG_PROJECT_DIR="$HOME/PycharmProjects/learning-log"

# ── 快捷别名 ───────────────────────────────────────
alias ll="learnlog"
alias lls="learnlog status"
alias llf="learnlog feed -n 10"
alias llo="learnlog open"
alias llt="learnlog tags"
alias llp="learnlog prompt"

# ── 超快记录函数 ───────────────────────────────────
# 用法: llr "主题" "洞察"
llr() {
    if [ $# -eq 0 ]; then
        learnlog status
    elif [ $# -eq 1 ]; then
        learnlog record "$1" "待补充"
    else
        learnlog record "$1" "$2"
    fi
}

# ── 从剪贴板记录 ───────────────────────────────────
# 用法: llc "主题"    (macOS)
llc() {
    local topic="${1:-剪贴板导入}"
    pbpaste | learnlog pipe --topic "$topic" --source "clipboard"
    echo "📋 剪贴板内容已记录"
}

# ── 快速顿悟 ───────────────────────────────────────
# 用法: lla "一句话洞察"
lla() {
    learnlog record "$1" "$1" --energy 5 --aha true --type "deep-research"
}

echo "🧠 Learning Log 已就绪 | 命令: llr llc lla llf lls llo"
