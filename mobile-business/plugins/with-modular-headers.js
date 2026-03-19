const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (!podfile.includes('use_modular_headers!')) {
        // Add use_modular_headers! after prepare_react_native_project!
        podfile = podfile.replace(
          'prepare_react_native_project!',
          'prepare_react_native_project!\n  use_modular_headers!'
        );
        fs.writeFileSync(podfilePath, podfile, 'utf8');
      }
      return cfg;
    },
  ]);
};
