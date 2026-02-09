const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
/** @type {import('expo/metro-config').MetroConfig} */
const { withNativeWind } = require('nativewind/metro');

process.env.EXPO_ROUTER_APP_ROOT = path.resolve(__dirname, 'app');

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
