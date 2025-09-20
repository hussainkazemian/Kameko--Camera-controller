const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    target: 'electron-renderer',
    mode: 'production',
    entry: path.resolve(__dirname, '../src/renderer/app/index.js'),
    output: {
        path: path.resolve(__dirname, '../dist'),
        filename: 'bundle.js'
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader']
            },
            {
                test: /\.wasm$/,
                type: 'asset/resource',
                generator: { filename: 'wasm/[name][ext]' }
            }
        ]
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: 'node_modules/@mediapipe/tasks-vision/wasm', to: 'wasm' },
                // copy renderer html and models
                { from: 'src/renderer/index.html', to: 'index.html' },
                { from: 'app/models/hand_landmarker.task', to: 'app/models/hand_landmarker.task' },
                // optional tray icon if provided by the project
                { from: 'assets/icon.png', to: 'icon.png', noErrorOnMissing: true },
                { from: 'assets/icon.ico', to: 'icon.ico', noErrorOnMissing: true },
                { from: 'assets/icon.icns', to: 'icon.icns', noErrorOnMissing: true },
                // copy images folder if present (for tray/window icons like webcam2.png)
                { from: 'images', to: 'images', noErrorOnMissing: true },
            ]
        }),
        new MiniCssExtractPlugin({ filename: 'styles.css' })
    ],
    resolve: {
        extensions: ['.js'],
        fallback: { fs: false, path: require.resolve('path-browserify') }
    }
};
