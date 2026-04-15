const IS_DEV = process.env.APP_VARIANT === 'development';

export default {
  expo: {
    name: IS_DEV ? 'Zipp Go Dev' : 'Zipp Go',
    slug: 'mobile-customer',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: ['deliveryapp', 'zipp'],
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription: 'We use your location to set the delivery address.',
        ITSAppUsesNonExemptEncryption: false,
        NSSupportsLiveActivities: true,
        NSSupportsLiveActivitiesFrequentUpdates: true,
        UIBackgroundModes: ['remote-notification'],
      },
      appleTeamId: '87K8YXG5V8',
      bundleIdentifier: IS_DEV
        ? 'com.zippgo.dev'
        : 'com.artshabani.mobilecustomer',
      googleServicesFile: IS_DEV
        ? './GoogleService-Info.dev.plist'
        : './GoogleService-Info.plist',
    },
    android: {
      permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: IS_DEV
        ? 'com.zippgo.dev'
        : 'com.artshabani.mobilecustomer',
      googleServicesFile: IS_DEV ? './google-services.dev.json' : './google-services.json',
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
      bundler: 'metro',
    },
    plugins: [
      'expo-router',
      '@rnmapbox/maps',
      '@react-native-firebase/app',
      [
        'expo-notifications',
        {
          color: '#0ea5e9',
          defaultChannel: 'default',
          enableBackgroundRemoteNotifications: true,
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
      'expo-build-properties',
      './plugins/patch-live-activities',
      './plugins/with-live-activity-extension',
      './plugins/fix-firebase-modular-headers',
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: 'e5c04b16-6851-4fce-aa03-e4a183f0becf',
      },
    },
    updates: {
      url: 'https://u.expo.dev/e5c04b16-6851-4fce-aa03-e4a183f0becf',
      requestHeaders: {
        'expo-channel-name': IS_DEV ? 'development' : 'production',
      },
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    owner: 'artshabani2002',
  },
};
