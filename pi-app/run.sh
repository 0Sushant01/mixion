#!/bin/bash

set -e  # Exit immediately on any error

echo "🚀 Starting Mixion Pi App..."

# ── Step 1: Create venv if not exists ────────────────────────────────────────
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# ── Step 2: Activate venv ────────────────────────────────────────────────────
echo "⚡ Activating virtual environment..."
source venv/bin/activate

# ── Step 3: Install dependencies ─────────────────────────────────────────────
echo "📥 Installing requirements..."
pip install --upgrade pip -q
pip install -r requirements.txt -q

# ── Step 4: Safe Database Migration ──────────────────────────────────────────
echo ""
echo "🗄️  Running safe database migration..."
python -m db.migrate
MIGRATION_EXIT=$?

if [ $MIGRATION_EXIT -ne 0 ]; then
    echo ""
    echo "❌ Database migration FAILED (exit code $MIGRATION_EXIT)."
    echo "⛔ App will NOT start to prevent data corruption."
    echo "   Please fix the migration error and try again."
    exit 1
fi

echo ""

# ── Step 5: Start FastAPI server ─────────────────────────────────────────────
echo "🔥 Running FastAPI server..."
python run.py
