#!/bin/bash
# سكريبت لتشغيل خادم Next.js مع إعادة تشغيل تلقائية
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting Next.js server..."
  NODE_OPTIONS="--max-old-space-size=4096" npx next dev -p 3000 > dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..."
  sleep 3
done
