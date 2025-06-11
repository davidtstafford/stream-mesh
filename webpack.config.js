const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    mode: isProduction ? 'production' : 'development',
    target: 'web',
    entry: './src/renderer.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'renderer.js',
      publicPath: './',
      libraryTarget: 'var',
      library: 'RendererApp',
      clean: false
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.mjs'],
      fallback: {
        "events": false,
        "fs": false,
        "path": false,
        "os": false,
        "crypto": false,
        "buffer": false,
        "stream": false,
        "util": false,
        "url": false,
        "querystring": false,
        "http": false,
        "https": false,
        "zlib": false,
        "net": false,
        "tls": false,
        "child_process": false,
        "worker_threads": false,
        "module": false,
        "assert": false
      }
    },
    externals: {
      'electron': 'require("electron")'
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'babel-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/index.html',
        inject: true,
      }),
      new webpack.ProvidePlugin({
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer'],
      }),
      new webpack.DefinePlugin({
        'global': 'globalThis',
      }),
    ],
    devServer: isProduction ? undefined : {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      port: 3000,
      hot: false,
      liveReload: false,
      client: false,
      webSocketServer: false,
      headers: {
        "Content-Security-Policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval';"
      }
    },
    node: {
      __dirname: false,
      __filename: false
    },
    devtool: isProduction ? false : 'source-map',
  };
};
