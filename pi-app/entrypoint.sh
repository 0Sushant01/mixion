#!/bin/sh
set -e

echo "Fixing permissions for /app/data..."

# Ensure directory exists
mkdir -p /app/data

# Try to fix ownership (don't crash if it fails)
chown -R appuser:appuser /app/data || echo "chown failed, continuing..."

# Ensure write permissions (VERY IMPORTANT for SQLite)
chmod -R 775 /app/data || echo "chmod failed, continuing..."

echo "Permissions after fix:"
ls -ld /app/data

echo "Starting app as appuser..."

exec gosu appuser "$@"