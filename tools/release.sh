#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

echo "==> Building web app"
pnpm --filter @pavilion/ui build

echo "==> Syncing Capacitor"
pnpm --filter @pavilion/ui cap:sync

echo "==> Building Android debug APK"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
( cd packages/ui/android && ./gradlew assembleDebug )

echo "==> Collecting artifacts"
mkdir -p release
cp packages/ui/android/app/build/outputs/apk/debug/app-debug.apk release/The-Pavilion.apk
tar -czf release/pavilion-web.tar.gz -C packages/ui/dist .
ls -la release
