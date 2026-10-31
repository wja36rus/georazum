import { defineConfig } from "@rspack/cli";
import { HtmlRspackPlugin, CopyRspackPlugin, DefinePlugin } from "@rspack/core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/* Поддержка client/.env (не перезаписывает уже заданные переменные окружения). */
loadEnv({ path: path.resolve(dirname, ".env") });

const isProd = process.env.NODE_ENV === "production";

/* Деплой на GitHub Pages: базовый путь /repo/ и адрес API (из .env или CI-переменных). */
const basePath = process.env.BASE_PATH ?? "/";
const apiUrl = process.env.API_URL ?? "";

/*
 * Мок-режим без бэкенда: статический хостинг (GitHub Pages) не может запустить
 * Express, поэтому для демо данные подставляются в браузере. Логика:
 *   - USE_MOCKS=true  — всегда моки;
 *   - USE_MOCKS=false — всегда реальный API;
 *   - не задано: продакшен-сборка без API_URL — моки; dev — реальный API
 *     (прокси /api → 4000), т.е. локальная разработка не меняется.
 */
const explicitMocks = process.env.USE_MOCKS;
const useMocks =
  explicitMocks !== undefined ? explicitMocks === "true" : isProd && !apiUrl;

export default defineConfig({
  mode: isProd ? "production" : "development",
  context: dirname,
  entry: {
    main: "./src/app/index.tsx",
  },
  output: {
    path: path.resolve(dirname, "dist"),
    filename: "assets/[name].[contenthash].js",
    chunkFilename: "assets/[name].[contenthash].js",
    clean: true,
    publicPath: basePath,
  },
  optimization: {
    runtimeChunk: "single",
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
          name: "react",
          priority: 20,
          enforce: true,
        },
        router: {
          test: /[\\/]node_modules[\\/](react-router|react-router-dom)[\\/]/,
          name: "router",
          priority: 20,
          enforce: true,
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendor",
          priority: 10,
        },
      },
    },
  },
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js"],
    alias: {
      "@": path.resolve(dirname, "src"),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: [/node_modules/],
        loader: "builtin:swc-loader",
        options: {
          jsc: {
            parser: { syntax: "typescript", tsx: true, decorators: false },
            transform: { react: { runtime: "automatic" } },
          },
        },
        type: "javascript/auto",
      },
      {
        test: /\.scss$/,
        use: ["style-loader", "css-loader", "sass-loader"],
        type: "javascript/auto",
      },
      {
        test: /\.(png|jpe?g|gif|webp|woff2?)$/i,
        type: "asset",
      },
    ],
  },
  plugins: [
    new HtmlRspackPlugin({ template: path.resolve(dirname, "index.html") }),
    new CopyRspackPlugin({
      patterns: [{ from: path.resolve(dirname, "public"), to: "" }],
    }),
    new DefinePlugin({
      "process.env.API_URL": JSON.stringify(apiUrl),
      "process.env.BASE_PATH": JSON.stringify(basePath),
      "process.env.USE_MOCKS": JSON.stringify(useMocks),
    }),
  ],
  devServer: {
    port: 5173,
    hot: true,
    open: false,
    historyApiFallback: true,
    proxy: [
      {
        context: ["/api"],
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
      },
    ],
  },
  devtool: isProd ? false : "eval-source-map",
  performance: {
    // Начальная загрузка включает react+router (неизбежный вендор) —
    // лимит как у webpack по умолчанию (400 КБ). Остальные чанки — до 250 КБ.
    maxEntrypointSize: 400_000,
    maxAssetSize: 250_000,
  },
  stats: "errors-warnings",
});
