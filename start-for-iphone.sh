#!/bin/bash

echo "🚀 Starting Kitcho AI for iPhone Testing"
echo "========================================="
echo ""

# Get current directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Kill any existing processes on ports 3001 and 8081
echo "📱 Cleaning up existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:8081 | xargs kill -9 2>/dev/null || true

# Start backend
echo ""
echo "🔧 Starting backend on port 3001..."
cd "$DIR/backend"
npm run dev > /tmp/kitcho-backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Check if backend started
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend running at http://localhost:3001"
else
    echo "❌ Backend failed to start. Check /tmp/kitcho-backend.log"
    exit 1
fi

# Start frontend
echo ""
echo "📱 Starting frontend on port 8081..."
cd "$DIR/frontend"
npx expo start --clear &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "✅ Both services starting!"
echo ""
echo "📱 On your iPhone:"
echo "   1. Open Expo Go app"
echo "   2. Tap 'Scan QR code'"
echo "   3. Scan the QR code that appears below"
echo ""
echo "🔧 Backend logs: tail -f /tmp/kitcho-backend.log"
echo ""
echo "🛑 To stop: Press Ctrl+C or run:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "========================================="
echo ""

# Wait for user to stop
wait
