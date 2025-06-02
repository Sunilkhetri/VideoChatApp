// client/config-overrides.js //  
const webpack = require("webpack");

module.exports = function override(config) {
  config.resolve.fallback = {
    buffer: require.resolve("buffer"),
  };

  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
  ];

  return config;
};

//Webpack 5 issue during versell deploy — it no longer provides polyfills for Node.js core modules like buffer, stream. created this file