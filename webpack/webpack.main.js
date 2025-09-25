const path = require("path");

module.exports = [
  {
    target: "electron-main",
    mode: "production",
    entry: path.resolve(__dirname, "../src/main/main.js"),
    output: {
      path: path.resolve(__dirname, "../dist"),
      filename: "main.js",
    },
    node: { __dirname: false, __filename: false },
  },
  {
    target: "electron-preload",
    mode: "production",
    entry: path.resolve(__dirname, "../src/main/preload.js"),
    output: {
      path: path.resolve(__dirname, "../dist"),
      filename: "preload.js",
    },
    node: { __dirname: false, __filename: false },
  },
];
