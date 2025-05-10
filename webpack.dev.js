const path = require('path');
const common = require('./webpack.common.js');
const { merge } = require('webpack-merge');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'eval-source-map', // Tambahkan source map untuk development
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
        ],
      },
    ],
  },
  devServer: {
    static: path.resolve(__dirname, 'dist'),
    port: 9000,
    hot: true, // Aktifkan HMR
    compress: true,
    historyApiFallback: true, // Penting untuk Single Page Application
    client: {
      overlay: {
        errors: true,
        warnings: true,
      },
    },
  },
  resolve: {
    extensions: ['.js'],
    alias: {
      '@data': path.resolve(__dirname, 'src/scripts/data')
    },
  },
});