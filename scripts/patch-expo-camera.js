// Makes expo-camera draw its Android preview with a TextureView instead of a SurfaceView.
//
// A SurfaceView is a separate layer *under* the app window; our screens (background image + tint)
// cover it, so the scanner showed a black box while the camera was actually running. A TextureView
// is drawn like any other view, so it shows up regardless of backgrounds, rounded corners or
// screen transitions. Runs on EAS after `npm install` (the `eas-build-post-install` script) — the
// project's .npmrc turns install scripts off, so a plain `postinstall` wouldn't run there.
// expo-camera also ships a precompiled .aar that would ignore this edit, so package.json lists it
// under expo.autolinking.android.buildFromSource to compile it from the patched source.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules/expo-camera/android/src/main/java/expo/modules/camera/ExpoCameraView.kt');
const MARK = 'implementationMode = PreviewView.ImplementationMode.COMPATIBLE';
const FROM = 'private var previewView = PreviewView(context).apply {\n    elevation = 0f\n';

const source = fs.readFileSync(file, 'utf8');
if (source.includes(MARK)) {
  console.log('[patch-expo-camera] already patched');
} else if (!source.includes(FROM)) {
  // expo-camera changed: fail the build loudly instead of shipping the black preview again.
  throw new Error('[patch-expo-camera] ExpoCameraView.kt changed — update scripts/patch-expo-camera.js');
} else {
  fs.writeFileSync(file, source.replace(FROM, `${FROM}    ${MARK}\n`));
  console.log('[patch-expo-camera] preview switched to TextureView');
}
