The Pavilion — release
======================

Artifacts in this folder
------------------------
- The-Pavilion.apk       Android app (debug-signed, for sideloading). ~3.8 MB.

  Install:
    1. Copy The-Pavilion.apk to your phone (USB, email, Drive, etc.).
    2. Open the file on the phone. Android will ask to allow installing from
       this source — allow it.
    3. Install and open "The Pavilion". It runs fully offline.

- pavilion-web.tar.gz    Static PWA build (optional, for browser install).
  Extract and serve over HTTPS (or localhost), then use the browser's
  "Add to Home Screen". A service worker makes it work offline.

Everything runs on-device: no server and no network connection required.

Rebuilding from source
----------------------
Requires Node 20+, pnpm 10, JDK 17, and the Android SDK
(platforms;android-34, build-tools;34.0.0).

  pnpm install
  pnpm release

The script builds the web app, syncs Capacitor, builds the debug APK and
copies the artifacts here.

Notes
-----
- Debug APKs are signed with a debug key: installable for personal use but
  not suitable for Play Store distribution. To publish, create a release
  keystore and build `assembleRelease`.
- The app id is com.pavilion.app; version 1.0.
