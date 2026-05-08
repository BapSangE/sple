#!/bin/bash
# Pre-push verification script

echo "🔍 Running Frontend Lint..."
cd frontend && npm run lint || exit 1
echo "✅ Frontend Lint Passed"

echo "🔍 Running Frontend Type Check..."
npx tsc --noEmit || exit 1
echo "✅ Frontend Type Check Passed"
cd ..

echo "🔍 Running Backend Tests..."
uv run pytest || exit 1
echo "✅ Backend Tests Passed"

echo "🚀 All checks passed! Ready to push."
