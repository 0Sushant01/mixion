#!/bin/bash
set -e

# 1. Ensure the mounted volume is owned by the appuser
# This fixes the SQLite "Permission Denied" errors when docker-compose mounts a root-owned directory.
chown -R appuser:appuser /app/data

# 2. Drop privileges to appuser and execute the provided CMD
exec gosu appuser "$@"
