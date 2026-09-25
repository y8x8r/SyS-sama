#!/bin/bash
# فحص الخادم وإعادة تشغيله إذا كان متوقفاً
if ! curl -s --max-time 2 http://localhost:3000/ > /dev/null 2>&1; then
  cd /home/z/my-project
  PORT=3000 HOSTNAME=0.0.0.0 NODE_ENV=production nohup node .next/standalone/server.js > /home/z/my-project/dev.log 2>&1 &
  disown
fi
