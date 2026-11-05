import type { ConfigContext, ExpoConfig } from 'expo/config';

const googleIosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME ?? 'com.googleusercontent.apps.replace-me';
type ExpoPlugin = NonNullable<ExpoConfig['plugins']>[number];

export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins = (config.plugins ?? []).map((plugin): ExpoPlugin => {
    if (Array.isArray(plugin) && plugin[0] === '@react-native-google-signin/google-signin') {
      const options = plugin[1] && typeof plugin[1] === 'object' ? plugin[1] : {};
      return [plugin[0], { ...options, iosUrlScheme: googleIosUrlScheme }];
    }
    return plugin;
  });

  return {
    ...config,
    name: config.name ?? '问事',
    slug: config.slug ?? 'wenshi',
    ios: {
      ...config.ios,
      bundleIdentifier: process.env.APP_BUNDLE_ID ?? config.ios?.bundleIdentifier,
    },
    android: {
      ...config.android,
      package: process.env.APP_PACKAGE ?? config.android?.package,
    },
    plugins,
  };
};
