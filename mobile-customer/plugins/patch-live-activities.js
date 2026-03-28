const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin that patches react-native-live-activities podspec
 * to remove RCT-Folly dependency (absorbed into ReactNativeDependencies in RN 0.81+).
 */
function withPatchLiveActivities(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podspecPath = path.resolve(
        cfg.modRequest.projectRoot,
        '..',
        'node_modules',
        'react-native-live-activities',
        'react-native-live-activities.podspec'
      );

      if (fs.existsSync(podspecPath)) {
        let content = fs.readFileSync(podspecPath, 'utf-8');

        // Remove dependencies that no longer exist as standalone pods in RN 0.81+
        const depsToRemove = [
          'RCT-Folly',
          'React-Codegen',
          'RCTRequired',
          'RCTTypeSafety',
          'ReactCommon/turbomodule/core',
        ];

        for (const dep of depsToRemove) {
          const regex = new RegExp(`^\\s*s\\.dependency\\s+"${dep.replace('/', '\\/')}".*$`, 'gm');
          content = content.replace(regex, `    # s.dependency "${dep}" # Removed: bundled in RN 0.81+`);
        }

        fs.writeFileSync(podspecPath, content, 'utf-8');
        console.log('[PatchLiveActivities] Patched podspec to remove RCT-Folly and friends');
      } else {
        console.warn('[PatchLiveActivities] Could not find react-native-live-activities podspec');
      }

      return cfg;
    },
  ]);
}

module.exports = withPatchLiveActivities;
