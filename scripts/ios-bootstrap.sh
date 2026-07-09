#!/usr/bin/env bash
# PennyForge iOS bootstrap — ONE-TIME activation of the Capacitor iOS shell.
#
# This is intentionally NOT run in CI and installs nothing until you invoke it.
# It stages the deps and native project so the repo's package.json/lockfile stay
# in sync (green CI) until the day you actually want an iOS build. Run on a Mac
# with Xcode + CocoaPods installed:
#
#   npm run ios:bootstrap
#
# What it does:
#   1. Installs the Capacitor runtime + iOS + the two native plugins the
#      App Store review path needs (camera for receipt evidence, geolocation
#      for the route planner) — see docs/mobile-automation-stack.md.
#   2. Adds the native iOS project (ios/App) using the committed
#      capacitor.config.ts (so it does NOT re-run `cap init`).
#   3. Copies the staged Fastlane templates from tooling/ios/ into ios/App/.
#   4. Prints next steps.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "$(uname)" != "Darwin" ]; then
  echo "⚠️  Capacitor iOS builds require macOS + Xcode. You're on $(uname)."
  echo "    Installing JS deps only; native iOS steps require macOS."
  echo "    Please run this script on a Mac to complete the iOS setup."

  echo "==> [1/2] Installing Capacitor runtime and CLI (JS only)"
  npm install \
    @capacitor/core \
    @capacitor/cli \
    @capacitor/ios \
    @capacitor/camera \
    @capacitor/geolocation

  echo "==> [2/2] Done (JS deps only)."
  echo ""
  echo "⚠️  To complete the iOS setup, run this script on a Mac:"
  echo "    npm run ios:bootstrap"
  exit 0
fi

echo "==> [1/4] Installing Capacitor runtime, iOS platform, and native plugins"
npm install \
  @capacitor/core \
  @capacitor/cli \
  @capacitor/ios \
  @capacitor/camera \
  @capacitor/geolocation

echo "==> [2/4] Adding the native iOS project (ios/App) from capacitor.config.ts"
if [ -d "ios/App" ]; then
  echo "    ios/App already exists — skipping 'cap add ios'. Running sync instead."
  npx cap sync ios
else
  npx cap add ios
fi

echo "==> [3/4] Copying staged Fastlane templates into ios/App"
mkdir -p ios/App/fastlane
cp -n tooling/ios/fastlane/Fastfile ios/App/fastlane/Fastfile
cp -n tooling/ios/fastlane/Appfile  ios/App/fastlane/Appfile
cp -n tooling/ios/fastlane/Matchfile ios/App/fastlane/Matchfile
cp -n tooling/ios/Gemfile ios/App/Gemfile
cp -n tooling/ios/ExportOptions.plist ios/App/ExportOptions.plist

echo "==> [4/4] Done."
echo ""
echo "✅ Capacitor iOS shell staged. Next steps:"
echo "   1. Set CAPACITOR_SERVER_URL to your hosted URL, then: npm run cap:sync"
echo "   2. Open Xcode:                                          npm run cap:open"
echo "   3. In Xcode: set the Team, Bundle ID (com.pennyforge.app),"
echo "      add the Info.plist permission strings from docs/app-store-checklist.md,"
echo "      then Product → Archive for your first manual TestFlight upload."
echo "   4. For automated releases: cd ios/App && bundle install && bundle exec fastlane beta"
echo "      (fill in the ASC_* / MATCH_* secrets first — see docs/mobile-automation-stack.md)."
