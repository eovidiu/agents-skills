#!/bin/bash

# TDD Setup Script
# Installs testing dependencies for a React/Vite project

set -e

echo "🧪 TDD Setup - Installing Testing Dependencies"
echo ""

# Check if package.json exists
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found"
  echo "Run this script from your project root directory"
  exit 1
fi

# Detect package manager
if [ -f "yarn.lock" ]; then
  PKG_MGR="yarn add -D"
  echo "📦 Using Yarn"
elif [ -f "pnpm-lock.yaml" ]; then
  PKG_MGR="pnpm add -D"
  echo "📦 Using pnpm"
else
  PKG_MGR="npm install --save-dev"
  echo "📦 Using npm"
fi

echo ""
echo "Installing testing libraries..."
echo ""

# Core testing libraries
$PKG_MGR \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  @vitejs/plugin-react \
  vitest \
  jsdom

echo ""
echo "Installing MSW for API mocking..."
echo ""

# MSW for API mocking
$PKG_MGR msw

echo ""
echo "✅ Dependencies installed!"
echo ""
echo "Next steps:"
echo "  1. Create vitest.config.js"
echo "  2. Set up MSW handlers in src/mocks/"
echo "  3. Configure setupTests.js"
echo "  4. Start writing tests!"
echo ""
echo "Run: npm test (or yarn test / pnpm test)"
