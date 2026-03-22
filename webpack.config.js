const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = (env, argv) => {
  const mode = argv.mode || "development";
  const isProduction = mode === "production";

  return {
    mode,
    entry: path.resolve(__dirname, "src/web/main.tsx"),
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: isProduction ? "assets/[name].[contenthash:8].js" : "assets/[name].js",
      publicPath: "",
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
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, "public/index.html")
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: path.resolve(__dirname, "src/Assets"), to: "Assets" },
          { from: path.resolve(__dirname, "src/fonts"), to: "fonts" }
        ]
      })
    ],
    devServer: {
      static: path.resolve(__dirname, "dist"),
      host: "0.0.0.0",
      port: 3000,
      hot: true,
      historyApiFallback: true,
      open: false
    }
  };
};
