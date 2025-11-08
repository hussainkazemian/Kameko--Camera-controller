const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
/* const webpack = require("webpack"); */

module.exports = [
  {
    target: "electron-main",
    mode: "production",
    entry: path.resolve(__dirname, "./src/electron/main.js"),
    output: {
      path: path.resolve(__dirname, "./dist"),
      filename: "main.js",
    },
    externals: {
      "@nut-tree-fork/nut-js": "commonjs2 @nut-tree-fork/nut-js",
    },
    node: { __dirname: false, __filename: false },
  },
  {
    target: "electron-preload",
    mode: "production",
    entry: path.resolve(__dirname, "./src/electron/preload.js"),
    output: {
      path: path.resolve(__dirname, "./dist"),
      filename: "preload.js",
    },
    node: { __dirname: false, __filename: false },
  },

  {
    target: "electron-renderer",
    mode: "production",
    entry: path.resolve(__dirname, "./src/pages/app/index.js"),
    output: {
      path: path.resolve(__dirname, "./dist"),
      filename: "bundle.js",
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, "css-loader"],
        },
        {
          test: /\.wasm$/,
          type: "asset/resource",
          generator: { filename: "wasm/[name][ext]" },
        },
      ],
    },
    plugins: [
      /*       new webpack.ProvidePlugin({
        process: "process/browser",
      }), */
      new CopyWebpackPlugin({
        patterns: [
          { from: "node_modules/@mediapipe/tasks-vision/wasm", to: "wasm" },
          // copy renderer html and models
          { from: "src/pages/overlay.html", to: "overlay.html" },
          { from: "src/pages/settings.html", to: "settings.html" },
          {
            from: "models/hand_landmarker.task",
            to: "models/hand_landmarker.task",
          },
          {
            from: "models/gesture_recognizer.task",
            to: "models/gesture_recognizer.task",
          },
          {
            from: "models/gestures.task",
            to: "models/gestures.task",
          },
          { from: "models/simplesample.task", to: "models/simplesample.task" },
          // optional tray icon if provided by the project
          { from: "assets/icon.png", to: "icon.png", noErrorOnMissing: true },
          { from: "assets/icon.ico", to: "icon.ico", noErrorOnMissing: true },
          { from: "assets/icon.icns", to: "icon.icns", noErrorOnMissing: true },
          // copy images folder if present (for tray/window icons like webcam2.png)
          { from: "src/images", to: "images", noErrorOnMissing: true },
        ],
      }),
      new MiniCssExtractPlugin({ filename: "overlay.css" }),
      new MiniCssExtractPlugin({ filename: "settings.css" }),
    ],
    resolve: {
      extensions: [".js"],
      fallback: {
        fs: false,
      },
    },
  },
];
