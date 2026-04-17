#!/bin/bash

echo "🚀 Starting Mixion Pi App..."

# Step 1: Create venv if not exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Step 2: Activate venv
echo "⚡ Activating virtual environment..."
source venv/bin/activate

# Step 3: Install dependencies
echo "📥 Installing requirements..."
pip install --upgrade pip
pip install -r requirements.txt

# Step 4: Run app
echo "🔥 Running FastAPI server..."
python run.py
