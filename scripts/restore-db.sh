#!/bin/bash
set -e

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore-db.sh <backup-filename>"
  echo "Example: ./restore-db.sh arcana_backup_20251027_020000.db.gz"
  echo ""
  echo "Available backups:"
  aws s3 ls s3://arcana-returns-backups/ | tail -10
  exit 1
fi

echo "⚠️  WARNING: This will replace the current database!"
echo "Backup file: $BACKUP_FILE"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Cancelled"
  exit 0
fi

S3_BUCKET="${BACKUP_S3_BUCKET:-s3://arcana-returns-backups}"

# 1. Download from S3
echo "Downloading backup from S3..."
aws s3 cp ${S3_BUCKET}/${BACKUP_FILE} /tmp/

# 2. Decompress
echo "Decompressing..."
gunzip /tmp/${BACKUP_FILE}

# 3. Get the uncompressed filename
RESTORE_FILE=${BACKUP_FILE%.gz}

echo ""
echo "✅ Backup downloaded and ready: /tmp/${RESTORE_FILE}"
echo ""
echo "Next steps (run manually):"
echo "1. Stop the app: fly apps stop arcana-returns-api"
echo "2. SSH to Fly: fly ssh console"
echo "3. Replace database: cp /tmp/${RESTORE_FILE} /app/data/arcana.db"
echo "4. Restart app: fly apps start arcana-returns-api"
echo "5. Verify: curl https://arcana-returns-api.fly.dev/health/detailed"
