const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production' || process.env.NODE_ENV === 'production';

  return {
    entry: './src/index.ts',
    mode: isProd ? 'production' : 'development',
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
      new ModuleFederationPlugin({
        name: 'figmalab',
        filename: 'remoteEntry.js',
        exposes: {
          './FigmaLab': './src/App'
        },
        shared: {
          react: { singleton: true, requiredVersion: '^19.0.0' },
          'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
          'react-router-dom': { singleton: true, requiredVersion: '^7.1.5' },
          jotai: { singleton: true, requiredVersion: '^2.11.0' }
        }
      }),
      new HtmlWebpackPlugin({
        template: './public/index.html'
      })
    ]
  };
};
