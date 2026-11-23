// Metro config — only needed for the web build (Amber Ledger 2.0: browser + Tauri desktop).
// expo-sqlite on web runs SQLite as WebAssembly in a worker with SharedArrayBuffer, which needs
// the .wasm asset type and a cross-origin-isolated page (COOP/COEP headers).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  middleware(req, res, next);
};

module.exports = config;
