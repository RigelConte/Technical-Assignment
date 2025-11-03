#!/bin/sh
set -e

echo "[migrate] Waiting for database to be ready..."
until pg_isready -h db -p 5432 -U postgres; do
  echo "[migrate] Waiting for postgres..."
  sleep 2
done

echo "[migrate] Running Prisma migrations..."
bunx prisma migrate deploy

echo "[migrate] Migrations complete!"
