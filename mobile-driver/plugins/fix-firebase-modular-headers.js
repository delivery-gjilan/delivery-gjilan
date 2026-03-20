const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin that adds modular headers support for Firebase dependencies
 * and allows non-modular includes for RNFB pods.
 * Required when building with useFrameworks: "static".
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

      // --- Part 1: Add modular headers for Firebase dependency pods ---
      if (!podfile.includes('Firebase modular headers')) {
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

        const targetMatch = podfile.match(/target ['"]mobiledriver['"] do/);
        if (targetMatch) {
          const insertIndex = podfile.indexOf(targetMatch[0]) + targetMatch[0].length;
          podfile = podfile.slice(0, insertIndex) + modularHeadersPatch + podfile.slice(insertIndex);
          console.log('[FixFirebaseHeaders] Added modular headers for Firebase dependencies');
        } else {
          console.warn('[FixFirebaseHeaders] Could not find target block');
        }
      }

      // --- Part 2: Allow non-modular includes for RNFB pods ---
      if (!podfile.includes('RNFB non-modular headers fix')) {
        const rnfbFix = `
    # RNFB non-modular headers fix (required for useFrameworks: "static")
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB')
        target.build_configurations.each do |build_config|
          build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        end
      end
    end
`;

        // Insert right after "post_install do |installer|"
        const postInstallMatch = podfile.match(/post_install do \|installer\|/);
        if (postInstallMatch) {
          const insertIndex = podfile.indexOf(postInstallMatch[0]) + postInstallMatch[0].length;
          podfile = podfile.slice(0, insertIndex) + rnfbFix + podfile.slice(insertIndex);
          console.log('[FixFirebaseHeaders] Added CLANG_ALLOW_NON_MODULAR_INCLUDES for RNFB pods');
        } else {
          console.warn('[FixFirebaseHeaders] Could not find post_install block');
        }
      }

      fs.writeFileSync(podfilePath, podfile, 'utf-8');
      return cfg;
    },
  ]);
}

module.exports = withFixFirebaseModularHeaders;
