const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Add .web.js extension resolution for web platform
config.resolver.sourceExts = [
  'web.tsx',
  'web.ts',
  'web.jsx',
  'web.js',
  'tsx',
  'ts',
  'jsx',
  'js',
  'cjs',
  'json',
];

// 4. Add 'web' to supported platforms so Metro resolves .web.js files
config.resolver.platforms = ['ios', 'android', 'web', 'native'];

// 5. CRITICAL: On web platform, use 'main' field instead of 'react-native' field
//    This avoids resolving to .native.tsx source files that import BackHandler
//    (which doesn't exist in react-native-web 0.19)
config.resolver.resolverMainFields = ['browser', 'main', 'module'];

// 6. Map 'react-native' to 'react-native-web' for web platform
//    This ensures that when packages import from 'react-native', they get
//    react-native-web's exports instead
config.resolver.extraNodeModules = {
  'react-native': path.resolve(
    workspaceRoot,
    'node_modules/react-native-web'
  ),
};

// 7. Block specific react-native internal Libraries from being resolved on web
//    react-native-web's AppRegistry references react-native/Libraries/Inspector
//    which then tries to resolve relative paths like ../Utilities/Platform
//    within the react-native package. Since react-native-web doesn't have
//    these internal files, we block them and provide empty modules instead.
//    However, we must allow AssetRegistry.js which is needed by expo-asset.
config.resolver.blockList = [
  // Block react-native internal Libraries directory from being resolved,
  // but allow AssetRegistry.js which is needed by expo-asset
  /node_modules\/react-native\/Libraries\/(?!Image\/AssetRegistry\.js).*/,
];

// 8. Add a custom resolveRequest to handle react-native internal module resolution
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // For web platform, redirect 'react-native' imports to 'react-native-web'
  if (platform === 'web' && moduleName === 'react-native') {
    return context.resolveRequest(context, 'react-native-web', platform);
  }

  // For web platform, if something tries to import from react-native/Libraries,
  // return an empty module instead (these are internal react-native files that
  // don't exist in react-native-web)
  if (
    platform === 'web' &&
    typeof moduleName === 'string' &&
    moduleName.includes('react-native/Libraries')
  ) {
    // Return a mock empty module
    return {
      type: 'sourceFile',
      filePath: path.resolve(projectRoot, 'src/__mocks__/empty.js'),
    };
  }

  // Fall back to the default resolver
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
