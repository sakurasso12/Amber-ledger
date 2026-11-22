/**
 * PERSONAL BUILD ONLY: registers the IKO (PKO BP) notification listener service.
 *
 * Runs only when the build sets PERSONAL_FEATURES=1 (eas.json → profile "personal"). In every other
 * build the service is not in the manifest, so the app never appears under "Notification access"
 * and the feature is inert (the JS side also checks IkoListener.isAvailable()).
 */
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const SERVICE = 'expo.modules.ikolistener.IkoNotificationService';

module.exports = function withIkoListener(config) {
  if (process.env.PERSONAL_FEATURES !== '1') return config;
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.service = (app.service ?? []).filter((s) => s.$['android:name'] !== SERVICE);
    app.service.push({
      $: {
        'android:name': SERVICE,
        'android:label': 'Amber Ledger — IKO',
        'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
        'android:exported': 'true',
      },
      'intent-filter': [{ action: [{ $: { 'android:name': 'android.service.notification.NotificationListenerService' } }] }],
    });
    return cfg;
  });
};
