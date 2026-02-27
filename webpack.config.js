const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production' || process.env.NODE_ENV === 'production';

  return {
    entry: './src/index.ts',
    mode: isProd ? 'production' : 'development',
    devtool: isProd ? 'source-map' : 'eval-cheap-module-source-map',
    devServer: {
      port: 3005,
      headers: {
        "Access-Control-Allow-Origin": "*",
      }
    },
    output: {
      publicPath: 'auto',
      path: path.resolve(__dirname, 'dist'),
      clean: true,
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: 'ts-loader',
          exclude: /node_modules/,
          options: { transpileOnly: true }
        },
        {
          test: /\.md$/,
          type: 'asset/source',
        },
        {
          test: /\.(css|s[ac]ss)$/i,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                modules: {
                  namedExport: false,
                  auto: true,
                  localIdentName: '[name]__[local]--[hash:base64:5]'
                }
              }
            },
            'sass-loader'
          ]
        }
      ]
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.PROXY_URL': JSON.stringify(process.env.PROXY_URL || 'http://localhost:3006'),
        'process.env.FIGMA_MCP_URL': JSON.stringify(process.env.FIGMA_MCP_URL || 'http://localhost:3845'),
        'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
        'process.env.SYSTEM_PROMPT': JSON.stringify(process.env.SYSTEM_PROMPT ?? undefined),
        'process.env.MAX_OUTPUT_TOKENS': JSON.stringify(process.env.MAX_OUTPUT_TOKENS ?? undefined),
      }),
      new ModuleFederationPlugin({
        name: 'figmalab',
        filename: 'remoteEntry.js',
        exposes: {
          './FigmaLabApp': './src/App'
        },
        shared: {
          react: { singleton: true, requiredVersion: '^19.0.0' },
          'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
          jotai: { singleton: true, requiredVersion: '^2.11.0' }
        }
      }),
      new HtmlWebpackPlugin({
        template: './public/index.html'
      }),
      new ForkTsCheckerWebpackPlugin()
    ]
  };
};
