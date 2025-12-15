#!/bin/bash

# Deep Research Article App - Startup Script

echo "🚀 Starting Deep Research Article App..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "   Please create a .env file with your API keys:"
    echo "   VITE_GEMINI_API_KEY=your_gemini_api_key"
    echo ""
fi

# Start the development server
echo "🌐 Starting development server..."
npm run dev
