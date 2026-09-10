# Spec 10 — Release and Mobile Packaging

Status: **Phase 9a** — offline PWA and a sideloadable Android APK, buildable from source.

## Platforms

- **Web/PWA**: `packages/ui` builds a static site with a Workbox service worker and web
  manifest (installable, offline). Output: `packages/ui/dist`.
- **Android**: Capacitor (`com.pavilion.app`, "The Pavilion") wraps the same build into a
  native Android project (`packages/ui/android`, gitignored) and produces an APK. The app
  runs entirely on-device with no server.

## Build

```
pnpm install
pnpm release          # web build -> cap sync -> gradle assembleDebug -> release/
```

Requirements: Node 20+, pnpm 10, JDK 17, Android SDK `platforms;android-34` and
`build-tools;34.0.0`.

## Artifacts

`tools/release.sh` writes to `release/` (binaries gitignored):

- `The-Pavilion.apk` — debug-signed, sideloadable Android app (~3.8 MB), app id
  `com.pavilion.app`, version 1.0.
- `pavilion-web.tar.gz` — static PWA build for HTTPS hosting / home-screen install.

`release/README.txt` documents installation for the user.

## Notes

- Debug APKs use the debug key: fine for personal sideloading, not for the Play Store.
  A store build needs a release keystore and `assembleRelease`.
- Because the engine and all content are bundled, the app works with no network.

## Acceptance

- `pnpm verify` green.
- `pnpm release` produces a valid APK (`apkanalyzer` reports `com.pavilion.app` v1.0).
