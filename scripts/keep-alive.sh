#!/bin/bash
# Watchdog دائم — يضمن بقاء خادم Next.js يعمل دائماً
# يعيد تشغيل الخادم فوراً إذا تعطل (خلال 1 ثانية)
cd /home/z/my-project

LOG=/home/z/my-project/dev.log
PIDFILE=/tmp/sama-server.pid

while true; do
  # التحقق مما إذا كان الخادم يعمل
  if curl -s --max-time 2 http://localhost:3000/ > /dev/null 2>&1; then
    sleep 5
    continue
  fi

  # الخادم لا يعمل — تشغيله
  echo "[$(date '+%H:%M:%S')] Starting server..." >> "$LOG"
  
  # استخدام node مباشرة للخادم standalone (أخف من next start)
  PORT=3000 HOSTNAME=0.0.0.0 NODE_ENV=production node .next/standalone/server.js >> "$LOG" 2>&1 &
  SERVER_PID=$!
  echo $SERVER_PID > "$PIDFILE"
  
  # انتظار أن يصبح جاهزاً
  for i in $(seq 1 10); do
    if curl -s --max-time 1 http://localhost:3000/ > /dev/null 2>&1; then
      echo "[$(date '+%H:%M:%S')] Server ready (PID $SERVER_PID)" >> "$LOG"
      break
    fi
    sleep 1
  done
  
  # انتظار قصير قبل إعادة الفحص
  sleep 2
done
