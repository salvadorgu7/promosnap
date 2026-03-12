#!/usr/bin/env bash
# ============================================
# PromoSnap — Database Push Script
# Generates Prisma client and pushes schema to the database.
# Usage: bash scripts/db-push.sh
# ============================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ---------- Pre-checks ----------

if [ ! -f "prisma/schema.prisma" ]; then
  log_error "prisma/schema.prisma not found. Run this script from the project root."
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f ".env" ]; then
    log_warn "DATABASE_URL not set — loading from .env"
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
  fi

  if [ -z "${DATABASE_URL:-}" ]; then
    log_error "DATABASE_URL is not set. Configure it in .env or export it before running."
    exit 1
  fi
fi

log_info "DATABASE_URL detected (${DATABASE_URL:0:20}...)"

# ---------- Step 1: Generate Prisma Client ----------

log_info "Generating Prisma client..."
if npx prisma generate; then
  log_info "Prisma client generated successfully."
else
  log_error "prisma generate failed. Check schema for errors."
  exit 1
fi

# ---------- Step 2: Push schema to database ----------

log_info "Pushing schema to database..."
if npx prisma db push; then
  log_info "Schema pushed successfully."
else
  log_error "prisma db push failed. Check connection and schema."
  exit 1
fi

# ---------- Done ----------

log_info "Database is up to date!"
echo ""
echo "  Next steps:"
echo "    npx prisma studio   — open visual editor"
echo "    npm run dev          — start dev server"
echo ""
