#!/bin/bash
# Simple script to view backend logs

LOG_FILE="/root/ai-chat-app/ai-chat-app/backend/logs/combined.log"

if [ -f "$LOG_FILE" ]; then
    echo "Showing last 50 lines of backend logs..."
    echo "----------------------------------------"
    tail -n 50 "$LOG_FILE"
    echo "----------------------------------------"
    echo "To follow logs in real-time, run: tail -f $LOG_FILE"
else
    echo "Log file not found at $LOG_FILE"
    echo "Trying PM2 logs..."
    pm2 logs --lines 50 ai-chat-backend
fi
