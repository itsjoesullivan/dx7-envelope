var path = require('path')
var webpack = require('webpack')
var nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: [
    './main.js'
  ],
  output: {
    filename: 'bundle.js'
  },
  externals: [nodeExternals()],
  module: {
    loaders: [
      {
        test: /\.js?$/,
        exclude: /node_modules/,
        loader: 'babel',
        query: {
          presets: ['es2015']
        }
      }
    ]
  }
}
