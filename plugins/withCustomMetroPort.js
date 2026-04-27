const { withAppDelegate } = require('expo/config-plugins');

const BUNDLE_ROOT = '.expo/.virtual-metro-entry';

const withCustomMetroPort = (config, { port = 8083, host } = {}) => {
  return withAppDelegate(config, (config) => {
    const location = host ? `${host}:${port}` : `localhost:${port}`;
    const contents = config.modResults.contents;

    if (contents.includes(`jsLocation = "${location}"`)) {
      return config;
    }

    const patterns = [
      `RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "${BUNDLE_ROOT}")`,
      'RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")',
    ];

    const target = patterns.find((pattern) => contents.includes(pattern));
    if (!target) {
      throw new Error('withCustomMetroPort: could not find RCTBundleURLProvider jsBundleURL call in AppDelegate.swift');
    }

    const replacement = `{ RCTBundleURLProvider.sharedSettings().jsLocation = "${location}"; return ${target} }()`;
    config.modResults.contents = contents.replace(target, replacement);
    return config;
  });
};

module.exports = withCustomMetroPort;
