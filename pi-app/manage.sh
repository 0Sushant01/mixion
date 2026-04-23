#!/bin/bash

cd "$(dirname "$0")/.."

PORT=8000
PID_FILE=".cloudflared.pid"
LOG_FILE="cloudflared.log"

start() {
    echo "🚀 Starting Docker..."
    docker-compose up -d --build

    echo "⏳ Waiting for server to be ready..."

    # Wait until API responds
    until curl -s http://localhost:$PORT/health > /dev/null; do
        sleep 1
    done

    echo "🌐 Starting Cloudflare Tunnel..."

    cloudflared tunnel --url http://localhost:$PORT > $LOG_FILE 2>&1 &
    echo $! > $PID_FILE

    echo "⏳ Fetching public URL..."

    # Wait until URL appears
    for i in {1..10}; do
        URL=$(grep -o 'https://[-a-zA-Z0-9]*\.trycloudflare.com' $LOG_FILE)
        if [ ! -z "$URL" ]; then
            break
        fi
        sleep 1
    done

    echo "======================================================"
    echo "🌍 YOUR SECURE PUBLIC URL IS:"
    echo "${URL:-Check cloudflared.log}"
    echo "======================================================"
}

stop() {
    echo "🛑 Stopping services..."

    if [ -f $PID_FILE ]; then
        echo "Stopping Cloudflare..."
        kill $(cat $PID_FILE) 2>/dev/null || true
        rm -f $PID_FILE
    else
        echo "No tunnel PID found."
    fi

    echo "Stopping Docker..."
    docker-compose down
}

restart() {
    echo "🔄 Restarting..."
    stop
    sleep 2
    start
}

logs() {
    docker-compose logs -f
}

status() {
    echo "Docker containers:"
    docker ps

    if [ -f $PID_FILE ]; then
        echo "Cloudflare tunnel running (PID $(cat $PID_FILE))"
    else
        echo "Cloudflare tunnel not running"
    fi
}

case "$1" in
    start) start ;;
    stop) stop ;;
    restart) restart ;;
    logs) logs ;;
    status) status ;;
    *)
        echo "Usage: ./manage.sh {start|stop|restart|logs|status}"
        ;;
esac