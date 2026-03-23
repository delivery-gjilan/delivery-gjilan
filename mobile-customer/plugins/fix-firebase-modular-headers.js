const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin that adds modular headers support for Firebase dependencies.
 * Required when building Firebase as static libraries (no useFrameworks).
 */
function withFixFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        'Podfile'
      );

      if (!fs.existsSync(podfilePath)) {
        console.warn('[FixFirebaseHeaders] Podfile not found, skipping');
        return cfg;
      }

      let podfile = fs.readFileSync(podfilePath, 'utf-8');

      // Check if already patched
      if (podfile.includes('Firebase modular headers')) {
        console.log('[FixFirebaseHeaders] Already patched, skipping');
        return cfg;
      }

      // Add modular headers for Firebase/Google dependencies
      const modularHeadersPatch = `
  # Enable modular headers for Firebase dependencies (required for static libraries)
  pod 'GoogleUtilities', :modular_headers => true
  pod 'FirebaseCore', :modular_headers => true
  pod 'FirebaseCoreInternal', :modular_headers => true
  pod 'FirebaseCoreExtension', :modular_headers => true
  pod 'FirebaseInstallations', :modular_headers => true
  pod 'FirebaseMessaging', :modular_headers => true
  pod 'GoogleDataTransport', :modular_headers => true
  pod 'nanopb', :modular_headers => true
  pod 'PromisesObjC', :modular_headers => true
`;

      // Find the first target block and insert after it starts.
      // The app target name can change (e.g. branding rename), so avoid hardcoding.
      const targetMatch = podfile.match(/target\s+['"][^'"]+['"]\s+do/);
      if (targetMatch) {
        const insertIndex = podfile.indexOf(targetMatch[0]) + targetMatch[0].length;
        podfile = podfile.slice(0, insertIndex) + modularHeadersPatch + podfile.slice(insertIndex);
        console.log('[FixFirebaseHeaders] Added modular headers for Firebase dependencies');
      } else {
        console.warn('[FixFirebaseHeaders] Could not find target block');
      }

      fs.writeFileSync(podfilePath, podfile, 'utf-8');
      return cfg;
    },
  ]);
}

module.exports = withFixFirebaseModularHeaders;
