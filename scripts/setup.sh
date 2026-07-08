#!/usr/bin/env bash
# PennyForge local setup — installs deps, prepares SQLite DB, seeds demo data.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> [1/5] Installing dependencies (npm install)"
npm install

if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> [2/5] Created .env from .env.example"
else
  echo "==> [2/5] .env already exists — leaving it alone"
fi

echo "==> [3/5] Generating Prisma client"
npx prisma generate

echo "==> [4/5] Running migrations (SQLite)"
npx prisma migrate dev --name init

echo "==> [5/5] Seeding demo data"
npx prisma db seed

echo ""
echo "✅ PennyForge setup complete."
echo "   Run the app locally with:  npm run dev"
echo "   Then open:                 http://localhost:3000"
echo "   Run the test suite with:   npm test"
