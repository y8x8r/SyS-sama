#!/bin/bash
# Watchdog — يحافظ على تشغيل خادم Next.js دائماً
cd /home/z/my-project
LOG=dev.log

while true; do
  echo "[$(date '+%H:%M:%S')] Starting server..." >> "$LOG"
  NODE_OPTIONS="--max-old-space-size=2048" npx next start -p 3000 >> "$LOG" 2>&1
  echo "[$(date '+%H:%M:%S')] Server crashed (exit $?), restarting in 1s..." >> "$LOG"
  sleep 1
done
