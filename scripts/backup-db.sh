#!/bin/bash
set -e

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="arcana_backup_${TIMESTAMP}.db"
S3_BUCKET="${BACKUP_S3_BUCKET:-s3://arcana-returns-backups}"

echo "Starting backup at $(date)"

# 1. Create backup from running database
sqlite3 /app/data/arcana.db ".backup /tmp/${BACKUP_FILE}"

# 2. Compress
gzip /tmp/${BACKUP_FILE}

# 3. Upload to S3
aws s3 cp /tmp/${BACKUP_FILE}.gz ${S3_BUCKET}/ \
  --storage-class STANDARD_IA

# 4. Cleanup
rm /tmp/${BACKUP_FILE}.gz

echo "✅ Backup complete: ${BACKUP_FILE}.gz"
echo "Uploaded to: ${S3_BUCKET}/${BACKUP_FILE}.gz"

# 5. List recent backups
echo ""
echo "Recent backups:"
aws s3 ls ${S3_BUCKET}/ | tail -5
