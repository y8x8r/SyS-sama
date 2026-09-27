#!/bin/bash
# Watchdog script — يحافظ على تشغيل خادم Next.js
cd /home/z/my-project

while true; do
  echo "[$(date '+%H:%M:%S')] Starting Next.js production server..."
  npx next start -p 3000 >> dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date '+%H:%M:%S')] Server exited (code $EXIT_CODE), restarting in 2s..."
  sleep 2
done
