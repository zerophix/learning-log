#!/bin/bash
# Learning Log System - One-Click Deployment Script
# Usage: ./deploy.sh [target_directory]

set -e  # Exit on error

TARGET_DIR="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🚀 Learning Log System Deployment"
echo "=================================="
echo ""
echo "Target directory: $TARGET_DIR"
echo ""

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p "$TARGET_DIR/backend"
mkdir -p "$TARGET_DIR/backend/app"
mkdir -p "$TARGET_DIR/data"
mkdir -p "$TARGET_DIR/frontend"

# Copy backend files
echo "📋 Copying backend files..."
cp -r "$SCRIPT_DIR/backend/app" "$TARGET_DIR/backend/" 2>/dev/null || echo "  ⚠️  app/ not found"
cp "$SCRIPT_DIR/backend/requirements.txt" "$TARGET_DIR/backend/" 2>/dev/null || echo "  ⚠️  requirements.txt not found, will create"

# Create requirements.txt if not exists
if [ ! -f "$TARGET_DIR/backend/requirements.txt" ]; then
    echo "📝 Creating requirements.txt..."
    cat > "$TARGET_DIR/backend/requirements.txt" << 'EOF'
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.5.0
EOF
fi

# Check Python version
echo ""
echo "🐍 Checking Python version..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "  ✅ Found: $PYTHON_VERSION"
else
    echo "  ❌ Python 3 not found!"
    echo "  Please install Python 3.8+ and try again."
    exit 1
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
cd "$TARGET_DIR/backend"
pip install -r requirements.txt --quiet
echo "  ✅ Dependencies installed"

# Initialize database
echo ""
echo "🗄️  Initializing database..."
python3 -c "from app.db import init_db; init_db()"

# Start server
echo ""
echo "🌐 Starting server..."
echo "  API will be available at: http://localhost:8002"
echo "  API docs: http://localhost:8002/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd "$TARGET_DIR/backend" && python3 -m app.main
