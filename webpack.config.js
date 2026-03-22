const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const { homepage } = require("./package.json");

const getPublicPath = () => {
  if (!homepage) {
    return "";
  }

  const pathname = new URL(homepage).pathname.replace(/\/$/, "");
  return pathname ? `${pathname}/` : "/";
};

module.exports = (env, argv) => {
  const mode = argv.mode || "development";
  const isProduction = mode === "production";
  const publicPath = getPublicPath();

  return {
    mode,
    entry: path.resolve(__dirname, "src/web/main.tsx"),
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: isProduction ? "Assets/[name].[contenthash:8].js" : "Assets/[name].js",
      publicPath,
      clean: true
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
      alias: {
        "@": path.resolve(__dirname, "src/web")
      }
    },
    devtool: isProduction ? "source-map" : "eval-cheap-module-source-map",
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"]
        },
        {
          test: /\.(png|jpe?g|gif|svg|ttf)$/i,
          type: "asset/resource"
        }
      ]
    },
    plugins: [
      new webpack.DefinePlugin({
        "process.env.NODE_ENV": JSON.stringify(mode),
        "process.env.PUBLIC_URL_BASE": JSON.stringify(publicPath)
      }),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, "public/index.html"),
        publicPath
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: path.resolve(__dirname, "public"), to: ".", globOptions: { ignore: ["**/index.html"] } },
          { from: path.resolve(__dirname, "src/Assets"), to: "Assets" },
          { from: path.resolve(__dirname, "src/fonts"), to: "fonts" }
        ]
      })
    ],
    devServer: {
      static: {
        directory: path.resolve(__dirname, "dist"),
        publicPath
      },
      devMiddleware: {
        publicPath
      },
      host: "0.0.0.0",
      port: 3000,
      hot: true,
      historyApiFallback: {
        index: `${publicPath}index.html`
      },
      open: false
    }
  };
};
