#!/bin/bash
set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
MAX_BACKUPS=7

mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_FILE" data/sqlite data/qdrant data/uploads
ls -t "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | tail -n +$((MAX_BACKUPS+1)) | xargs -r rm
echo "备份完成：$BACKUP_FILE"
