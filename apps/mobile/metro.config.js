const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Fix EMFILE: too many open files on Windows
config.maxWorkers = 2;
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    compress: {
      reduce_funcs: false,
    },
  },
};

// Limit file watchers
config.watcher = {
  ...config.watcher,
  watchman: {
    deferStates: ["hg.update"],
  },
  healthCheck: {
    enabled: false,
  },
};

module.exports = withNativeWind(config, { input: "./global.css" });
